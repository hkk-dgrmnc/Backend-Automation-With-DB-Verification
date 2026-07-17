/**
 * Platform endpoint'leri için body payload datası bu dosyada hazırlanır.
 *
 * - Default değerler tek yerde yönetilir.
 * - Test sadece değiştirmek istediği alanları override eder.
 *
 * Not: `ad` testte testDataGenerator ile üretilen random bir değerle override
 * edilir; sabit default yalnızca yedektir.
 *
 * Not: `musteriKartiId` ve `cariKartiId` hedef ortamda var olan, geçerli
 * kayıtların UUID'leri olmalıdır. Şu an sabit (static) değerler kullanılır.
 * İleride bu değerler DB'den veya başka bir istekten alınmak istenirse test
 * içinde override edilebilir:
 *   createPlatformPayload({ musteriKartiId: fetchedId })
 */
export function createPlatformPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    "ad": "PLATFORM TEST 17",
    "musteriKartiId": "fcf358e9-7096-4ff1-89a0-dd586d9d51fe",
    "cariKartiId": "84815061-6af4-414a-8200-4f1fbbfeff6e",
    ...overrides
  };
}
