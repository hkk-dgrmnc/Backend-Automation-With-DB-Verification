import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';
import { env } from '../../src/config/env';
import {
  cacheAuthToken,
  clearAuthToken,
  extractAuthToken,
  getAuthToken,
  getCachedAuthToken
} from '../../src/utils/tokenManager';

function createJwt(expiresAtSeconds: number) {
  const payload = Buffer.from(JSON.stringify({ exp: expiresAtSeconds })).toString('base64url');
  return `header.${payload}.signature`;
}

test.describe('Token manager', () => {
  const originalUsername = env.auth.username;
  const originalPassword = env.auth.password;

  test.afterEach(() => {
    // env.auth mutasyonu timeout/hata durumunda bile geri alinir; sahte
    // credential ayni worker'daki sonraki testlere sizamaz.
    env.auth.username = originalUsername;
    env.auth.password = originalPassword;
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

  test('discards a JWT token expiring within the expiry skew', () => {
    // Skew kadar (veya daha az) omru kalan token kullanilabilir sayilmamali.
    const expiresInSeconds = Math.floor(env.auth.tokenExpirySkewMs / 1000 / 2);
    const token = createJwt(Math.floor(Date.now() / 1000) + expiresInSeconds);

    cacheAuthToken(token);

    expect(getCachedAuthToken()).toBeUndefined();
  });

  test('caches an opaque token using the TTL fallback', () => {
    // exp claim'i olmayan (JWT olmayan) token'da tokenCacheTtlMs devreye girer.
    cacheAuthToken('opaque-token-value');

    expect(getCachedAuthToken()).toBe('opaque-token-value');
  });

  test('extracts the token from known response fields', () => {
    expect(extractAuthToken({ token: 't1' })).toBe('t1');
    expect(extractAuthToken({ accessToken: 't2' })).toBe('t2');
    expect(extractAuthToken({ access_token: 't3' })).toBe('t3');
    expect(extractAuthToken({ data: { token: 't4' } })).toBe('t4');
    expect(() => extractAuthToken({ message: 'no token here' })).toThrow('token bulunamadı');
    expect(() => extractAuthToken(undefined)).toThrow('token bulunamadı');
  });

  test('shares an in-flight token request', async () => {
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

    const firstToken = getAuthToken(request);
    const secondToken = getAuthToken(request);

    try {
      expect(loginCount).toBe(1);
    } finally {
      // Assertion basarisiz olsa bile gate serbest birakilir; askida promise kalmaz.
      releaseLogin();
    }

    expect(await Promise.all([firstToken, secondToken])).toEqual([token, token]);
    expect(loginCount).toBe(1);
  });

  test('retries with a fresh login after a failed one', async () => {
    const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
    let loginCount = 0;
    const request = {
      post: async () => {
        loginCount += 1;

        if (loginCount === 1) {
          return {
            ok: () => false,
            status: () => 500,
            text: async () => 'internal error'
          } as APIResponse;
        }

        return {
          ok: () => true,
          status: () => 200,
          json: async () => ({ token })
        } as APIResponse;
      }
    } as unknown as APIRequestContext;

    env.auth.username = 'unit-test-user';
    env.auth.password = 'unit-test-password';

    // Basarisiz login hata firlatir, pending istegi temizler...
    await expect(getAuthToken(request)).rejects.toThrow('Token request başarısız oldu');

    // ...ve sonraki cagri takilip kalmadan yeni bir login tetikleyebilir.
    expect(await getAuthToken(request)).toBe(token);
    expect(loginCount).toBe(2);
  });
});
