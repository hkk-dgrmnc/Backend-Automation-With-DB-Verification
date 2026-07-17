import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { stdin, stdout } from 'node:process';
import { parseCurl } from './lib/curlParser';
import { generateApiTest } from './lib/generator';
import { domainFromClientName, inferClientMethodName, toCamelCase, toClientName } from './lib/naming';

interface ParsedArgs {
  dryRun?: boolean;
  curl?: string;
  'curl-file'?: string;
  client?: string;
  domain?: string;
  method?: string;
  'endpoint-group'?: string;
  spec?: string;
  'test-name'?: string;
  status?: string;
  allowedFields?: string[];
}

function parseArgs(args: string[]): ParsedArgs {
  const options: ParsedArgs & Record<string, string | boolean | string[] | undefined> = {};
  const allowedFields: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (!argument.startsWith('--')) {
      throw new Error(`Bilinmeyen arguman: ${argument}`);
    }

    // Hem "--name deger" hem "--name=deger" desteklenir; '--' ile baslayan
    // mesru degerler (orn. --test-name "--edge case") esitlik formuyla verilir.
    let name: string;
    let value: string;
    const separatorIndex = argument.indexOf('=');

    if (separatorIndex !== -1) {
      name = argument.slice(2, separatorIndex);
      value = argument.slice(separatorIndex + 1);
    } else {
      name = argument.slice(2);
      const nextValue = args[index + 1];

      if (nextValue === undefined || nextValue.startsWith('--')) {
        throw new Error(`${argument} icin deger bulunamadi. Deger '--' ile basliyorsa ${argument}=deger bicimini kullan.`);
      }

      value = nextValue;
      index += 1;
    }

    if (name === 'allow-field') {
      allowedFields.push(...value.split(',').map((field) => field.trim()).filter(Boolean));
      continue;
    }

    options[name] = value;
  }

  if (allowedFields.length > 0) {
    options.allowedFields = allowedFields;
  }

  return options;
}

interface TerminalReader {
  close(): void;
  readLine(prompt: string): Promise<string>;
}

function createTerminalReader(): TerminalReader {
  const terminal = readline.createInterface({ input: stdin, output: stdout });
  const lines = terminal[Symbol.asyncIterator]();

  return {
    close(): void {
      terminal.close();
    },
    async readLine(prompt: string): Promise<string> {
      stdout.write(prompt);
      const result = await lines.next();

      if (result.done) {
        throw new Error('Girdi tamamlanmadan terminal kapandi.');
      }

      return result.value as string;
    }
  };
}

async function ask(terminal: TerminalReader, question: string, defaultValue?: string): Promise<string | undefined> {
  const defaultText = defaultValue ? ` [${defaultValue}]` : '';
  const answer = (await terminal.readLine(`${question}${defaultText}: `)).trim();
  return answer || defaultValue;
}

async function readCurl(terminal: TerminalReader): Promise<string> {
  stdout.write('cURL komutunu yapistir. Bitirmek icin bos satir gir.\n');
  const lines: string[] = [];

  while (true) {
    const line = await terminal.readLine(lines.length === 0 ? '> ' : '... ');

    if (!line.trim() && lines.length > 0) {
      return lines.join('\n');
    }

    lines.push(line);
  }
}

function inferMethodName(parsedCurl: ReturnType<typeof parseCurl>): string {
  return inferClientMethodName(parsedCurl.method, parsedCurl.path);
}

function inferDomain(parsedCurl: ReturnType<typeof parseCurl>): string {
  const pathParts = parsedCurl.path.split('/').filter(Boolean);
  // api_musteri, api, v1 gibi route prefix segmentleri domain adayi degildir.
  const nonApiParts = pathParts.filter((part) => !/^api([_-]|$)/i.test(part) && !/^v\d+$/i.test(part));
  const candidate = nonApiParts.at(0) ?? pathParts.at(-1) ?? 'api';
  const domainSuggestion = toCamelCase(candidate);

  // Identifier'a uymayan oneri (orn. sayiyla baslayan segment) default olarak sunulmaz.
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(domainSuggestion) ? domainSuggestion : 'api';
}

function inferStatus(method: string): number {
  return method === 'POST' ? 201 : 200;
}

function readCurlFromArgs(args: ParsedArgs): string | undefined {
  if (args.curl && args['curl-file']) {
    throw new Error('--curl ve --curl-file ayni anda kullanilamaz.');
  }

  if (args['curl-file']) {
    return fs.readFileSync(path.resolve(args['curl-file']), 'utf8');
  }

  return args.curl;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const terminal = createTerminalReader();

  try {
    const curlText = readCurlFromArgs(args) ?? (await readCurl(terminal));
    const parsedCurlResult = parseCurl(curlText, { allowedFields: args.allowedFields });
    const inferredDomain = inferDomain(parsedCurlResult);
    const inferredClientName = toClientName(inferredDomain);
    const inferredMethodName = inferMethodName(parsedCurlResult);
    const clientName = args.client ?? (args.domain ? toClientName(args.domain) : await ask(
      terminal,
      'Client adi (ornek: MusteriKartiClient)',
      inferredClientName
    ));
    const domain = domainFromClientName(clientName!);

    if (args.domain && args.domain !== domain) {
      throw new Error(`--domain ve --client ayni client'i gostermeli. Beklenen domain: ${domain}`);
    }

    const methodName = args.method ?? (await ask(
      terminal,
      'Client icine eklenecek metot adi (ornek: getAllWithPaging)',
      inferredMethodName
    ));
    const endpointGroup = args['endpoint-group'] ?? (await ask(
      terminal,
      'Endpoint grubu (ornek: musteriKarti)',
      domain
    ));
    const specFile = args.spec ?? (await ask(
      terminal,
      'Spec dosyasi (tests/specs altinda, ornek: musteriKarti.spec.ts)',
      `${domain}.spec.ts`
    ));
    const testName = args['test-name'] ?? (await ask(terminal, 'Test aciklamasi', `${methodName} returns success`));
    const expectedStatus = Number(
      args.status ?? (await ask(terminal, 'Beklenen status code', String(inferStatus(parsedCurlResult.method))))
    );
    const changedPaths = generateApiTest({
      rootDir: path.resolve(__dirname, '../..'),
      domain,
      endpointGroup: endpointGroup!,
      specFile: specFile!,
      methodName: methodName!,
      testName: testName!,
      expectedStatus,
      parsedCurl: parsedCurlResult,
      dryRun: args.dryRun
    });

    stdout.write(`\n${args.dryRun ? 'Degisecek' : 'Guncellenen'} dosyalar:\n`);

    if (changedPaths.length === 0) {
      stdout.write('- Degisiklik yok. Ayni API daha once eklenmis olabilir.\n');
    } else {
      for (const changedPath of changedPaths) {
        stdout.write(`- ${changedPath}\n`);
      }
    }

    if (parsedCurlResult.warnings.length > 0) {
      stdout.write('\nUyarilar:\n');

      for (const warning of parsedCurlResult.warnings) {
        stdout.write(`- ${warning}\n`);
      }
    }

    if (!args.dryRun) {
      stdout.write('\nKontrol komutu: npm run typecheck\n');
    }
  } finally {
    terminal.close();
  }
}

main().catch((error: Error) => {
  console.error(`\nGenerator hatasi: ${error.message}`);
  process.exitCode = 1;
});
