import { env } from '../../../src/config/env';

/**
 * Gerçek proje auth endpoint'i için login request body üretir.
 *
 * Curl karşılığı:
 * {
 *   "userName": "...",
 *   "password": "..."
 * }
 *
 * Gerçek credential bu dosyaya yazılmaz.
 * Varsayılan değerler `.env` içindeki PROJECT_AUTH_USERNAME ve PROJECT_AUTH_PASSWORD alanlarından gelir.
 */
export function createProjectLoginPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  if (!env.project.auth.username || !env.project.auth.password) {
    throw new Error('Login payload oluşturmak için PROJECT_AUTH_USERNAME ve PROJECT_AUTH_PASSWORD set edilmeli.');
  }

  return {
    userName: env.project.auth.username,
    password: env.project.auth.password,
    ...overrides
  };
}
