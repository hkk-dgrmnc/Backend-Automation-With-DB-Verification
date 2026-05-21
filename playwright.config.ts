import { defineConfig } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  timeout: env.requestTimeoutMs,
  retries: env.isCi ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    baseURL: env.baseUrl,
    extraHTTPHeaders: {
      Accept: 'application/json'
    }
  }
});
