import { AuthClient } from '../src/clients/authClient';
import { endpoints } from '../src/config/endpoints';
import { env } from '../src/config/env';
import { expectOkResponse } from '../src/utils/assertions';
import { logApiRequest, logApiResponse } from '../src/utils/logger';
import { cacheAuthToken, extractAuthToken } from '../src/utils/tokenManager';
import { readJson } from '../src/utils/responseHelper';
import { createLoginPayload } from './data/authPayloads';
import { expect, test } from './fixtures/apiTest';

test.describe('Auth API', () => {
  test.skip(!env.testsEnabled, 'Gerçek API testleri kapalı. Çalıştırmak için TESTS_ENABLED=true yap.');

  test('login returns success and stores auth token for later requests', async ({ apiRequest }) => {
    const authClient = new AuthClient(apiRequest);
    const loginPayload = createLoginPayload();

    logApiRequest('POST', endpoints.auth.login, loginPayload);

    const response = await authClient.login(loginPayload);

    expectOkResponse(response);

    const body = await readJson(response);
    logApiResponse(response, body);

    const token = extractAuthToken(body);
    cacheAuthToken(token);

    expect(token.trim().length).toBeGreaterThan(0);
  });
});
