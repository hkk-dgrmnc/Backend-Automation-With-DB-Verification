export function createPostPlatformPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    "ad": "PLATFORM TEST 17",
    "musteriKartiId": "fcf358e9-7096-4ff1-89a0-dd586d9d51fe",
    "cariKartiId": "84815061-6af4-414a-8200-4f1fbbfeff6e",
    ...overrides
  };
}
