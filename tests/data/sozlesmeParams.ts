/**
 * Sozlesme endpoint'leri için query param datası bu dosyada hazırlanır.
 *
 * GetByIdWithAllRelations tek bir `id` (UUID) query param alır.
 * - Test dosyasında sabit query değerleri dağınık durmaz.
 * - Default değer tek yerde yönetilir.
 * - Test sadece değiştirmek istediği parametreyi override eder.
 *
 * Not: `id` var olan, geçerli bir sözleşme UUID'si olmalıdır. Şu an sabit
 * (static) bir değer kullanılır. İleride bu değer DB'den veya başka bir
 * istekten alınmak istenirse test içinde override edilebilir:
 *   getByIdWithAllRelationsParams({ id: fetchedId })
 *
 * Curl karşılığı:
 * ?id=914ea535-dce6-4954-aede-6dd44617e9ac
 */
export function getByIdWithAllRelationsParams(
  overrides: Record<string, string> = {}
): Record<string, string> {
  return {
    id: '914ea535-dce6-4954-aede-6dd44617e9ac',
    ...overrides
  };
}
