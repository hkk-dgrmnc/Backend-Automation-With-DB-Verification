import { PlatformClient } from '../../src/clients/platformClient';
import { endpoints } from '../../src/config/endpoints';
import { env } from '../../src/config/env';
import * as apiAssert from '../../src/utils/assertions';
import * as logger from '../../src/utils/logger';
import * as testDataGenerator from '../../src/utils/testDataGenerator';
import { getAuthorizationHeaders } from '../../src/utils/tokenManager';
import { createPlatformPayload } from '../data/platformPayloads';
import { expect, test } from '../fixtures/apiTest';

test.describe('Platform API', () => {
  test.skip(!env.testsEnabled, 'Gercek API testleri kapali. Calistirmak icin TESTS_ENABLED=true yap.');

  // api-test-generator:platform.createPlatform
  test('createPlatform returns success', async ({ apiRequest }) => {
    const platformClient = new PlatformClient(apiRequest);
    const platformAdi = testDataGenerator.generateTestString('Otomasyon Platform', 4, 6);
    const payload = createPlatformPayload({ ad: platformAdi });
    const authHeaders = await getAuthorizationHeaders(apiRequest);

    logger.logApiRequest('POST', endpoints.platform.createPlatform, payload, authHeaders);

    const response = await platformClient.createPlatform(payload, authHeaders);

    await logger.logApiResponseWithBody(response);

    apiAssert.expectStatus(response, 201);

    // Response şeması Swagger'da tanımlı değil; 201 body'si boş olabileceği için
    // body assertion'ı gerçek response görüldükten sonra eklenecek.

    logger.logHighlight(`Oluşturulan platform: ${platformAdi}`);
  });
});
