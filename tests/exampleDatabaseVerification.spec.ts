import { test } from './fixtures/apiTest';
import { ExampleClient } from '../src/clients/exampleClient';
import { endpoints } from '../src/config/endpoints';
import { closeDbPool } from '../src/database/dbClient';
import {
  findActiveExampleById,
  findExampleById
} from '../src/database/repositories/exampleRepository';
import {
  expectFieldDefined,
  expectFieldsEqual,
  expectObjectFieldEquals,
  expectObjectHasFields,
  expectStatus
} from '../src/utils/assertions';
import { logApiRequest, logApiResponse, logDebug } from '../src/utils/logger';
import { readJson } from '../src/utils/responseHelper';
import { createProductPayload } from './data/examplePayloads';

/**
 * Database verification örnekleri.
 *
 * Bu dosya gerçek PostgreSQL bağlantısı hazır olmadığı için skip durumundadır.
 * Kendi backend ve database bilgilerin hazır olduğunda `.skip` kısmını kaldırabilirsin.
 *
 * Buradaki amaç database'i test etmek değildir.
 * Database sadece API sonucunu veya API işleminde kullanılacak referans datayı doğrulamak için kullanılır.
 *
 * Test dosyasında raw SQL yoktur.
 * Test dosyasında database connection oluşturulmaz.
 * Test sadece repository methodlarını çağırır.
 */
test.describe.skip('Example API database verification usage', () => {
  test.afterAll(async () => {
    await closeDbPool();
  });

  test('gets expected data from database and compares it with GET response', async ({ request }) => {
    const productId = 1;
    const exampleClient = new ExampleClient(request);

    // 1. Beklenen data database'den repository ile alınır.
    // SQL bu testte değil, src/database/queries/exampleQueries.ts dosyasındadır.
    const expectedProduct = await findExampleById(productId);
    expectFieldDefined(expectedProduct, 'Product database kaydında bulunmalı');

    const dbProduct = expectedProduct as Record<string, unknown>;
    logDebug('DATABASE RECORD FOR GET VERIFICATION', dbProduct);

    // 2. API client ile endpoint çağrılır.
    logApiRequest('GET', endpoints.example.productById(productId));
    const response = await exampleClient.getProductById(productId);

    // 3. Status test katmanında kontrol edilir.
    expectStatus(response, 200);

    // 4. Response body plain JSON olarak okunur.
    const body = await readJson(response);
    logApiResponse(response, body);

    // 5. API response alanları database'den gelen alanlarla karşılaştırılır.
    expectObjectHasFields(body, ['id', 'title', 'price', 'category']);
    expectFieldsEqual(body.id, dbProduct.id, 'API id değeri database id değeriyle aynı olmalı');
    expectFieldsEqual(body.title, dbProduct.title, 'API title değeri database title değeriyle aynı olmalı');
    expectFieldsEqual(body.price, dbProduct.price, 'API price değeri database price değeriyle aynı olmalı');
    expectFieldsEqual(body.category, dbProduct.category, 'API category değeri database category değeriyle aynı olmalı');
  });

  test('gets reference data from database and uses it inside POST body', async ({ request }) => {
    const referenceProductId = 1;
    const exampleClient = new ExampleClient(request);

    // 1. POST body için gereken referans data database'den alınır.
    // Örnek senaryo: yeni product oluştururken category veya price gibi değerler mevcut aktif kayıttan alınabilir.
    const referenceProduct = await findActiveExampleById(referenceProductId);
    expectFieldDefined(referenceProduct, 'POST body için aktif referans product database kaydında bulunmalı');

    const dbProduct = referenceProduct as Record<string, unknown>;
    logDebug('DATABASE REFERENCE RECORD FOR POST BODY', dbProduct);

    // 2. Payload builder ile default body oluşturulur.
    // Sadece database'den gelen gerekli alanlar override edilir.
    const productPayload = createProductPayload({
      category: dbProduct.category,
      price: dbProduct.price
    });

    // 3. API client body'nin içeriğini bilmez; sadece kendisine verilen plain JSON body'yi gönderir.
    logApiRequest('POST', endpoints.example.products, productPayload);
    const response = await exampleClient.createProduct(productPayload);

    expectStatus(response, 201);

    const body = await readJson(response);
    logApiResponse(response, body);

    // 4. API response, POST body'ye koyduğumuz database kaynaklı değerlerle doğrulanır.
    expectObjectHasFields(body, ['id', 'title', 'price', 'category']);
    expectObjectFieldEquals(body, 'category', dbProduct.category);
    expectObjectFieldEquals(body, 'price', dbProduct.price);
  });
});
