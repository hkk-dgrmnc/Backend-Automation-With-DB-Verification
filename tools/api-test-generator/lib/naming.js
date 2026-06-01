'use strict';

function assertIdentifier(value, label) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value)) {
    throw new Error(`${label} gecerli bir TypeScript identifier olmali: ${value}`);
  }
}

function toPascalCase(value) {
  return value
    .replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_, _separator, character) => character.toUpperCase())
    .replace(/^[a-z]/, (character) => character.toUpperCase());
}

function toCamelCase(value) {
  const pascalCaseValue = toPascalCase(value);
  return pascalCaseValue.charAt(0).toLowerCase() + pascalCaseValue.slice(1);
}

function toClientName(domain) {
  return `${toPascalCase(domain)}Client`;
}

function domainFromClientName(clientName) {
  if (!/^[A-Z][A-Za-z0-9_$]*Client$/.test(clientName)) {
    throw new Error(`Client adi PascalCase olmali ve Client son ekiyle bitmeli. Ornek: MusteriKartiClient. Gelen deger: ${clientName}`);
  }

  return toCamelCase(clientName.slice(0, -'Client'.length));
}

function inferClientMethodName(httpMethod, endpointPath) {
  const lastPathPart = endpointPath.split('/').filter(Boolean).at(-1) ?? 'request';
  const pathMethodName = toCamelCase(lastPathPart);
  const knownActionPrefixes = ['get', 'create', 'add', 'update', 'patch', 'delete', 'remove', 'list', 'search', 'find', 'set'];
  const alreadyStartsWithAction = knownActionPrefixes.some(
    (prefix) => pathMethodName === prefix || new RegExp(`^${prefix}[A-Z0-9]`).test(pathMethodName)
  );

  if (alreadyStartsWithAction) {
    return pathMethodName;
  }

  return `${httpMethod.toLowerCase()}${toPascalCase(lastPathPart)}`;
}

function escapeTsSingleQuoted(value) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  assertIdentifier,
  domainFromClientName,
  escapeRegExp,
  escapeTsSingleQuoted,
  inferClientMethodName,
  toCamelCase,
  toClientName,
  toPascalCase
};
