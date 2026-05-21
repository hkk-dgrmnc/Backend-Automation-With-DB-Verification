import { expect, test as base } from '@playwright/test';
import { clearTestLogContext, setTestLogContext } from '../../src/utils/logger';

export const test = base.extend<{ logContext: void }>({
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
  ]
});

export { expect };
