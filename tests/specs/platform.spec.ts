import { PlatformClient } from '../../src/clients/platformClient';
import { endpoints } from '../../src/config/endpoints';
import { env } from '../../src/config/env';
import * as apiAssert from '../../src/utils/assertions';
import * as logger from '../../src/utils/logger';
import * as testDataGenerator from '../../src/utils/testDataGenerator';
import { getAuthorizationHeaders } from '../../src/utils/tokenManager';
import { createPostPlatformPayload } from '../data/platformPayloads';
import { expect, test } from '../fixtures/apiTest';

test.describe('Platform API', () => {
  test.skip(!env.testsEnabled, 'Gercek API testleri kapali. Calistirmak icin TESTS_ENABLED=true yap.');

  // api-test-generator:platform.postPlatform
  test('postPlatform returns success', async ({ apiRequest }) => {
    const platformClient = new PlatformClient(apiRequest);
    const payload = createPostPlatformPayload();
    const authHeaders = await getAuthorizationHeaders(apiRequest);

    logger.logApiRequest('POST', endpoints.platform.postPlatform, payload, authHeaders);

    const response = await platformClient.postPlatform(payload, authHeaders);

    await logger.logApiResponseWithBody(response);

    apiAssert.expectStatus(response, 201);
  });
});
