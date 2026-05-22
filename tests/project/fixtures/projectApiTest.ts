import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { env } from '../../../src/config/env';
import { expect, test as base } from '../../fixtures/apiTest';

export const test = base.extend<{ projectRequest: APIRequestContext }>({
  projectRequest: async ({}, use) => {
    const context = await playwrightRequest.newContext({
      baseURL: env.project.baseUrl,
      extraHTTPHeaders: {
        accept: '*/*'
      }
    });

    await use(context);
    await context.dispose();
  }
});

export { expect };
