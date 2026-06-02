import { KampanyaClient } from '../../src/clients/kampanyaClient';
import { endpoints } from '../../src/config/endpoints';
import { env } from '../../src/config/env';
import * as apiAssert from '../../src/utils/assertions';
import * as testDataGenerator from '../../src/utils/testDataGenerator';
import { getAuthorizationHeaders } from '../../src/utils/tokenManager';
import { createAddKampanyaKategoriPayload } from '../data/kampanyaPayloads';
import { expect, test } from '../fixtures/apiTest';
import * as logger from '../../src/utils/logger';

test.describe('Kampanya API', () => {
  test.skip(!env.testsEnabled, 'Gercek API testleri kapali. Calistirmak icin TESTS_ENABLED=true yap.');

  // api-test-generator:kampanya.addKampanyaKategori
  test('addKampanyaKategori returns success', async ({ apiRequest }) => {
    const kampanyaClient = new KampanyaClient(apiRequest);
    const kampanyaKategoriAdi = testDataGenerator.generateTestString('Otomasyon Kampanya', 4, 6);
    const payload = createAddKampanyaKategoriPayload({ kampanyaKategoriAdi });
    const authHeaders = await getAuthorizationHeaders(apiRequest);

    logger.logApiRequest('POST', endpoints.kampanya.addKampanyaKategori, payload, authHeaders);

    const response = await kampanyaClient.addKampanyaKategori(payload, authHeaders);

    await logger.logApiResponseWithBody(response);

    expect(response.status()).toBe(200);

    // await expect(response).toBeOK();

    logger.logHighlight(`Oluşturulan kampanya kategorisi: ${kampanyaKategoriAdi}`);
  });
});
