import { ProjectAuthClient } from '../../src/clients/project/authClient';
import { endpoints } from '../../src/config/endpoints';
import { env } from '../../src/config/env';
import { expectOkResponse } from '../../src/utils/assertions';
import { logApiRequest, logApiResponse } from '../../src/utils/logger';
import { cacheProjectAuthToken, extractProjectAuthToken } from '../../src/utils/projectTokenManager';
import { readJson } from '../../src/utils/responseHelper';
import { createProjectLoginPayload } from './data/authPayloads';
import { expect, test } from './fixtures/projectApiTest';

test.describe('Project Auth API', () => {
  test.skip(!env.project.testsEnabled, 'Gerçek proje API testleri kapalı. Çalıştırmak için PROJECT_TESTS_ENABLED=true yap.');

  test('login returns success and stores auth token for later requests', async ({ projectRequest }) => {
    const authClient = new ProjectAuthClient(projectRequest);
    const loginPayload = createProjectLoginPayload();

    logApiRequest('POST', endpoints.project.auth.login, loginPayload);

    const response = await authClient.login(loginPayload);

    expectOkResponse(response);

    const body = await readJson(response);
    logApiResponse(response, body);

    const token = extractProjectAuthToken(body);
    cacheProjectAuthToken(token);

    expect(token.trim().length).toBeGreaterThan(0);
  });
});
