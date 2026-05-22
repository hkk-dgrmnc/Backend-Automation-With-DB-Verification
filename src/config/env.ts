import { getBooleanEnv, getEnumEnv, getNumberEnv, getStringEnv } from './configReader';

const logLevels = ['silent', 'error', 'warn', 'info', 'debug'] as const;

export const env = {
  baseUrl: getStringEnv('BASE_URL', 'https://fakestoreapi.com'),
  requestTimeoutMs: getNumberEnv('REQUEST_TIMEOUT_MS', 30000, 1),
  isCi: getBooleanEnv('CI', false),
  logging: {
    level: getEnumEnv('LOG_LEVEL', logLevels, 'silent'),
    includePayloads: getBooleanEnv('LOG_PAYLOADS', false),
    includeDbQueries: getBooleanEnv('LOG_DB_QUERIES', false),
    maxBodyLength: getNumberEnv('LOG_MAX_BODY_LENGTH', 4000, 1)
  },
  project: {
    baseUrl: getStringEnv('PROJECT_BASE_URL', 'https://dev-mys.ptt.gov.tr'),
    testsEnabled: getBooleanEnv('PROJECT_TESTS_ENABLED', false),
    auth: {
      username: getStringEnv('PROJECT_AUTH_USERNAME'),
      password: getStringEnv('PROJECT_AUTH_PASSWORD')
    }
  },
  auth: {
    username: getStringEnv('AUTH_USERNAME'),
    password: getStringEnv('AUTH_PASSWORD')
  }
};
