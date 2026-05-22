import { expect, request as playwrightRequest, test as base, type APIRequestContext } from '@playwright/test';
import { env } from '../../src/config/env';
import { clearTestLogContext, setTestLogContext } from '../../src/utils/logger';

export const test = base.extend<{ logContext: void; apiRequest: APIRequestContext }>({
  logContext: [
    async ({}, use, testInfo) => {
      setTestLogContext(testInfo);

      try {
        await use();
      } finally {
        clearTestLogContext();
      }
    },
    { auto: true }
  ],

  apiRequest: async ({}, use) => {
    const context = await playwrightRequest.newContext({
      baseURL: env.baseUrl,
      extraHTTPHeaders: {
        accept: '*/*'
      }
    });

    await use(context);
    await context.dispose();
  }
});

export { expect };
