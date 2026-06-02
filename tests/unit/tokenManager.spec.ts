import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';
import { env } from '../../src/config/env';
import { cacheAuthToken, clearAuthToken, getAuthToken, getCachedAuthToken } from '../../src/utils/tokenManager';

function createJwt(expiresAtSeconds: number) {
  const payload = Buffer.from(JSON.stringify({ exp: expiresAtSeconds })).toString('base64url');
  return `header.${payload}.signature`;
}

test.describe('Token manager', () => {
  test.afterEach(() => {
    clearAuthToken();
  });

  test('returns a cached JWT token while it is valid', () => {
    const token = createJwt(Math.floor(Date.now() / 1000) + 3600);

    cacheAuthToken(token);

    expect(getCachedAuthToken()).toBe(token);
  });

  test('discards an expired JWT token', () => {
    const token = createJwt(Math.floor(Date.now() / 1000) - 60);

    cacheAuthToken(token);

    expect(getCachedAuthToken()).toBeUndefined();
  });

  test('shares an in-flight token request', async () => {
    const originalUsername = env.auth.username;
    const originalPassword = env.auth.password;
    const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
    let loginCount = 0;
    let releaseLogin!: () => void;
    const loginGate = new Promise<void>((resolve) => {
      releaseLogin = resolve;
    });
    const request = {
      post: async () => {
        loginCount += 1;
        await loginGate;

        return {
          ok: () => true,
          status: () => 200,
          json: async () => ({ token })
        } as APIResponse;
      }
    } as unknown as APIRequestContext;

    env.auth.username = 'unit-test-user';
    env.auth.password = 'unit-test-password';

    try {
      const firstToken = getAuthToken(request);
      const secondToken = getAuthToken(request);

      expect(loginCount).toBe(1);

      releaseLogin();

      expect(await Promise.all([firstToken, secondToken])).toEqual([token, token]);
      expect(loginCount).toBe(1);
    } finally {
      env.auth.username = originalUsername;
      env.auth.password = originalPassword;
    }
  });
});
