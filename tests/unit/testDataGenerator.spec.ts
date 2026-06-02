import { expect, test } from '@playwright/test';
import * as testDataGenerator from '../../src/utils/testDataGenerator';

test.describe('Test data generator', () => {
  test('generates the requested total word count without underscores', () => {
    const value = testDataGenerator.generateTestString('Otomasyon Kampanya', 4, 6);
    const words = value.split(' ');

    expect(words).toHaveLength(4);
    expect(words.slice(0, 2)).toEqual(['Otomasyon', 'Kampanya']);
    expect(words.slice(2)).toEqual([expect.stringMatching(/^[a-z]{6}$/), expect.stringMatching(/^[a-z]{6}$/)]);
    expect(value).not.toContain('_');
  });

  test('normalizes spaces in the starting text', () => {
    expect(testDataGenerator.generateTestString('  Otomasyon   Kampanya  ', 2, 5)).toBe('Otomasyon Kampanya');
  });

  test('rejects an invalid total word count', () => {
    expect(() => testDataGenerator.generateTestString('Otomasyon Kampanya', 1, 5)).toThrow(
      'totalWordCount en az 2 olmali.'
    );
  });
});
