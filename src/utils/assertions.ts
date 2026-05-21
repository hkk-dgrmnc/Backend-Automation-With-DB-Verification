import { expect, type APIResponse } from '@playwright/test';

/**
 * API response status code'unun beklenen değer olduğunu doğrular.
 * Örnek: GET /products/1 çağrısı başarılı olmalıysa `expectStatus(response, 200)` kullanılır.
 */
export function expectStatus(response: APIResponse, expectedStatus: number) {
  expect(response.status()).toBe(expectedStatus);
}

/**
 * API response'un Playwright'e göre başarılı olduğunu doğrular.
 * Playwright `response.ok()` için 200-299 aralığını başarılı kabul eder.
 * Örnek: exact status önemli değil, sadece başarılı cevap bekleniyorsa `expectOkResponse(response)` kullanılır.
 */
export function expectOkResponse(response: APIResponse) {
  expect(response.ok()).toBeTruthy();
}

/**
 * API response header değerinin beklenen text'i içerdiğini doğrular.
 * Örnek: JSON cevap bekleniyorsa `expectHeaderContains(response, 'content-type', 'application/json')` kullanılır.
 * Header adı küçük/büyük harfe duyarlı olmayacak şekilde kontrol edilir.
 */
export function expectHeaderContains(response: APIResponse, headerName: string, expectedValue: string) {
  const headerValue = response.headers()[headerName.toLowerCase()];
  expect(headerValue).toContain(expectedValue);
}

/**
 * Bir response field'ının gerçekten geldiğini doğrular.
 * `undefined` veya `null` değerlerini kabul etmez.
 * Örnek: ürün detayında id zorunluysa `expectFieldDefined(body.id, 'Product id gelmeli')` kullanılır.
 */
export function expectFieldDefined(value: unknown, message?: string) {
  expect(value, message).toBeDefined();
  expect(value, message).not.toBeNull();
}

/**
 * İki değeri deep equality ile karşılaştırır.
 * Object ve array karşılaştırmalarında nested alanları da kontrol eder.
 * Örnek: API'den gelen fiyat database'deki fiyatla aynı olmalıysa `expectFieldsEqual(body.price, dbRow.price)` kullanılır.
 */
export function expectFieldsEqual(actual: unknown, expected: unknown, message?: string) {
  expect(actual, message).toEqual(expected);
}

/**
 * Bir field'ın beklenen primitive JavaScript tipinde olduğunu doğrular.
 * Örnek: title string olmalıysa `expectFieldType(body.title, 'string')` kullanılır.
 * Not: Array için bunu kullanma; array kontrolünde `expectArray` veya `expectNonEmptyArray` kullan.
 */
export function expectFieldType(
  value: unknown,
  expectedType: 'string' | 'number' | 'boolean' | 'object',
  message?: string
) {
  expect(typeof value, message).toBe(expectedType);
}

/**
 * Değerin string olduğunu ve trim sonrası boş kalmadığını doğrular.
 * Örnek: ürün adı boş dönmemeli ise `expectNonEmptyString(body.title)` kullanılır.
 * `"   "` gibi sadece boşluk içeren string'ler başarısız olur.
 */
export function expectNonEmptyString(value: unknown, message?: string) {
  expect(typeof value, message).toBe('string');
  expect((value as string).trim().length, message).toBeGreaterThan(0);
}

/**
 * Değerin geçerli bir number olduğunu doğrular.
 * `NaN`, `Infinity`, string number veya null kabul edilmez.
 * Örnek: price numeric dönmeli ise `expectValidNumber(body.price)` kullanılır.
 */
export function expectValidNumber(value: unknown, message?: string) {
  expect(typeof value, message).toBe('number');
  expect(Number.isFinite(value), message).toBeTruthy();
}

/**
 * Numeric değerin belirli bir minimum ve maksimum aralıkta olduğunu doğrular.
 * Önce değerin geçerli number olduğunu kontrol eder.
 * Örnek: rating 0 ile 5 arasında olmalıysa `expectNumberInRange(body.rating.rate, 0, 5)` kullanılır.
 */
export function expectNumberInRange(value: unknown, min: number, max: number, message?: string) {
  expectValidNumber(value, message);
  expect(value as number, message).toBeGreaterThanOrEqual(min);
  expect(value as number, message).toBeLessThanOrEqual(max);
}

/**
 * Değerin array olduğunu doğrular.
 * Örnek: list endpoint response body array dönüyorsa `expectArray(body)` kullanılır.
 * Array'in dolu olup olmadığını kontrol etmez; sadece tipini kontrol eder.
 */
export function expectArray(value: unknown, message?: string) {
  expect(Array.isArray(value), message).toBeTruthy();
}

/**
 * Değerin array olduğunu ve en az bir eleman içerdiğini doğrular.
 * Örnek: ürün listesi boş dönmemeli ise `expectNonEmptyArray(body)` kullanılır.
 */
export function expectNonEmptyArray(value: unknown, message?: string) {
  expectArray(value, message);
  expect((value as unknown[]).length, message).toBeGreaterThan(0);
}

/**
 * Array uzunluğunun exact olarak beklenen değere eşit olduğunu doğrular.
 * Örnek: limit=5 ile çağrılan endpoint 5 kayıt dönmeli ise `expectArrayLength(body, 5)` kullanılır.
 */
export function expectArrayLength(value: unknown, expectedLength: number, message?: string) {
  expectArray(value, message);
  expect((value as unknown[]).length, message).toBe(expectedLength);
}

/**
 * Plain JSON object üzerinde beklenen alanların bulunduğunu doğrular.
 * Örnek: ürün detayında temel alanlar zorunluysa `expectObjectHasFields(body, ['id', 'title', 'price'])` kullanılır.
 * Bu helper sadece field varlığını kontrol eder; field değerlerinin doğru olup olmadığını kontrol etmez.
 */
export function expectObjectHasFields(body: unknown, fieldNames: string[], message?: string) {
  expect(body, message).toBeTruthy();
  expect(typeof body, message).toBe('object');
  expect(Array.isArray(body), message).toBeFalsy();

  for (const fieldName of fieldNames) {
    expect(body, message).toHaveProperty(fieldName);
  }
}

/**
 * Plain JSON object içindeki tek bir field'ın beklenen değere eşit olduğunu doğrular.
 * Örnek: response id'si beklenen id ile aynı olmalıysa `expectObjectFieldEquals(body, 'id', 1)` kullanılır.
 * Database verification sırasında `expectObjectFieldEquals(body, 'title', dbRow.title)` şeklinde de kullanılabilir.
 */
export function expectObjectFieldEquals(
  body: Record<string, unknown>,
  fieldName: string,
  expectedValue: unknown,
  message?: string
) {
  expect(body, message).toHaveProperty(fieldName);
  expect(body[fieldName], message).toEqual(expectedValue);
}

/**
 * Değerin izin verilen değer listesi içinde olduğunu doğrular.
 * Örnek: order status sadece belirli state'lerden biri olmalıysa `expectOneOf(body.status, ['CREATED', 'PAID', 'CANCELLED'])` kullanılır.
 */
export function expectOneOf<T>(actual: T, expectedValues: T[], message?: string) {
  expect(expectedValues, message).toContain(actual);
}

/**
 * String değerin parse edilebilir bir tarih formatında olduğunu doğrular.
 * Örnek: createdAt alanı tarih olarak gelmeli ise `expectIsoDateString(body.createdAt)` kullanılır.
 * Bu helper tarih değerinin business olarak doğru zaman olup olmadığını değil, parse edilebilir olduğunu kontrol eder.
 */
export function expectIsoDateString(value: unknown, message?: string) {
  expectNonEmptyString(value, message);

  const parsedTime = Date.parse(value as string);
  expect(Number.isNaN(parsedTime), message).toBeFalsy();
}
