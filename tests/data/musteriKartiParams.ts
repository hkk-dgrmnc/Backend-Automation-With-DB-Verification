/**
 * Musteri Karti endpoint'leri için query param datası bu dosyada hazırlanır.
 *
 * Body payload'larda kullandığımız pattern ile aynı mantık geçerlidir:
 * - Test dosyasında sabit query değerleri dağınık durmaz.
 * - Default değerler tek yerde yönetilir.
 * - Test sadece değiştirmek istediği parametreleri override eder.
 *
 * Curl karşılığı:
 * ?PageSize=10&Page=1
 */
export function getAllMusteriKartiPagingParams(
  overrides: Record<string, number | string> = {}
): Record<string, number | string> {
  return {
    pageSize: 10,
    page: 1,
    ...overrides
  };
}
