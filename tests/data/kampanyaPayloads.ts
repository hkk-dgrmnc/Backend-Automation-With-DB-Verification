/**
 * Kampanya endpoint'leri için body payload datası bu dosyada hazırlanır.
 *
 * - Default değerler tek yerde yönetilir.
 * - Test sadece değiştirmek istediği alanları override eder.
 *
 * Not: `kampanyaKategoriAdi` testte testDataGenerator ile üretilen random
 * bir değerle override edilir; sabit default yalnızca yedektir.
 */
export function addKampanyaKategoriPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    "kampanyaKategoriAdi": "Eğitime Destek Kampanyası",
    ...overrides
  };
}
