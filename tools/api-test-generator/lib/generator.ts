import fs from 'node:fs';
import path from 'node:path';
import { assertIdentifier, escapeRegExp, escapeTsSingleQuoted, toPascalCase } from './naming';
import type { ParsedCurl } from './curlParser';

interface Workspace {
  exists(relativePath: string): boolean;
  read(relativePath: string): string;
  update(relativePath: string, content: string): void;
  commit(): void;
  getChangedPaths(): string[];
}

interface TestData {
  paramsFunctionName?: string;
  payloadFunctionName?: string;
}

export interface GenerateApiTestOptions {
  rootDir: string;
  domain: string;
  endpointGroup?: string;
  specFile?: string;
  methodName: string;
  testName: string;
  expectedStatus: number;
  parsedCurl: ParsedCurl;
  dryRun?: boolean;
}

function createWorkspace(rootDir: string): Workspace {
  const changes = new Map<string, string>();

  function resolve(relativePath: string): string {
    return path.join(rootDir, relativePath);
  }

  return {
    exists(relativePath: string): boolean {
      return changes.has(relativePath) || fs.existsSync(resolve(relativePath));
    },
    read(relativePath: string): string {
      if (changes.has(relativePath)) {
        return changes.get(relativePath) as string;
      }

      return fs.readFileSync(resolve(relativePath), 'utf8');
    },
    update(relativePath: string, content: string): void {
      if (this.exists(relativePath) && this.read(relativePath) === content) {
        return;
      }

      changes.set(relativePath, content);
    },
    commit(): void {
      for (const [relativePath, content] of changes.entries()) {
        const absolutePath = resolve(relativePath);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, content);
      }
    },
    getChangedPaths(): string[] {
      return [...changes.keys()];
    }
  };
}

function findMatchingBrace(text: string, openBraceIndex: number): number {
  let depth = 0;
  let quote: string | undefined;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openBraceIndex; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (lineComment) {
      if (character === '\n') {
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      if (character === '*' && nextCharacter === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }

    if (character === '/' && nextCharacter === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (character === '/' && nextCharacter === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }

    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  throw new Error('TypeScript dosyasinda kapanmamis suslu parantez bulundu.');
}

interface DepthResult {
  depth: number;
  inCode: boolean;
}

function getDepthAt(text: string, openBraceIndex: number, targetIndex: number): DepthResult {
  let depth = 0;
  let quote: string | undefined;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openBraceIndex; index < targetIndex; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (lineComment) {
      if (character === '\n') {
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      if (character === '*' && nextCharacter === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }

    if (character === '/' && nextCharacter === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (character === '/' && nextCharacter === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }

    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
    }
  }

  return { depth, inCode: !quote && !lineComment && !blockComment };
}

interface PropertyLocation {
  openBraceIndex?: number;
  propertyStartIndex: number;
}

function findTopLevelProperty(
  text: string,
  objectOpenBraceIndex: number,
  propertyName: string,
  objectValueOnly = false
): PropertyLocation | undefined {
  const suffix = objectValueOnly ? '\\s*\\{' : '';
  // Satir basi sarti yok: kompakt/tek satirlik objelerde de property bulunur.
  const propertyPattern = new RegExp(`(^|[^A-Za-z0-9_$])${escapeRegExp(propertyName)}\\s*:${suffix}`, 'g');
  // Arama hedef objenin kapanis parantezinde biter; dosyadaki baska bir
  // export icindeki ayni isimli property'ye yazilmaz.
  const objectCloseBraceIndex = findMatchingBrace(text, objectOpenBraceIndex);
  let match: RegExpExecArray | null;

  while ((match = propertyPattern.exec(text)) !== null) {
    const propertyStartIndex = match.index + match[1].length;

    if (propertyStartIndex <= objectOpenBraceIndex || propertyStartIndex >= objectCloseBraceIndex) {
      continue;
    }

    const depthResult = getDepthAt(text, objectOpenBraceIndex, propertyStartIndex);

    if (depthResult.depth === 1 && depthResult.inCode) {
      const openBraceIndex = objectValueOnly ? text.indexOf('{', propertyStartIndex) : undefined;
      return { openBraceIndex, propertyStartIndex };
    }
  }

  return undefined;
}

function appendObjectProperty(
  text: string,
  openBraceIndex: number,
  propertyText: string,
  fallbackClosingIndent: string
): string {
  const closeBraceIndex = findMatchingBrace(text, openBraceIndex);
  const body = text.slice(openBraceIndex + 1, closeBraceIndex);
  const closingIndentMatch = body.match(/\n([ \t]*)$/);
  const closingIndent = closingIndentMatch ? closingIndentMatch[1] : fallbackClosingIndent;
  let content = body.trimEnd();

  if (content.trim() && !content.endsWith(',')) {
    content += ',';
  }

  content += `\n${propertyText}\n${closingIndent}`;

  return `${text.slice(0, openBraceIndex + 1)}${content}${text.slice(closeBraceIndex)}`;
}

// Karsilastirmalar format farklarina (tirnak stili, bosluk, satir sonu) takilmasin
// diye normalize edilir; prettier gibi araclarin dokundugu dosyalarda yanlis
// "cakisma" hatasi uretilmez.
function normalizeForComparison(text: string): string {
  return text.replace(/["`]/g, "'").replace(/\s+/g, ' ').trim();
}

function getPropertyStringValue(text: string, propertyStartIndex: number): string | undefined {
  const slice = text.slice(propertyStartIndex, propertyStartIndex + 1000);
  const valueMatch = slice.match(/^[A-Za-z0-9_$']+\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/);

  if (!valueMatch) {
    return undefined;
  }

  return valueMatch[1].slice(1, -1).replace(/\\(['"\\])/g, '$1');
}

function updateEndpoints(
  workspace: Workspace,
  endpointGroup: string,
  methodName: string,
  endpointPath: string
): void {
  const relativePath = 'src/config/endpoints.ts';
  let content = workspace.read(relativePath);
  const endpointsDeclarationIndex = content.indexOf('export const endpoints');

  if (endpointsDeclarationIndex === -1) {
    throw new Error(`${relativePath} icinde endpoints export'u bulunamadi.`);
  }

  const rootOpenBraceIndex = content.indexOf('{', endpointsDeclarationIndex);
  const endpointGroupProperty = findTopLevelProperty(content, rootOpenBraceIndex, endpointGroup, true);
  const escapedPath = escapeTsSingleQuoted(endpointPath);

  if (!endpointGroupProperty) {
    const endpointGroupText = `  ${endpointGroup}: {\n    ${methodName}: '${escapedPath}'\n  }`;
    content = appendObjectProperty(content, rootOpenBraceIndex, endpointGroupText, '');
    workspace.update(relativePath, content);
    return;
  }

  const methodProperty = findTopLevelProperty(content, endpointGroupProperty.openBraceIndex!, methodName);

  if (methodProperty) {
    // Deger bazli karsilastirma: tirnak stili veya format farki cakisma sayilmaz.
    const existingPath = getPropertyStringValue(content, methodProperty.propertyStartIndex);

    if (existingPath !== endpointPath) {
      throw new Error(
        `Endpoint cakismasi: endpoints.${endpointGroup}.${methodName} zaten var fakat ` +
          `${endpointPath} path'i ile ayni degil.`
      );
    }

    return;
  }

  content = appendObjectProperty(
    content,
    endpointGroupProperty.openBraceIndex!,
    `    ${methodName}: '${escapedPath}'`,
    '  '
  );
  workspace.update(relativePath, content);
}

function formatPropertyName(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : `'${escapeTsSingleQuoted(name)}'`;
}

function renderClientMethod(
  endpointGroup: string,
  methodName: string,
  parsedCurl: ParsedCurl
): string {
  const parameters: string[] = [];
  const requestOptions: string[] = [];
  const headerLines: string[] = [];

  if (Object.keys(parsedCurl.queryParams).length > 0) {
    parameters.push('params: Record<string, string>');
    requestOptions.push('params');
  }

  if (parsedCurl.body) {
    parameters.push('payload: Record<string, unknown>');
    requestOptions.push('data: payload');
  }

  parameters.push('headers: Record<string, string> = {}');

  // Header sirasi deterministiktir: once accept, sonra content-type.
  const safeHeaders: Record<string, string> = {
    accept: parsedCurl.safeHeaders.accept ?? 'application/json'
  };

  if (parsedCurl.safeHeaders['content-type']) {
    safeHeaders['content-type'] = parsedCurl.safeHeaders['content-type'];
  } else if (parsedCurl.body) {
    safeHeaders['content-type'] = 'application/json';
  }

  for (const [name, value] of Object.entries(safeHeaders)) {
    headerLines.push(`      ${formatPropertyName(name)}: '${escapeTsSingleQuoted(value)}',`);
  }

  headerLines.push('      ...headers');
  requestOptions.unshift(`headers: {\n${headerLines.join('\n')}\n    }`);

  return [
    `async ${methodName}(`,
    parameters.map((parameter) => `  ${parameter}`).join(',\n'),
    '): Promise<APIResponse> {',
    `  return this.request.${parsedCurl.method.toLowerCase()}(endpoints.${endpointGroup}.${methodName}, {`,
    requestOptions.map((option) => `    ${option}`).join(',\n'),
    '  });',
    '}'
  ].join('\n');
}

function indent(text: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

function updateClient(
  workspace: Workspace,
  domain: string,
  endpointGroup: string,
  methodName: string,
  parsedCurl: ParsedCurl
): void {
  const relativePath = `src/clients/${domain}Client.ts`;
  const className = `${toPascalCase(domain)}Client`;
  const renderedMethod = indent(renderClientMethod(endpointGroup, methodName, parsedCurl), 2);

  if (!workspace.exists(relativePath)) {
    workspace.update(
      relativePath,
      [
        "import type { APIRequestContext, APIResponse } from '@playwright/test';",
        "import { endpoints } from '../config/endpoints';",
        '',
        `export class ${className} {`,
        '  constructor(private readonly request: APIRequestContext) {}',
        '',
        renderedMethod,
        '}',
        ''
      ].join('\n')
    );
    return;
  }

  let content = workspace.read(relativePath);
  const classDeclarationIndex = content.indexOf(`export class ${className}`);

  if (classDeclarationIndex === -1) {
    throw new Error(`${relativePath} icinde ${className} class'i bulunamadi.`);
  }

  const classOpenBraceIndex = content.indexOf('{', classDeclarationIndex);
  const classCloseBraceIndex = findMatchingBrace(content, classOpenBraceIndex);
  const methodPattern = new RegExp(`\\basync\\s+${escapeRegExp(methodName)}\\s*\\(`);
  const methodMatch = content.match(methodPattern);

  if (methodMatch) {
    const methodStartIndex = methodMatch.index!;
    const nextMethodIndex = content.indexOf('\n  async ', methodStartIndex + methodMatch[0].length);
    const methodEndIndex =
      nextMethodIndex === -1 || nextMethodIndex > classCloseBraceIndex ? classCloseBraceIndex : nextMethodIndex;
    const existingMethodText = content.slice(methodStartIndex, methodEndIndex);

    // Metnin tamami (imza dahil) karsilastirilir. Yalnizca endpoint cagrisina
    // bakmak, ayni metot adiyla query'li/query'siz iki farkli imzanin sessizce
    // birbirine karismasina (params'in header olarak gitmesine) izin verirdi.
    if (normalizeForComparison(existingMethodText) !== normalizeForComparison(renderedMethod)) {
      throw new Error(
        `Client metot cakismasi: ${className}.${methodName} zaten var fakat uretilecek metotla ` +
          'imzasi veya icerigi ayni degil.'
      );
    }

    return;
  }

  const beforeCloseBrace = content.slice(0, classCloseBraceIndex).trimEnd();
  content = `${beforeCloseBrace}\n\n${renderedMethod}\n${content.slice(classCloseBraceIndex)}`;
  workspace.update(relativePath, content);
}

function formatValue(value: unknown, continuationIndent: string): string {
  return JSON.stringify(value, null, 2)
    .split('\n')
    .map((line, index) => (index === 0 ? line : `${continuationIndent}${line}`))
    .join('\n');
}

function renderFactory(
  functionName: string,
  values: Record<string, unknown>,
  returnType: string
): string {
  const lines = Object.entries(values).map(
    ([name, value]) => `    ${JSON.stringify(name)}: ${formatValue(value, '    ')},`
  );

  lines.push('    ...overrides');

  return [
    `export function ${functionName}(overrides: ${returnType} = {}): ${returnType} {`,
    '  return {',
    ...lines,
    '  };',
    '}'
  ].join('\n');
}

function appendModuleBlock(content: string, block: string): string {
  return `${content.trimEnd()}\n\n${block}\n`;
}

function updateDataFile(
  workspace: Workspace,
  relativePath: string,
  functionName: string,
  functionText: string
): void {
  if (!workspace.exists(relativePath)) {
    workspace.update(relativePath, `${functionText}\n`);
    return;
  }

  const content = workspace.read(relativePath);
  const functionPattern = new RegExp(`\\bexport\\s+function\\s+${escapeRegExp(functionName)}\\s*\\(`);
  const functionMatch = content.match(functionPattern);

  if (functionMatch) {
    const nextFunctionIndex = content.indexOf('\nexport function ', functionMatch.index! + functionMatch[0].length);
    const existingFunctionText = content.slice(
      functionMatch.index!,
      nextFunctionIndex === -1 ? content.length : nextFunctionIndex
    ).trim();

    if (normalizeForComparison(existingFunctionText) !== normalizeForComparison(functionText)) {
      throw new Error(
        `Test data cakismasi: ${relativePath} icindeki ${functionName} zaten farkli data ile tanimli.`
      );
    }

    return;
  }

  workspace.update(relativePath, appendModuleBlock(content, functionText));
}

function updateTestData(workspace: Workspace, domain: string, methodName: string, parsedCurl: ParsedCurl): TestData {
  const data: TestData = {};

  // Factory adi her zaman metot adindan turetilir. Onek ozel durumlari
  // ('cards' ve 'getCards' gibi) farkli metotlarin ayni factory adina
  // cokmesine yol aciyordu.
  if (Object.keys(parsedCurl.queryParams).length > 0) {
    const functionName = `${methodName}Params`;
    updateDataFile(
      workspace,
      `tests/data/${domain}Params.ts`,
      functionName,
      renderFactory(functionName, parsedCurl.queryParams, 'Record<string, string>')
    );
    data.paramsFunctionName = functionName;
  }

  if (parsedCurl.body) {
    const functionName = `${methodName}Payload`;
    updateDataFile(
      workspace,
      `tests/data/${domain}Payloads.ts`,
      functionName,
      renderFactory(functionName, parsedCurl.body, 'Record<string, unknown>')
    );
    data.payloadFunctionName = functionName;
  }

  return data;
}

function ensureNamedImport(content: string, modulePath: string, names: string[]): string {
  const modulePattern = escapeRegExp(modulePath);
  const importPattern = new RegExp(`import\\s+\\{([^}]*)\\}\\s+from\\s+'${modulePattern}';`);
  const match = content.match(importPattern);

  if (match) {
    const currentNames = match[1]
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    const updatedNames = [...new Set([...currentNames, ...names])];
    return content.replace(match[0], `import { ${updatedNames.join(', ')} } from '${modulePath}';`);
  }

  const importLine = `import { ${names.join(', ')} } from '${modulePath}';\n`;
  const importMatches = [...content.matchAll(/^import .*;\n/gm)];

  if (importMatches.length === 0) {
    return `${importLine}${content}`;
  }

  const lastImport = importMatches[importMatches.length - 1];
  const insertionIndex = lastImport.index! + lastImport[0].length;
  return `${content.slice(0, insertionIndex)}${importLine}${content.slice(insertionIndex)}`;
}

function ensureNamespaceImport(content: string, modulePath: string, namespace: string): string {
  const modulePattern = escapeRegExp(modulePath);
  const importPattern = new RegExp(
    `import\\s+\\*\\s+as\\s+${escapeRegExp(namespace)}\\s+from\\s+'${modulePattern}';`
  );

  if (importPattern.test(content)) {
    return content;
  }

  const importLine = `import * as ${namespace} from '${modulePath}';\n`;
  const importMatches = [...content.matchAll(/^import .*;\n/gm)];

  if (importMatches.length === 0) {
    return `${importLine}${content}`;
  }

  const lastImport = importMatches[importMatches.length - 1];
  const insertionIndex = lastImport.index! + lastImport[0].length;
  return `${content.slice(0, insertionIndex)}${importLine}${content.slice(insertionIndex)}`;
}

function ensureApiTestFixtureImport(content: string): string {
  const modulePath = '../fixtures/apiTest';
  const modulePattern = escapeRegExp(modulePath);
  const importPattern = new RegExp(`import\\s+\\{([^}]*)\\}\\s+from\\s+'${modulePattern}';`);
  const match = content.match(importPattern);

  if (match) {
    // Mevcut import'taki diger isimler korunur; expect ve test eklenir.
    const currentNames = match[1]
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    const updatedNames = [...new Set([...currentNames, 'expect', 'test'])].sort();
    return content.replace(match[0], `import { ${updatedNames.join(', ')} } from '${modulePath}';`);
  }

  return ensureNamedImport(content, modulePath, ['expect', 'test']);
}

function renderTest(
  domain: string,
  endpointGroup: string,
  methodName: string,
  testName: string,
  expectedStatus: number,
  parsedCurl: ParsedCurl,
  data: TestData
): string {
  const className = `${toPascalCase(domain)}Client`;
  const variableName = `${domain}Client`;
  const lines = [
    `  // api-test-generator:${domain}.${methodName}`,
    `  test('${escapeTsSingleQuoted(testName)}', async ({ apiRequest }) => {`,
    `    const ${variableName} = new ${className}(apiRequest);`
  ];
  const clientArguments: string[] = [];

  if (data.paramsFunctionName) {
    lines.push(`    const params = ${data.paramsFunctionName}();`);
    clientArguments.push('params');
  }

  if (data.payloadFunctionName) {
    lines.push(`    const payload = ${data.payloadFunctionName}();`);
    clientArguments.push('payload');
  }

  if (parsedCurl.requiresAuth) {
    lines.push('    const authHeaders = await getAuthorizationHeaders(apiRequest);');
    clientArguments.push('authHeaders');
  }

  lines.push('');

  const logArguments: string[] = [`'${parsedCurl.method}'`, `endpoints.${endpointGroup}.${methodName}`];
  const includeParams = Boolean(data.paramsFunctionName);
  const includeHeaders = parsedCurl.requiresAuth || includeParams;

  if (data.payloadFunctionName || includeHeaders) {
    logArguments.push(data.payloadFunctionName ? 'payload' : 'undefined');
  }

  if (includeHeaders) {
    logArguments.push(parsedCurl.requiresAuth ? 'authHeaders' : 'undefined');
  }

  if (includeParams) {
    logArguments.push('params');
  }

  lines.push(`    logger.logApiRequest(${logArguments.join(', ')});`);
  lines.push('');
  lines.push(`    const response = await ${variableName}.${methodName}(${clientArguments.join(', ')});`);
  lines.push('');
  lines.push('    await logger.logApiResponseWithBody(response);');
  lines.push('');
  lines.push(`    apiAssert.expectStatus(response, ${expectedStatus});`);
  lines.push('  });');

  return lines.join('\n');
}

function updateSpec(
  workspace: Workspace,
  domain: string,
  endpointGroup: string,
  specFile: string,
  methodName: string,
  testName: string,
  expectedStatus: number,
  parsedCurl: ParsedCurl,
  data: TestData
): void {
  const relativePath = `tests/specs/${specFile}`;
  const className = `${toPascalCase(domain)}Client`;
  const testText = renderTest(domain, endpointGroup, methodName, testName, expectedStatus, parsedCurl, data);
  const marker = `// api-test-generator:${domain}.${methodName}`;

  if (!workspace.exists(relativePath)) {
    let content = '';
    content = ensureNamedImport(content, `../../src/clients/${domain}Client`, [className]);
    content = ensureNamedImport(content, '../../src/config/endpoints', ['endpoints']);
    content = ensureNamedImport(content, '../../src/config/env', ['env']);
    content = ensureNamespaceImport(content, '../../src/utils/assertions', 'apiAssert');
    content = ensureNamespaceImport(content, '../../src/utils/logger', 'logger');
    content = ensureNamespaceImport(content, '../../src/utils/testDataGenerator', 'testDataGenerator');

    if (parsedCurl.requiresAuth) {
      content = ensureNamedImport(content, '../../src/utils/tokenManager', ['getAuthorizationHeaders']);
    }

    if (data.paramsFunctionName) {
      content = ensureNamedImport(content, `../data/${domain}Params`, [data.paramsFunctionName]);
    }

    if (data.payloadFunctionName) {
      content = ensureNamedImport(content, `../data/${domain}Payloads`, [data.payloadFunctionName]);
    }

    content = ensureApiTestFixtureImport(content);
    content += [
      '',
      `test.describe('${toPascalCase(domain)} API', () => {`,
      "  test.skip(!env.testsEnabled, 'Gercek API testleri kapali. Calistirmak icin TESTS_ENABLED=true yap.');",
      '',
      testText,
      '});',
      ''
    ].join('\n');
    workspace.update(relativePath, content);
    return;
  }

  let content = workspace.read(relativePath);

  // Marker tam satir olarak aranir: substring kontrolu, bir metot adi digerinin
  // oneki oldugunda (getAll / getAllWithPaging) yanlis cakisma uretiyordu.
  const markerPattern = new RegExp(`^[ \\t]*${escapeRegExp(marker)}[ \\t]*$`, 'm');

  if (markerPattern.test(content)) {
    if (!normalizeForComparison(content).includes(normalizeForComparison(testText))) {
      throw new Error(
        `Spec cakismasi: ${relativePath} icinde ${domain}.${methodName} testi zaten farkli icerikle tanimli.`
      );
    }

    return;
  }

  content = ensureNamedImport(content, `../../src/clients/${domain}Client`, [className]);
  content = ensureNamedImport(content, '../../src/config/endpoints', ['endpoints']);
  content = ensureNamespaceImport(content, '../../src/utils/assertions', 'apiAssert');
  content = ensureNamespaceImport(content, '../../src/utils/logger', 'logger');
  content = ensureNamespaceImport(content, '../../src/utils/testDataGenerator', 'testDataGenerator');
  content = ensureApiTestFixtureImport(content);

  if (parsedCurl.requiresAuth) {
    content = ensureNamedImport(content, '../../src/utils/tokenManager', ['getAuthorizationHeaders']);
  }

  if (data.paramsFunctionName) {
    content = ensureNamedImport(content, `../data/${domain}Params`, [data.paramsFunctionName]);
  }

  if (data.payloadFunctionName) {
    content = ensureNamedImport(content, `../data/${domain}Payloads`, [data.payloadFunctionName]);
  }

  const describeCloseIndex = content.lastIndexOf('\n});');

  if (describeCloseIndex === -1) {
    throw new Error(`${relativePath} icinde test.describe kapanisi bulunamadi.`);
  }

  content = `${content.slice(0, describeCloseIndex).trimEnd()}\n\n${testText}${content.slice(describeCloseIndex)}`;
  workspace.update(relativePath, content);
}

export function generateApiTest(options: GenerateApiTestOptions): string[] {
  const {
    rootDir,
    domain,
    endpointGroup = domain,
    specFile = `${domain}.spec.ts`,
    methodName,
    testName,
    expectedStatus,
    parsedCurl,
    dryRun = false
  } = options;

  assertIdentifier(domain, 'Domain adi');
  assertIdentifier(endpointGroup, 'Endpoint grubu');
  assertIdentifier(methodName, 'Client metot adi');

  if (domain[0] !== domain[0].toLowerCase()) {
    throw new Error(`Domain adi lowerCamelCase olmali. Ornek: musteriKarti. Gelen deger: ${domain}`);
  }

  if (endpointGroup[0] !== endpointGroup[0].toLowerCase()) {
    throw new Error(`Endpoint grubu lowerCamelCase olmali. Ornek: musteriKarti. Gelen deger: ${endpointGroup}`);
  }

  if (!/^[A-Za-z_$][A-Za-z0-9_$]*\.spec\.ts$/.test(specFile)) {
    throw new Error(
      `Spec dosyasi tests/specs altinda gecerli bir .spec.ts dosyasi olmali. ` +
        `Ornek: musteriKarti.spec.ts. Gelen deger: ${specFile}`
    );
  }

  if (methodName.toLowerCase() === `${domain}Client`.toLowerCase()) {
    throw new Error(
      `Client metot adi client dosyasinin adi degil, API isleminin adi olmali. ` +
        `Ornek: getAllWithPaging. Gelen deger: ${methodName}`
    );
  }

  if (methodName[0] !== methodName[0].toLowerCase()) {
    throw new Error(`Client metot adi lowerCamelCase olmali. Ornek: getAllWithPaging. Gelen deger: ${methodName}`);
  }

  if (!Number.isInteger(expectedStatus) || expectedStatus < 100 || expectedStatus > 599) {
    throw new Error(`Beklenen status code gecersiz: ${expectedStatus}`);
  }

  const workspace = createWorkspace(rootDir);
  updateEndpoints(workspace, endpointGroup, methodName, parsedCurl.path);
  updateClient(workspace, domain, endpointGroup, methodName, parsedCurl);
  const data = updateTestData(workspace, domain, methodName, parsedCurl);
  updateSpec(workspace, domain, endpointGroup, specFile, methodName, testName, expectedStatus, parsedCurl, data);

  if (!dryRun) {
    workspace.commit();
  }

  return workspace.getChangedPaths();
}
