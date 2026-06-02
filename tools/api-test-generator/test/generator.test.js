'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const { parseCurl } = require('../lib/curlParser');
const { generateApiTest } = require('../lib/generator');
const { domainFromClientName, inferClientMethodName } = require('../lib/naming');

function createTempProject() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-test-generator-'));
  fs.mkdirSync(path.join(rootDir, 'src/config'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'src/config/endpoints.ts'),
    "export const endpoints = {\n  auth: {\n    login: '/login'\n  }\n};\n"
  );
  return rootDir;
}

function read(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function assertTranspiles(rootDir, relativePaths) {
  for (const relativePath of relativePaths.filter((item) => item.endsWith('.ts'))) {
    const result = ts.transpileModule(read(rootDir, relativePath), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      },
      fileName: relativePath,
      reportDiagnostics: true
    });
    const errors = (result.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
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
  assert.match(read(rootDir, 'tests/specs/customerCard.spec.ts'), /import \{ expect, test \} from '\.\.\/fixtures\/apiTest';/);
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

  assert.match(read(rootDir, 'tests/specs/customerCard.spec.ts'), /import \{ expect, test \} from '\.\.\/fixtures\/apiTest';/);
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
