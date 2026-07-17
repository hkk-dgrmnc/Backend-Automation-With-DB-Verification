import { env } from '../../src/config/env';

/**
 * Auth endpoint'i için login request body üretir.
 *
 * Curl karşılığı:
 * {
 *   "userName": "...",
 *   "password": "..."
 * }
 *
 * Gerçek credential bu dosyaya yazılmaz.
 * Varsayılan değerler `.env` içindeki AUTH_USERNAME ve AUTH_PASSWORD alanlarından gelir.
 */
export function loginPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  if (!env.auth.username || !env.auth.password) {
    throw new Error('Login payload oluşturmak için AUTH_USERNAME ve AUTH_PASSWORD set edilmeli.');
  }

  return {
    userName: env.auth.username,
    password: env.auth.password,
    ...overrides
  };
}
