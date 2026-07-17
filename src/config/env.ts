import { getBooleanEnv, getEnumEnv, getNumberEnv, getStringEnv } from './configReader';

const logLevels = ['silent', 'error', 'warn', 'info', 'debug'] as const;

export const env = {
  baseUrl: getStringEnv('BASE_URL', 'https://api.example.local'),
  testTimeoutMs: getNumberEnv('TEST_TIMEOUT_MS', 30000, 1),
  testsEnabled: getBooleanEnv('TESTS_ENABLED', false),
  isCi: getBooleanEnv('CI', false),
  logging: {
    level: getEnumEnv('LOG_LEVEL', logLevels, 'silent'),
    includePayloads: getBooleanEnv('LOG_PAYLOADS', false),
    includeDbQueries: getBooleanEnv('LOG_DB_QUERIES', false),
    maxBodyLength: getNumberEnv('LOG_MAX_BODY_LENGTH', 4000, 1)
  },
  auth: {
    username: getStringEnv('AUTH_USERNAME'),
    password: getStringEnv('AUTH_PASSWORD'),
    tokenCacheTtlMs: getNumberEnv('AUTH_TOKEN_CACHE_TTL_MS', 300000, 1),
    tokenExpirySkewMs: getNumberEnv('AUTH_TOKEN_EXPIRY_SKEW_MS', 30000, 0)
  }
};
