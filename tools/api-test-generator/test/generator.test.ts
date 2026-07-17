import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { parseCurl } from '../lib/curlParser';
import { generateApiTest } from '../lib/generator';
import { domainFromClientName, inferClientMethodName, toCamelCase, toPascalCase } from '../lib/naming';

function createTempProject(): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-test-generator-'));
  fs.mkdirSync(path.join(rootDir, 'src/config'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'src/config/endpoints.ts'),
    "export const endpoints = {\n  auth: {\n    login: '/login'\n  }\n};\n"
  );
  return rootDir;
}

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function assertTranspiles(rootDir: string, relativePaths: string[]): void {
  for (const relativePath of relativePaths.filter((item) => item.endsWith('.ts'))) {
    const result = ts.transpileModule(read(rootDir, relativePath), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      },
      fileName: relativePath,
      reportDiagnostics: true
    });
    const errors = (result.diagnostics ?? []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
    );
    assert.equal(errors.length, 0, `${relativePath} TypeScript syntax hatasi iceriyor.`);
  }
}

test('parseCurl query params ayirir ve hassas header degerlerini tasimaz', () => {
  const parsedCurl = parseCurl(
    "curl --location 'https://example.test/api/cards?Page=1&PageSize=10' " +
      "--header 'Authorization: Bearer should-not-be-written' " +
      "--header 'Accept: application/json' " +
      "--header 'X-Trace-Id: local-value'"
  );

  assert.equal(parsedCurl.method, 'GET');
  assert.equal(parsedCurl.path, '/api/cards');
  assert.deepEqual(parsedCurl.queryParams, { Page: '1', PageSize: '10' });
  assert.deepEqual(parsedCurl.safeHeaders, { accept: 'application/json' });
  assert.equal(parsedCurl.requiresAuth, true);
  assert.equal(JSON.stringify(parsedCurl).includes('should-not-be-written'), false);
  assert.equal(JSON.stringify(parsedCurl).includes('local-value'), false);
});

test('parseCurl hassas query veya JSON body degerlerini data dosyasina tasimaz', () => {
  assert.throws(
    () => parseCurl("curl 'https://example.test/api/cards?accessToken=secret'"),
    /hassas query parametresi/
  );
  assert.throws(
    () => parseCurl("curl 'https://example.test/api/login' --data-raw '{\"password\":\"secret\"}'"),
    /Request body hassas alanlar iceriyor/
  );
});

test('client metot adini endpoint aksiyonundan cift prefix olmadan onerir', () => {
  assert.equal(
    inferClientMethodName('GET', '/api_musteri/MusteriKarti/GetAllMusteriKartiNames'),
    'getAllMusteriKartiNames'
  );
  assert.equal(inferClientMethodName('GET', '/api/cards'), 'getCards');
});

test('domain client adindan turetilir', () => {
  assert.equal(domainFromClientName('MusteriKartiClient'), 'musteriKarti');
  assert.throws(() => domainFromClientName('musteriKarti'), /Client son ekiyle bitmeli/);
});

test('client dosya adi metot adi olarak kullanilamaz', () => {
  const rootDir = createTempProject();
  const parsedCurl = parseCurl("curl 'https://example.test/api/cards'");

  assert.throws(
    () =>
      generateApiTest({
        rootDir,
        domain: 'customerCard',
        methodName: 'customerCardClient',
        testName: 'invalid name',
        expectedStatus: 200,
        parsedCurl
      }),
    /Client metot adi client dosyasinin adi degil/
  );
});

test('GET cURL icin endpoint, client, params ve basarili spec olusturur', () => {
  const rootDir = createTempProject();
  const parsedCurl = parseCurl(
    "curl 'https://example.test/api/cards?Page=1&PageSize=10' --header 'Authorization: Bearer secret'"
  );
  const options = {
    rootDir,
    domain: 'customerCard',
    methodName: 'getAllWithPaging',
    testName: 'gets customer cards successfully',
    expectedStatus: 200,
    parsedCurl
  };
  const changedPaths = generateApiTest(options);

  assert.deepEqual(changedPaths.sort(), [
    'src/clients/customerCardClient.ts',
    'src/config/endpoints.ts',
    'tests/data/customerCardParams.ts',
    'tests/specs/customerCard.spec.ts'
  ]);
  assert.match(read(rootDir, 'src/config/endpoints.ts'), /getAllWithPaging: '\/api\/cards'/);
  assert.match(read(rootDir, 'src/clients/customerCardClient.ts'), /params: Record<string, string>/);
  assert.match(read(rootDir, 'tests/data/customerCardParams.ts'), /"PageSize": "10"/);
  assert.match(
    read(rootDir, 'tests/specs/customerCard.spec.ts'),
    /import \* as testDataGenerator from '\.\.\/\.\.\/src\/utils\/testDataGenerator';/
  );
  assert.match(
    read(rootDir, 'tests/specs/customerCard.spec.ts'),
    /import \* as apiAssert from '\.\.\/\.\.\/src\/utils\/assertions';/
  );
  assert.match(
    read(rootDir, 'tests/specs/customerCard.spec.ts'),
    /import \* as logger from '\.\.\/\.\.\/src\/utils\/logger';/
  );
  assert.match(
    read(rootDir, 'tests/specs/customerCard.spec.ts'),
    /import \{ expect, test \} from '\.\.\/fixtures\/apiTest';/
  );
  assert.match(read(rootDir, 'tests/specs/customerCard.spec.ts'), /logger\.logApiRequest\(/);
  assert.match(read(rootDir, 'tests/specs/customerCard.spec.ts'), /await logger\.logApiResponseWithBody\(response\)/);
  assert.match(read(rootDir, 'tests/specs/customerCard.spec.ts'), /apiAssert\.expectStatus\(response, 200\)/);
  assert.equal(read(rootDir, 'tests/specs/customerCard.spec.ts').includes('secret'), false);
  assertTranspiles(rootDir, changedPaths);

  assert.deepEqual(generateApiTest(options), []);
});

test('mevcut domaine JSON body kullanan POST metodu ve payload ekler', () => {
  const rootDir = createTempProject();
  const getCurl = parseCurl("curl 'https://example.test/api/cards?Page=1'");

  generateApiTest({
    rootDir,
    domain: 'customerCard',
    methodName: 'getAll',
    testName: 'gets cards successfully',
    expectedStatus: 200,
    parsedCurl: getCurl
  });

  const postCurl = parseCurl(
    "curl --request POST 'https://example.test/api/cards' " +
      "--header 'Content-Type: application/json' " +
      "--data-raw '{\"name\":\"Primary\",\"active\":true}'"
  );
  const changedPaths = generateApiTest({
    rootDir,
    domain: 'customerCard',
    methodName: 'create',
    testName: 'creates customer card successfully',
    expectedStatus: 201,
    parsedCurl: postCurl
  });

  assert.match(read(rootDir, 'src/config/endpoints.ts'), /create: '\/api\/cards'/);
  assert.match(read(rootDir, 'src/clients/customerCardClient.ts'), /async create\(\n\s+payload: Record<string, unknown>/);
  assert.match(read(rootDir, 'tests/data/customerCardPayloads.ts'), /"name": "Primary"/);
  assert.match(read(rootDir, 'tests/specs/customerCard.spec.ts'), /createPayload\(\)/);
  assert.match(read(rootDir, 'tests/specs/customerCard.spec.ts'), /apiAssert\.expectStatus\(response, 201\)/);
  assertTranspiles(rootDir, changedPaths);
});

test('mevcut spec fixture importunu expect ve test standardina tasir', () => {
  const rootDir = createTempProject();
  const specDirectory = path.join(rootDir, 'tests/specs');
  fs.mkdirSync(specDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(specDirectory, 'customerCard.spec.ts'),
    "import { test } from '../fixtures/apiTest';\n\ntest.describe('CustomerCard API', () => {\n});\n"
  );

  generateApiTest({
    rootDir,
    domain: 'customerCard',
    methodName: 'getCards',
    testName: 'gets cards successfully',
    expectedStatus: 200,
    parsedCurl: parseCurl("curl 'https://example.test/api/cards'")
  });

  assert.match(
    read(rootDir, 'tests/specs/customerCard.spec.ts'),
    /import \{ expect, test \} from '\.\.\/fixtures\/apiTest';/
  );
});

test('endpoint grubu ve spec hedefi client domaininden ayri secilebilir', () => {
  const rootDir = createTempProject();
  const parsedCurl = parseCurl("curl 'https://example.test/api/cards'");
  const changedPaths = generateApiTest({
    rootDir,
    domain: 'customerCard',
    endpointGroup: 'lookup',
    specFile: 'customerCardLookup.spec.ts',
    methodName: 'getCards',
    testName: 'gets lookup cards successfully',
    expectedStatus: 200,
    parsedCurl
  });

  assert.match(read(rootDir, 'src/config/endpoints.ts'), /lookup: \{\n\s+getCards: '\/api\/cards'/);
  assert.match(read(rootDir, 'src/clients/customerCardClient.ts'), /endpoints\.lookup\.getCards/);
  assert.match(read(rootDir, 'tests/specs/customerCardLookup.spec.ts'), /endpoints\.lookup\.getCards/);
  assertTranspiles(rootDir, changedPaths);
});

test('ayni endpoint adi farkli path ile tekrar kullanilamaz', () => {
  const rootDir = createTempProject();
  const options = {
    rootDir,
    domain: 'customerCard',
    methodName: 'getCards',
    testName: 'gets cards successfully',
    expectedStatus: 200,
    parsedCurl: parseCurl("curl 'https://example.test/api/cards'")
  };

  generateApiTest(options);

  assert.throws(
    () =>
      generateApiTest({
        ...options,
        parsedCurl: parseCurl("curl 'https://example.test/api/other-cards'")
      }),
    /Endpoint cakismasi/
  );
});

test('ayni client metodu farkli endpoint grubu ile tekrar kullanilamaz', () => {
  const rootDir = createTempProject();
  const options = {
    rootDir,
    domain: 'customerCard',
    methodName: 'getCards',
    testName: 'gets cards successfully',
    expectedStatus: 200,
    parsedCurl: parseCurl("curl 'https://example.test/api/cards'")
  };

  generateApiTest(options);

  assert.throws(
    () =>
      generateApiTest({
        ...options,
        endpointGroup: 'lookup'
      }),
    /Client metot cakismasi/
  );
});

test('ayni spec testi farkli status ile tekrar kullanilamaz', () => {
  const rootDir = createTempProject();
  const options = {
    rootDir,
    domain: 'customerCard',
    methodName: 'getCards',
    testName: 'gets cards successfully',
    expectedStatus: 200,
    parsedCurl: parseCurl("curl 'https://example.test/api/cards'")
  };

  generateApiTest(options);

  assert.throws(
    () =>
      generateApiTest({
        ...options,
        expectedStatus: 204
      }),
    /Spec cakismasi/
  );
});

test('ayni test data fonksiyonu farkli query degeri ile tekrar kullanilamaz', () => {
  const rootDir = createTempProject();
  const options = {
    rootDir,
    domain: 'customerCard',
    methodName: 'getCards',
    testName: 'gets cards successfully',
    expectedStatus: 200,
    parsedCurl: parseCurl("curl 'https://example.test/api/cards?Page=1'")
  };

  generateApiTest(options);

  assert.throws(
    () =>
      generateApiTest({
        ...options,
        parsedCurl: parseCurl("curl 'https://example.test/api/cards?Page=2'")
      }),
    /Test data cakismasi/
  );
});

test('ayni metot adiyla farkli imza uretimi client metot cakismasi verir', () => {
  const rootDir = createTempProject();
  const baseOptions = {
    rootDir,
    domain: 'customerCard',
    methodName: 'getCards',
    testName: 'gets cards successfully',
    expectedStatus: 200
  };

  generateApiTest({ ...baseOptions, parsedCurl: parseCurl("curl 'https://example.test/api/cards'") });

  // Ayni metot adi, bu kez query'li: eski imza (headers) ile yeni cagri (params)
  // sessizce karismamali, yuksek sesle cakisma hatasi vermeli.
  assert.throws(
    () =>
      generateApiTest({
        ...baseOptions,
        specFile: 'customerCardPaging.spec.ts',
        testName: 'gets cards with paging',
        parsedCurl: parseCurl("curl 'https://example.test/api/cards?Page=1'")
      }),
    /Client metot cakismasi/
  );
});

test('marker oneki olan metot ayni spec dosyasina eklenebilir', () => {
  const rootDir = createTempProject();
  const shared = { rootDir, domain: 'customerCard', expectedStatus: 200 };

  generateApiTest({
    ...shared,
    methodName: 'getAllWithPaging',
    testName: 'gets cards with paging',
    parsedCurl: parseCurl("curl 'https://example.test/api/cards/GetAllWithPaging?Page=1'")
  });

  // 'getAll' marker'i 'getAllWithPaging' marker'inin substring'i: yanlis cakisma olmamali.
  const changedPaths = generateApiTest({
    ...shared,
    methodName: 'getAll',
    testName: 'gets all cards',
    parsedCurl: parseCurl("curl 'https://example.test/api/cards/GetAll'")
  });

  assert.ok(changedPaths.includes('tests/specs/customerCard.spec.ts'));
  assert.match(read(rootDir, 'tests/specs/customerCard.spec.ts'), /api-test-generator:customerCard\.getAll\b/);
  assertTranspiles(rootDir, changedPaths);
});

test('kompakt endpoints dosyasina grup bozulmadan metot eklenir', () => {
  const rootDir = createTempProject();
  fs.writeFileSync(
    path.join(rootDir, 'src/config/endpoints.ts'),
    "export const endpoints = { customerCard: { getAll: '/api/cards/GetAll' } };\n"
  );

  generateApiTest({
    rootDir,
    domain: 'customerCard',
    methodName: 'getNames',
    testName: 'gets names',
    expectedStatus: 200,
    parsedCurl: parseCurl("curl 'https://example.test/api/cards/GetNames'")
  });

  const endpointsContent = read(rootDir, 'src/config/endpoints.ts');
  const groupCount = endpointsContent.match(/customerCard:/g)?.length ?? 0;

  assert.equal(groupCount, 1);
  assert.match(endpointsContent, /getNames: '\/api\/cards\/GetNames'/);
  assertTranspiles(rootDir, ['src/config/endpoints.ts']);
});

test('ayni grup adini iceren ikinci export objesine yazilmaz', () => {
  const rootDir = createTempProject();
  fs.writeFileSync(
    path.join(rootDir, 'src/config/endpoints.ts'),
    [
      'export const endpoints = {',
      '  customerCard: {',
      "    getAll: '/api/cards/GetAll'",
      '  }',
      '};',
      '',
      'export const legacyEndpoints = {',
      '  customerCard: {',
      "    getOld: '/api/old'",
      '  }',
      '};',
      ''
    ].join('\n')
  );

  generateApiTest({
    rootDir,
    domain: 'customerCard',
    methodName: 'getNames',
    testName: 'gets names',
    expectedStatus: 200,
    parsedCurl: parseCurl("curl 'https://example.test/api/cards/GetNames'")
  });

  const endpointsContent = read(rootDir, 'src/config/endpoints.ts');
  const legacyIndex = endpointsContent.indexOf('legacyEndpoints');

  assert.match(endpointsContent.slice(0, legacyIndex), /getNames/);
  assert.equal(endpointsContent.slice(legacyIndex).includes('getNames'), false);
});

test('cift tirnakli endpoint tanimi ayni path icin cakisma sayilmaz', () => {
  const rootDir = createTempProject();
  fs.writeFileSync(
    path.join(rootDir, 'src/config/endpoints.ts'),
    'export const endpoints = {\n  customerCard: {\n    getAll: "/api/cards/GetAll"\n  }\n};\n'
  );

  const changedPaths = generateApiTest({
    rootDir,
    domain: 'customerCard',
    methodName: 'getAll',
    testName: 'gets all cards',
    expectedStatus: 200,
    parsedCurl: parseCurl("curl 'https://example.test/api/cards/GetAll'")
  });

  assert.equal(changedPaths.includes('src/config/endpoints.ts'), false);
});

test('farkli metot adlari farkli test data fonksiyonlari uretir', () => {
  const rootDir = createTempProject();

  generateApiTest({
    rootDir,
    domain: 'customerCard',
    methodName: 'cards',
    testName: 'lists cards',
    expectedStatus: 200,
    parsedCurl: parseCurl("curl 'https://example.test/api/cards/List?Page=1'")
  });

  generateApiTest({
    rootDir,
    domain: 'customerCard',
    methodName: 'getCards',
    testName: 'gets cards',
    expectedStatus: 200,
    parsedCurl: parseCurl("curl 'https://example.test/api/cards/Get?Page=2'")
  });

  const paramsContent = read(rootDir, 'tests/data/customerCardParams.ts');

  assert.match(paramsContent, /export function cardsParams\(/);
  assert.match(paramsContent, /export function getCardsParams\(/);
});

test('parseCurl -XPOST bitisik formunu ve --json kisayolunu tanir', () => {
  const attached = parseCurl('curl -XPOST \'https://example.test/api/x\' --data-raw \'{"name":"a"}\'');

  assert.equal(attached.method, 'POST');

  const jsonShortcut = parseCurl('curl \'https://example.test/api/x\' --json \'{"name":"a"}\'');

  assert.equal(jsonShortcut.method, 'POST');
  assert.deepEqual(jsonShortcut.body, { name: 'a' });
  assert.equal(jsonShortcut.safeHeaders['content-type'], 'application/json');
  assert.equal(jsonShortcut.safeHeaders.accept, 'application/json');
});

test('parseCurl desteklenmeyen data option ve dosya body icin acik hata verir', () => {
  assert.throws(
    () => parseCurl("curl 'https://example.test/api/x' --data-urlencode 'name=deneme'"),
    /--data-urlencode desteklenmiyor/
  );
  assert.throws(() => parseCurl("curl 'https://example.test/api/x' -d @payload.json"), /Dosyadan body/);
});

test('parseCurl bilinmeyen option degerini URL sanmaz', () => {
  const parsed = parseCurl("curl 'https://example.test/api/cards' --referer 'https://portal.test/some/page'");

  assert.equal(parsed.path, '/api/cards');
  assert.ok(parsed.warnings.some((warning) => warning.includes('--referer')));

  assert.throws(
    () => parseCurl("curl 'https://example.test/api/cards' 'https://other.test/x'"),
    /birden fazla URL/
  );
});

test('parseCurl basic auth ve cookie girdilerini sessizce dusurmez', () => {
  const parsed = parseCurl("curl 'https://example.test/api/x' -u 'user:pass' -b 'session=abc'");

  assert.equal(parsed.requiresAuth, true);
  assert.ok(parsed.warnings.some((warning) => warning.includes('Basic auth')));
  assert.ok(parsed.warnings.some((warning) => warning.includes('Cookie')));
  assert.equal(JSON.stringify(parsed).includes('user:pass'), false);
  assert.equal(JSON.stringify(parsed).includes('session=abc'), false);
});

test('parseCurl CRLF ve satir devamlarini normalize eder', () => {
  const parsed = parseCurl("curl 'https://example.test/api/cards' \\\r\n  -H 'Accept: application/json'");

  assert.equal(parsed.path, '/api/cards');
  assert.deepEqual(parsed.safeHeaders, { accept: 'application/json' });
});

test('parseCurl ANSI-C ve cmd caret formatlari icin yonlendirici hata verir', () => {
  assert.throws(
    () => parseCurl("curl 'https://example.test/api/x' --data-raw $'{\"name\":\"deneme\"}'"),
    /ANSI-C quoting/
  );
  assert.throws(() => parseCurl('curl ^"https://example.test/api/x^"'), /caret/);
});

test('parseCurl cift tirnak icindeki backslash karakterlerini korur', () => {
  const parsed = parseCurl('curl "https://example.test/api/x?p=C:\\temp"');

  assert.equal(parsed.queryParams.p, 'C:\\temp');
});

test('parseCurl hassas alan kontrolu kelime bazlidir ve allow-field ile asilabilir', () => {
  const parsed = parseCurl(
    'curl \'https://example.test/api/x\' --data-raw \'{"maxTokens":5,"isTokenized":true}\''
  );

  assert.deepEqual(parsed.body, { maxTokens: 5, isTokenized: true });

  assert.throws(
    () => parseCurl('curl \'https://example.test/api/x\' --data-raw \'{"userPassword":"x"}\''),
    /hassas alanlar/
  );

  const allowed = parseCurl("curl 'https://example.test/api/x?tokenCount=3'", { allowedFields: ['tokenCount'] });

  assert.deepEqual(allowed.queryParams, { tokenCount: '3' });
});

test('turkce karakterler identifier uretiminde translitere edilir', () => {
  assert.equal(toPascalCase('sözleşme'), 'Sozlesme');
  assert.equal(toCamelCase('müşteri kartı'), 'musteriKarti');
  assert.equal(inferClientMethodName('GET', '/api/Müşteri/GetirTümü'), 'getGetirTumu');
});

test('metot adi HTTP fiilini degil domain aksiyonunu tasir', () => {
  assert.equal(inferClientMethodName('POST', '/api_musteri/Platform'), 'createPlatform');
  assert.equal(inferClientMethodName('PUT', '/api/cards/Rename'), 'updateRename');
  assert.equal(inferClientMethodName('DELETE', '/api/cards/Card'), 'deleteCard');
});
