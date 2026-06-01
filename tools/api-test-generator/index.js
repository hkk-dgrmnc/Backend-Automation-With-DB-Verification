#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { stdin, stdout } = require('node:process');
const { parseCurl } = require('./lib/curlParser');
const { generateApiTest } = require('./lib/generator');
const { domainFromClientName, inferClientMethodName, toCamelCase, toClientName } = require('./lib/naming');

function parseArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (!argument.startsWith('--')) {
      throw new Error(`Bilinmeyen arguman: ${argument}`);
    }

    const name = argument.slice(2);
    const value = args[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`${argument} icin deger bulunamadi.`);
    }

    options[name] = value;
    index += 1;
  }

  return options;
}

function createTerminalReader() {
  const terminal = readline.createInterface({ input: stdin, output: stdout });
  const lines = terminal[Symbol.asyncIterator]();

  return {
    close() {
      terminal.close();
    },
    async readLine(prompt) {
      stdout.write(prompt);
      const result = await lines.next();

      if (result.done) {
        throw new Error('Girdi tamamlanmadan terminal kapandi.');
      }

      return result.value;
    }
  };
}

async function ask(terminal, question, defaultValue) {
  const defaultText = defaultValue ? ` [${defaultValue}]` : '';
  const answer = (await terminal.readLine(`${question}${defaultText}: `)).trim();
  return answer || defaultValue;
}

async function readCurl(terminal) {
  stdout.write('cURL komutunu yapistir. Bitirmek icin bos satir gir.\n');
  const lines = [];

  while (true) {
    const line = await terminal.readLine(lines.length === 0 ? '> ' : '... ');

    if (!line.trim() && lines.length > 0) {
      return lines.join('\n');
    }

    lines.push(line);
  }
}

function inferMethodName(parsedCurl) {
  return inferClientMethodName(parsedCurl.method, parsedCurl.path);
}

function inferDomain(parsedCurl) {
  const pathParts = parsedCurl.path.split('/').filter(Boolean);
  const candidate = pathParts.length > 1 ? pathParts.at(-2) : pathParts[0];
  return toCamelCase(candidate ?? 'api');
}

function inferStatus(method) {
  return method === 'POST' ? 201 : 200;
}

function readCurlFromArgs(args) {
  if (args.curl && args['curl-file']) {
    throw new Error('--curl ve --curl-file ayni anda kullanilamaz.');
  }

  if (args['curl-file']) {
    return fs.readFileSync(path.resolve(args['curl-file']), 'utf8');
  }

  return args.curl;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const terminal = createTerminalReader();

  try {
    const curlText = readCurlFromArgs(args) ?? (await readCurl(terminal));
    const parsedCurl = parseCurl(curlText);
    const inferredDomain = inferDomain(parsedCurl);
    const inferredClientName = toClientName(inferredDomain);
    const inferredMethodName = inferMethodName(parsedCurl);
    const clientName = args.client ?? (args.domain ? toClientName(args.domain) : await ask(
      terminal,
      'Client adi (ornek: MusteriKartiClient)',
      inferredClientName
    ));
    const domain = domainFromClientName(clientName);

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
    const expectedStatus = Number(args.status ?? (await ask(terminal, 'Beklenen status code', String(inferStatus(parsedCurl.method)))));
    const changedPaths = generateApiTest({
      rootDir: path.resolve(__dirname, '../..'),
      domain,
      endpointGroup,
      specFile,
      methodName,
      testName,
      expectedStatus,
      parsedCurl,
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

    if (parsedCurl.warnings.length > 0) {
      stdout.write('\nUyarilar:\n');

      for (const warning of parsedCurl.warnings) {
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

main().catch((error) => {
  console.error(`\nGenerator hatasi: ${error.message}`);
  process.exitCode = 1;
});
