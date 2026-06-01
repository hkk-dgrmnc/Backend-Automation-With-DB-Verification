'use strict';

const supportedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const dataOptions = new Set(['-d', '--data', '--data-raw', '--data-binary']);
const formOptions = new Set(['-F', '--form', '--form-string']);
const sensitiveHeaderParts = ['authorization', 'cookie', 'secret', 'token', 'api-key', 'apikey', 'password'];
const safeHeaderNames = new Set(['accept', 'content-type']);

function tokenize(command) {
  const tokens = [];
  let currentToken = '';
  let quote;

  function pushToken() {
    if (currentToken) {
      tokens.push(currentToken);
      currentToken = '';
    }
  }

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];

    if (character === '\\' && quote !== "'") {
      const nextCharacter = command[index + 1];

      if (nextCharacter === '\n') {
        index += 1;
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

function readOptionValue(tokens, index, option) {
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

function parseHeader(headerText) {
  const separatorIndex = headerText.indexOf(':');

  if (separatorIndex === -1) {
    throw new Error(`Header formati anlasilamadi: ${headerText}`);
  }

  return {
    name: headerText.slice(0, separatorIndex).trim(),
    value: headerText.slice(separatorIndex + 1).trim()
  };
}

function isSensitiveHeader(name) {
  const normalizedName = name.toLowerCase();
  return sensitiveHeaderParts.some((part) => normalizedName.includes(part));
}

function findSensitiveDataPaths(value, currentPath) {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const sensitivePaths = [];

  for (const [name, nestedValue] of Object.entries(value)) {
    const nestedPath = `${currentPath}.${name}`;

    if (isSensitiveHeader(name)) {
      sensitivePaths.push(nestedPath);
      continue;
    }

    sensitivePaths.push(...findSensitiveDataPaths(nestedValue, nestedPath));
  }

  return sensitivePaths;
}

function parseCurl(command) {
  const tokens = tokenize(command.trim());
  const headers = [];
  const dataParts = [];
  const warnings = [];
  let method;
  let urlText;
  let usesFormData = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token === 'curl' || token === '--location' || token === '-L') {
      continue;
    }

    if (token === '-X' || token === '--request' || token.startsWith('--request=')) {
      const option = readOptionValue(tokens, index, token);
      method = option.value.toUpperCase();
      index += option.consumed;
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

    if (dataOptions.has(token) || [...dataOptions].some((option) => token.startsWith(`${option}=`))) {
      const option = readOptionValue(tokens, index, token);
      dataParts.push(option.value);
      index += option.consumed;
      continue;
    }

    if (formOptions.has(token) || [...formOptions].some((option) => token.startsWith(`${option}=`))) {
      const option = readOptionValue(tokens, index, token);
      usesFormData = true;
      index += option.consumed;
      continue;
    }

    if (/^https?:\/\//i.test(token)) {
      urlText = token;
    }
  }

  if (usesFormData) {
    throw new Error('Multipart/form-data cURL komutlari ilk surumde desteklenmiyor.');
  }

  if (!urlText) {
    throw new Error('cURL komutunda http veya https URL bulunamadi.');
  }

  const url = new URL(urlText);
  let body;

  if (dataParts.length > 0) {
    try {
      body = JSON.parse(dataParts.join(''));
    } catch {
      throw new Error('Request body JSON olarak parse edilemedi. Ilk surum yalnizca JSON body destekliyor.');
    }

    if (!body || Array.isArray(body) || typeof body !== 'object') {
      throw new Error('Request body plain JSON object olmali.');
    }

    const sensitiveBodyPaths = findSensitiveDataPaths(body, 'body');

    if (sensitiveBodyPaths.length > 0) {
      throw new Error(
        `Request body hassas alanlar iceriyor (${sensitiveBodyPaths.join(', ')}). ` +
          'Bu degerleri kaynak koda yazmak yerine merkezi config veya helper kullan.'
      );
    }
  }

  method = method ?? (body ? 'POST' : 'GET');

  if (!supportedMethods.has(method)) {
    throw new Error(`Desteklenmeyen HTTP metodu: ${method}`);
  }

  const safeHeaders = {};
  let requiresAuth = false;

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

  const queryParams = {};

  for (const [name, value] of url.searchParams.entries()) {
    if (isSensitiveHeader(name)) {
      throw new Error(
        `${name} hassas query parametresi kaynak koda yazilamaz. Merkezi config veya helper kullan.`
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

module.exports = {
  parseCurl,
  tokenize
};
