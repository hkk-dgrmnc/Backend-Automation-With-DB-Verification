import { KampanyaClient } from '../../src/clients/kampanyaClient';
import { endpoints } from '../../src/config/endpoints';
import { env } from '../../src/config/env';
import { expectStatus } from '../../src/utils/assertions';
import { generateTestString } from '../../src/utils/testDataGenerator';
import { getAuthorizationHeaders } from '../../src/utils/tokenManager';
import { createAddKampanyaKategoriPayload } from '../data/kampanyaPayloads';
import { test } from '../fixtures/apiTest';
import { logApiRequest, logApiResponseWithBody, logHighlight } from '../../src/utils/logger';

test.describe('Kampanya API', () => {
  test.skip(!env.testsEnabled, 'Gercek API testleri kapali. Calistirmak icin TESTS_ENABLED=true yap.');

  // api-test-generator:kampanya.addKampanyaKategori
  test('addKampanyaKategori returns success', async ({ apiRequest }) => {
    const kampanyaClient = new KampanyaClient(apiRequest);
    const kampanyaKategoriAdi = generateTestString('Otomasyon Kampanya', 4, 6);
    const payload = createAddKampanyaKategoriPayload({ kampanyaKategoriAdi });
    const authHeaders = await getAuthorizationHeaders(apiRequest);

    logApiRequest('POST', endpoints.kampanya.addKampanyaKategori, payload, authHeaders);

    const response = await kampanyaClient.addKampanyaKategori(payload, authHeaders);

    await logApiResponseWithBody(response);

    expectStatus(response, 200);

    logHighlight(`Oluşturulan kampanya kategorisi: ${kampanyaKategoriAdi}`);

  });
});
