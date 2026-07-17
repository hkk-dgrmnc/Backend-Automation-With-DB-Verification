import { KampanyaClient } from '../../src/clients/kampanyaClient';
import { endpoints } from '../../src/config/endpoints';
import { env } from '../../src/config/env';
import * as apiAssert from '../../src/utils/assertions';
import * as logger from '../../src/utils/logger';
import * as testDataGenerator from '../../src/utils/testDataGenerator';
import { getAuthorizationHeaders } from '../../src/utils/tokenManager';
import { readJson } from '../../src/utils/responseHelper';
import { addKampanyaKategoriPayload } from '../data/kampanyaPayloads';
import { expect, test } from '../fixtures/apiTest';

test.describe('Kampanya API', () => {
  test.skip(!env.testsEnabled, 'Gercek API testleri kapali. Calistirmak icin TESTS_ENABLED=true yap.');

  // api-test-generator:kampanya.addKampanyaKategori
  test('addKampanyaKategori returns success', async ({ apiRequest }) => {
    const kampanyaClient = new KampanyaClient(apiRequest);
    const kampanyaKategoriAdi = testDataGenerator.generateTestString('Otomasyon Kampanya', 4, 6);
    const payload = addKampanyaKategoriPayload({ kampanyaKategoriAdi });
    const authHeaders = await getAuthorizationHeaders(apiRequest);

    logger.logApiRequest('POST', endpoints.kampanya.addKampanyaKategori, payload, authHeaders);

    const response = await kampanyaClient.addKampanyaKategori(payload, authHeaders);

    await logger.logApiResponseWithBody(response);

    apiAssert.expectStatus(response, 200);

    const body = await readJson(response);

    // Basit API testi: status ve response body'nin plain JSON object geldiğini doğrular.
    apiAssert.expectFieldType(body, 'object');

    // Response şeması Swagger'da tanımlı değil. Gerçek response görüldükten sonra
    // (PTT API'larındaki gibi) wrapper alanları açılabilir:
    // apiAssert.expectObjectHasFields(body, ['data', 'statusCode', 'isError']);
    // apiAssert.expectFieldsEqual(body.statusCode, 200);
    // apiAssert.expectFieldsEqual(body.isError, false);

    logger.logHighlight(`Oluşturulan kampanya kategorisi: ${kampanyaKategoriAdi}`);
  });
});
