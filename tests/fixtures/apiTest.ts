import { expect, test as base, type APIRequestContext } from '@playwright/test';
import { closeDbPool } from '../../src/database/dbClient';
import * as logger from '../../src/utils/logger';

export const test = base.extend<
  { logContext: void; apiRequest: APIRequestContext },
  { dbPoolCleanup: void }
>({
  logContext: [
    async ({}, use, testInfo) => {
      logger.setTestLogContext(testInfo);

      try {
        await use();
      } finally {
        logger.clearTestLogContext();
      }
    },
    { auto: true }
  ],

  // Playwright'in yerlesik request fixture'ini kullanir; baseURL ve varsayilan
  // header'lar tek kaynaktan (playwright.config.ts use blogu) gelir.
  apiRequest: async ({ request }, use) => {
    await use(request);
  },

  // Worker kapanirken database pool'unu kapatir. Database verification
  // kullanilmadiysa closeDbPool hicbir sey yapmaz. Kapanis hatasi test
  // sonuclarini kirletmesin diye yutulur ve yalnizca loglanir.
  dbPoolCleanup: [
    async ({}, use) => {
      await use();

      try {
        await closeDbPool();
      } catch (error) {
        logger.logError('DATABASE POOL KAPATILAMADI', error);
      }
    },
    { scope: 'worker', auto: true }
  ]
});

export { expect };
