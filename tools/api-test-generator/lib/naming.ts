const turkishCharacterMap: Record<string, string> = {
  'ç': 'c',
  'Ç': 'C',
  'ğ': 'g',
  'Ğ': 'G',
  'ı': 'i',
  'İ': 'I',
  'ö': 'o',
  'Ö': 'O',
  'ş': 's',
  'Ş': 'S',
  'ü': 'u',
  'Ü': 'U'
};

/**
 * Turkce karakterleri ASCII karsiliklarina cevirir (Müşteri -> Musteri).
 * Boylece Turkce path segmentlerinden gecerli TypeScript identifier uretilir.
 */
export function transliterateTurkish(value: string): string {
  return value.replace(/[çÇğĞıİöÖşŞüÜ]/g, (character) => turkishCharacterMap[character]);
}

export function assertIdentifier(value: string, label: string): void {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value)) {
    throw new Error(`${label} gecerli bir TypeScript identifier olmali: ${value}`);
  }
}

export function toPascalCase(value: string): string {
  return transliterateTurkish(value)
    .replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_, _separator, character: string) => character.toUpperCase())
    .replace(/^[a-z]/, (character) => character.toUpperCase());
}

export function toCamelCase(value: string): string {
  const pascalCaseValue = toPascalCase(value);
  return pascalCaseValue.charAt(0).toLowerCase() + pascalCaseValue.slice(1);
}

export function toClientName(domain: string): string {
  return `${toPascalCase(domain)}Client`;
}

export function domainFromClientName(clientName: string): string {
  if (!/^[A-Z][A-Za-z0-9_$]*Client$/.test(clientName)) {
    throw new Error(
      `Client adi PascalCase olmali ve Client son ekiyle bitmeli. Ornek: MusteriKartiClient. Gelen deger: ${clientName}`
    );
  }

  return toCamelCase(clientName.slice(0, -'Client'.length));
}

// Metot adlari HTTP fiilini degil domain aksiyonunu tasir (AGENTS.md standardi):
// POST /Platform -> createPlatform (postPlatform degil).
const actionPrefixByHttpMethod: Record<string, string> = {
  GET: 'get',
  POST: 'create',
  PUT: 'update',
  PATCH: 'patch',
  DELETE: 'delete'
};

export function inferClientMethodName(httpMethod: string, endpointPath: string): string {
  const lastPathPart = endpointPath.split('/').filter(Boolean).at(-1) ?? 'request';
  const pathMethodName = toCamelCase(lastPathPart);
  const knownActionPrefixes = [
    'get', 'create', 'add', 'update', 'patch', 'delete', 'remove', 'list', 'search', 'find', 'set'
  ];
  const alreadyStartsWithAction = knownActionPrefixes.some(
    (prefix) => pathMethodName === prefix || new RegExp(`^${prefix}[A-Z0-9]`).test(pathMethodName)
  );

  if (alreadyStartsWithAction) {
    return pathMethodName;
  }

  const actionPrefix = actionPrefixByHttpMethod[httpMethod.toUpperCase()] ?? httpMethod.toLowerCase();
  return `${actionPrefix}${toPascalCase(lastPathPart)}`;
}

export function escapeTsSingleQuoted(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n');
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
