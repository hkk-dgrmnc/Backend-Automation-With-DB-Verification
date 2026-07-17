import { AuthClient } from '../../src/clients/authClient';
import { endpoints } from '../../src/config/endpoints';
import { env } from '../../src/config/env';
import * as apiAssert from '../../src/utils/assertions';
import * as logger from '../../src/utils/logger';
import * as testDataGenerator from '../../src/utils/testDataGenerator';
import { cacheAuthToken, extractAuthToken } from '../../src/utils/tokenManager';
import { readJson } from '../../src/utils/responseHelper';
import { loginPayload } from '../data/authPayloads';
import { expect, test } from '../fixtures/apiTest';

test.describe('Auth API', () => {
  test.skip(!env.testsEnabled, 'Gercek API testleri kapali. Calistirmak icin TESTS_ENABLED=true yap.');

  test('login returns success and a usable auth token', async ({ apiRequest }) => {
    const authClient = new AuthClient(apiRequest);
    const payload = loginPayload();

    logger.logApiRequest('POST', endpoints.auth.login, payload);

    const response = await authClient.login(payload);

    await logger.logApiResponseWithBody(response);

    apiAssert.expectOkResponse(response);

    const body = await readJson(response);
    const token = extractAuthToken(body);
    cacheAuthToken(token);

    expect(token.trim().length).toBeGreaterThan(0);
  });
});
