export function createAddKampanyaKategoriPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    "kampanyaKategoriAdi": "Eğitime Destek Kampanyası",
    ...overrides
  };
}
