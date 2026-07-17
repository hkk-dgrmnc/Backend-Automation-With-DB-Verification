const supportedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const dataOptions = new Set(['-d', '--data', '--data-raw', '--data-binary']);
const formOptions = new Set(['-F', '--form', '--form-string']);
// Bu option'lar desteklenmez ve sessizce dusurulmek yerine acik hata verir.
const unsupportedDataOptions = new Set(['--data-urlencode', '-G', '--get']);
// Degeri olmayan, uretimi etkilemeyen bayraklar guvenle atlanir.
const ignoredFlags = new Set([
  '-L',
  '--location',
  '--compressed',
  '-s',
  '--silent',
  '-S',
  '--show-error',
  '-sS',
  '-Ss',
  '-k',
  '--insecure',
  '-v',
  '--verbose',
  '-i',
  '--include',
  '-g',
  '--globoff'
]);
// Degeri olan ama uretimi etkilemeyen option'lar: degerleri URL/token sanilmasin
// diye degerleriyle birlikte atlanir ve uyari uretilir.
const ignoredValueOptions = new Set([
  '-e',
  '--referer',
  '-A',
  '--user-agent',
  '-o',
  '--output',
  '-m',
  '--max-time',
  '--connect-timeout',
  '--retry',
  '-x',
  '--proxy',
  '--cacert',
  '--cert',
  '--key',
  '-r',
  '--range',
  '--limit-rate'
]);
const sensitiveHeaderParts = ['authorization', 'cookie', 'secret', 'token', 'api-key', 'apikey', 'password'];
// Body/query alan adlari kelime bazli kontrol edilir: maxTokens, isTokenized
// gibi masum alanlar engellenmez; userPassword, accessToken engellenir.
const sensitiveFieldWords = new Set([
  'authorization',
  'cookie',
  'secret',
  'token',
  'password',
  'apikey',
  'bearer',
  'jwt'
]);
const safeHeaderNames = new Set(['accept', 'content-type']);

interface OptionResult {
  consumed: number;
  name: string;
  value: string;
}

interface Header {
  name: string;
  value: string;
}

export interface ParseCurlOptions {
  /**
   * Hassas gorunen ama gercekte hassas olmayan alan adlarina bilincli olarak
   * izin verir (CLI: --allow-field). Ornek: tokenCount.
   */
  allowedFields?: string[];
}

export interface ParsedCurl {
  body: Record<string, unknown> | undefined;
  method: string;
  path: string;
  queryParams: Record<string, string>;
  requiresAuth: boolean;
  safeHeaders: Record<string, string>;
  warnings: string[];
}

export function tokenize(command: string): string[] {
  // Windows'tan kopyalanan komutlardaki CRLF satir sonlari normalize edilir;
  // aksi halde header degerlerine \r sizar ve satir devamlari bozulur.
  const normalizedCommand = command.replace(/\r\n?/g, '\n');
  const tokens: string[] = [];
  let currentToken = '';
  let quote: string | undefined;

  function pushToken(): void {
    if (currentToken) {
      tokens.push(currentToken);
      currentToken = '';
    }
  }

  for (let index = 0; index < normalizedCommand.length; index += 1) {
    const character = normalizedCommand[index];
    const nextCharacter = normalizedCommand[index + 1];

    if (!quote && character === '$' && nextCharacter === "'") {
      throw new Error(
        "ANSI-C quoting ($'...') desteklenmiyor. cURL komutunu duz tek tirnakli bash formatinda ver " +
          "(orn. Chrome'daki 'Copy as cURL (bash)' ciktisindaki $'...' govdesini '...' bicimine cevir)."
      );
    }

    if (!quote && character === '^' && (nextCharacter === '"' || nextCharacter === '\n' || nextCharacter === undefined)) {
      throw new Error(
        "Windows cmd formatindaki (caret ^) cURL desteklenmiyor. Tarayicidan 'Copy as cURL (bash)' secenegini kullan."
      );
    }

    if (character === '\\') {
      if (quote === "'") {
        // POSIX: tek tirnak icinde backslash duz karakterdir.
        currentToken += character;
        continue;
      }

      if (nextCharacter === '\n') {
        // Satir devami: backslash + newline birlikte atlanir.
        index += 1;
        continue;
      }

      if (quote === '"') {
        // POSIX: cift tirnak icinde backslash yalnizca " \ ` $ karakterlerini kacirir.
        if (nextCharacter !== undefined && '"\\`$'.includes(nextCharacter)) {
          currentToken += nextCharacter;
          index += 1;
        } else {
          currentToken += character;
        }

        continue;
      }

      if (nextCharacter !== undefined) {
        currentToken += nextCharacter;
        index += 1;
        continue;
      }
    }

    if (character === "'" || character === '"') {
      if (!quote) {
        quote = character;
        continue;
      }

      if (quote === character) {
        quote = undefined;
        continue;
      }
    }

    if (!quote && /\s/.test(character)) {
      pushToken();
      continue;
    }

    currentToken += character;
  }

  if (quote) {
    throw new Error('cURL komutunda kapanmamis tirnak bulundu.');
  }

  pushToken();
  return tokens;
}

function readOptionValue(tokens: string[], index: number, option: string): OptionResult {
  const separatorIndex = option.indexOf('=');

  if (separatorIndex !== -1) {
    return {
      consumed: 0,
      name: option.slice(0, separatorIndex),
      value: option.slice(separatorIndex + 1)
    };
  }

  const value = tokens[index + 1];

  if (value === undefined) {
    throw new Error(`${option} icin deger bulunamadi.`);
  }

  return {
    consumed: 1,
    name: option,
    value
  };
}

function parseHeader(headerText: string): Header {
  const separatorIndex = headerText.indexOf(':');

  if (separatorIndex === -1) {
    throw new Error(`Header formati anlasilamadi: ${headerText}`);
  }

  return {
    name: headerText.slice(0, separatorIndex).trim(),
    value: headerText.slice(separatorIndex + 1).trim()
  };
}

function isSensitiveHeader(name: string): boolean {
  const normalizedName = name.toLowerCase();
  return sensitiveHeaderParts.some((part) => normalizedName.includes(part));
}

function splitFieldWords(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

function isSensitiveFieldName(name: string, allowedFields: Set<string>): boolean {
  if (allowedFields.has(name.toLowerCase())) {
    return false;
  }

  const words = splitFieldWords(name);

  if (words.some((word) => sensitiveFieldWords.has(word))) {
    return true;
  }

  return words.some((word, index) => word === 'api' && words[index + 1] === 'key');
}

function findSensitiveDataPaths(value: unknown, currentPath: string, allowedFields: Set<string>): string[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const sensitivePaths: string[] = [];

  for (const [name, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const nestedPath = `${currentPath}.${name}`;

    if (isSensitiveFieldName(name, allowedFields)) {
      sensitivePaths.push(nestedPath);
      continue;
    }

    sensitivePaths.push(...findSensitiveDataPaths(nestedValue, nestedPath, allowedFields));
  }

  return sensitivePaths;
}

function matchesOption(token: string, optionNames: Set<string>): boolean {
  if (optionNames.has(token)) {
    return true;
  }

  return [...optionNames].some((option) => option.startsWith('--') && token.startsWith(`${option}=`));
}

export function parseCurl(command: string, options: ParseCurlOptions = {}): ParsedCurl {
  const allowedFields = new Set((options.allowedFields ?? []).map((name) => name.toLowerCase()));
  const tokens = tokenize(command.trim());
  const headers: Header[] = [];
  const dataParts: string[] = [];
  const warnings: string[] = [];
  let method: string | undefined;
  let urlText: string | undefined;
  let usesFormData = false;
  let usesJsonShortcut = false;
  let requiresAuth = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (index === 0 && token === 'curl') {
      continue;
    }

    if (ignoredFlags.has(token)) {
      continue;
    }

    if (token === '-X' || token === '--request' || token.startsWith('--request=')) {
      const option = readOptionValue(tokens, index, token);
      method = option.value.toUpperCase();
      index += option.consumed;
      continue;
    }

    // curl'un bitisik formu: -XPOST
    if (/^-X./.test(token)) {
      method = token.slice(2).toUpperCase();
      continue;
    }

    if (token === '--url' || token.startsWith('--url=')) {
      const option = readOptionValue(tokens, index, token);
      urlText = option.value;
      index += option.consumed;
      continue;
    }

    if (token === '-H' || token === '--header' || token.startsWith('--header=')) {
      const option = readOptionValue(tokens, index, token);
      headers.push(parseHeader(option.value));
      index += option.consumed;
      continue;
    }

    if (matchesOption(token, unsupportedDataOptions)) {
      throw new Error(
        `${token.split('=')[0]} desteklenmiyor. Query parametrelerini dogrudan URL'e ekle, ` +
          "JSON body'yi --data-raw ile ver."
      );
    }

    if (token === '--json' || token.startsWith('--json=')) {
      const option = readOptionValue(tokens, index, token);
      dataParts.push(option.value);
      usesJsonShortcut = true;
      index += option.consumed;
      continue;
    }

    if (matchesOption(token, dataOptions)) {
      const option = readOptionValue(tokens, index, token);
      dataParts.push(option.value);
      index += option.consumed;
      continue;
    }

    if (matchesOption(token, formOptions)) {
      const option = readOptionValue(tokens, index, token);
      usesFormData = true;
      index += option.consumed;
      continue;
    }

    if (token === '-u' || token === '--user' || token.startsWith('--user=')) {
      const option = readOptionValue(tokens, index, token);
      requiresAuth = true;
      warnings.push('Basic auth (-u) degeri kaynak koda yazilmadi; auth icin merkezi token manager kullanilacak.');
      index += option.consumed;
      continue;
    }

    if (token === '--oauth2-bearer' || token.startsWith('--oauth2-bearer=')) {
      const option = readOptionValue(tokens, index, token);
      requiresAuth = true;
      warnings.push('Bearer token degeri kaynak koda yazilmadi; merkezi token manager kullanilacak.');
      index += option.consumed;
      continue;
    }

    if (token === '-b' || token === '--cookie' || token.startsWith('--cookie=')) {
      const option = readOptionValue(tokens, index, token);
      warnings.push('Cookie degeri hassas oldugu icin kaynak koda yazilmadi.');
      index += option.consumed;
      continue;
    }

    if (matchesOption(token, ignoredValueOptions)) {
      const option = readOptionValue(tokens, index, token);
      warnings.push(`${option.name} uretimi etkilemedigi icin degeriyle birlikte yok sayildi.`);
      index += option.consumed;
      continue;
    }

    if (token.startsWith('-')) {
      warnings.push(
        `${token} taninmadigi icin yok sayildi. Bir degeri varsa o deger URL veya token olarak ` +
          'yorumlanmis olabilir; uretilen dosyalari kontrol et.'
      );
      continue;
    }

    if (/^https?:\/\//i.test(token)) {
      if (urlText !== undefined && urlText !== token) {
        throw new Error(
          'cURL komutunda birden fazla URL bulundu. Taninmayan bir option degeri URL sanilmis olabilir; ' +
            'komutu sadelestirip tekrar dene.'
        );
      }

      urlText = token;
      continue;
    }

    warnings.push(`'${token}' taninmayan token oldugu icin yok sayildi.`);
  }

  if (usesFormData) {
    throw new Error('Multipart/form-data cURL komutlari ilk surumde desteklenmiyor.');
  }

  if (!urlText) {
    throw new Error('cURL komutunda http veya https URL bulunamadi.');
  }

  if (dataParts.some((part) => part.startsWith('@'))) {
    throw new Error("Dosyadan body (-d @dosya) desteklenmiyor. JSON body'yi komutun icine inline yaz.");
  }

  const url = new URL(urlText);
  let body: Record<string, unknown> | undefined;

  if (dataParts.length > 0) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(dataParts.join(''));
    } catch {
      throw new Error('Request body JSON olarak parse edilemedi. Ilk surum yalnizca JSON body destekliyor.');
    }

    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error('Request body plain JSON object olmali.');
    }

    body = parsed as Record<string, unknown>;
    const sensitiveBodyPaths = findSensitiveDataPaths(body, 'body', allowedFields);

    if (sensitiveBodyPaths.length > 0) {
      throw new Error(
        `Request body hassas alanlar iceriyor (${sensitiveBodyPaths.join(', ')}). ` +
          'Bu degerleri kaynak koda yazmak yerine merkezi config veya helper kullan. ' +
          'Alan gercekten hassas degilse --allow-field <alanAdi> ile bilincli olarak izin verebilirsin.'
      );
    }
  }

  method = method ?? (body ? 'POST' : 'GET');

  if (!supportedMethods.has(method)) {
    throw new Error(`Desteklenmeyen HTTP metodu: ${method}`);
  }

  const safeHeaders: Record<string, string> = {};

  for (const header of headers) {
    const normalizedName = header.name.toLowerCase();

    if (normalizedName === 'authorization') {
      requiresAuth = true;
      warnings.push('Authorization degeri kaynak koda yazilmadi; merkezi token manager kullanilacak.');
      continue;
    }

    if (isSensitiveHeader(normalizedName)) {
      warnings.push(`${header.name} hassas olabilecegi icin kaynak koda yazilmadi.`);
      continue;
    }

    if (safeHeaderNames.has(normalizedName)) {
      safeHeaders[normalizedName] = header.value;
      continue;
    }

    warnings.push(`${header.name} otomatik eklenmedi; gerekiyorsa client icinde manuel olarak degerlendir.`);
  }

  // curl --json kisayolu content-type ve accept'i JSON'a ceker; acik -H degerleri oncelikli kalir.
  if (usesJsonShortcut) {
    safeHeaders['content-type'] ??= 'application/json';
    safeHeaders.accept ??= 'application/json';
  }

  const queryParams: Record<string, string> = {};

  for (const [name, value] of url.searchParams.entries()) {
    if (isSensitiveFieldName(name, allowedFields)) {
      throw new Error(
        `${name} hassas query parametresi kaynak koda yazilamaz. Merkezi config veya helper kullan. ` +
          'Alan gercekten hassas degilse --allow-field <alanAdi> ile bilincli olarak izin verebilirsin.'
      );
    }

    if (Object.hasOwn(queryParams, name)) {
      warnings.push(`${name} query parametresi birden fazla kez geciyor; son deger kullanildi.`);
    }

    queryParams[name] = value;
  }

  return {
    body,
    method,
    path: url.pathname,
    queryParams,
    requiresAuth,
    safeHeaders,
    warnings
  };
}
