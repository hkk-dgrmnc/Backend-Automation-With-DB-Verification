import { expect, test } from '@playwright/test';
import { expectFieldType, expectIsoDateString } from '../../src/utils/assertions';

test.describe('Assertion helpers', () => {
  test('accepts a plain JSON object as object', () => {
    expectFieldType({ id: 1 }, 'object');
  });

  test('rejects null as object', () => {
    expect(() => expectFieldType(null, 'object')).toThrow();
  });

  test('rejects arrays as object', () => {
    expect(() => expectFieldType([], 'object')).toThrow();
  });

  test('accepts ISO date and timestamp strings', () => {
    expectIsoDateString('2026-06-02');
    expectIsoDateString('2026-06-02T12:34:56.789Z');
    expectIsoDateString('2026-06-02T12:34:56+03:00');
  });

  test('rejects parseable non-ISO date strings', () => {
    expect(() => expectIsoDateString('June 2, 2026')).toThrow();
  });

  test('rejects invalid calendar dates', () => {
    expect(() => expectIsoDateString('2026-02-31T12:34:56Z')).toThrow();
  });
});
