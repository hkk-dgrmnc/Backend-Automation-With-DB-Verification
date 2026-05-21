/**
 * Bu dosya example/product domain'i için request body builder örneklerini içerir.
 *
 * Önerilen kullanım:
 * - Aynı domain'e ait payload'ları aynı dosyada tut.
 * - Product create, product update ve product negative payload'ları burada olabilir.
 * - User, order, auth gibi farklı domain'ler için ayrı dosya aç.
 *
 * Gerçek projede dosya adını domain'e göre değiştirmek daha okunur olur:
 * - productPayloads.ts
 * - userPayloads.ts
 * - orderPayloads.ts
 *
 * Bu dosyanın sorumluluğu sadece plain JSON body üretmektir.
 * Burada API çağrısı yapılmaz, database bağlantısı kurulmaz, assertion yazılmaz.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergePayload(defaultPayload: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const mergedPayload = { ...defaultPayload };

  for (const [key, overrideValue] of Object.entries(overrides)) {
    const defaultValue = mergedPayload[key];

    if (isPlainObject(defaultValue) && isPlainObject(overrideValue)) {
      mergedPayload[key] = mergePayload(defaultValue, overrideValue);
      continue;
    }

    mergedPayload[key] = overrideValue;
  }

  return mergedPayload;
}

export function createProductPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  /**
   * Create senaryosu için geçerli ürün body örneği.
   *
   * Testte kullanım:
   * const payload = createProductPayload();
   *
   * Sadece belirli alanları değiştirmek için:
   * const payload = createProductPayload({ price: 149.99, category: 'jewelery' });
   */
  const defaultPayload = {
    title: `API Automation Product ${Date.now()}`,
    price: 99.99,
    description: 'Created from API automation framework',
    image: 'https://example.com/product.png',
    category: 'electronics'
  };

  return mergePayload(defaultPayload, overrides);
}

export function updateProductPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  /**
   * PUT/PATCH update senaryoları için geçerli ürün body örneği.
   *
   * Testte kullanım:
   * const payload = updateProductPayload({ title: 'Updated test product' });
   *
   * Create payload'ından ayrı tutulmasının nedeni:
   * - Update sırasında farklı default değerler kullanmak isteyebiliriz.
   * - Test raporunda create ve update datasını ayırt etmek kolaylaşır.
   */
  const defaultPayload = {
    title: `Updated API Automation Product ${Date.now()}`,
    price: 199.99,
    description: 'Updated from API automation framework',
    image: 'https://example.com/updated-product.png',
    category: 'electronics'
  };

  return mergePayload(defaultPayload, overrides);
}

export function invalidProductPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  /**
   * Negatif test senaryoları için bilerek hatalı ürün body örneği.
   *
   * Testte kullanım:
   * const payload = invalidProductPayload({ price: -100 });
   *
   * Not:
   * Bu örnek Fake Store API gerçek validation dönmediği için mevcut testlerde kullanılmıyor.
   * Kendi backend'in validation hatası döndürüyorsa 400/422 gibi kontrollerde kullanabilirsin.
   */
  const defaultPayload = {
    title: '',
    price: -1,
    description: '',
    image: 'not-a-valid-url',
    category: ''
  };

  return mergePayload(defaultPayload, overrides);
}

export function createProductWithNestedDetailsPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  /**
   * İç içe JSON body örneği.
   *
   * Bu yapı gerçek projelerde sık görülür:
   * - stok bilgisi nested object içinde olabilir.
   * - ölçü bilgisi nested object içinde olabilir.
   * - metadata veya feature flag alanları nested object içinde olabilir.
   *
   * Sadece belirli nested alanı değiştirmek için:
   * const payload = createProductWithNestedDetailsPayload({
   *   details: {
   *     stock: {
   *       quantity: 25
   *     }
   *   }
   * });
   *
   * Bu kullanım sadece `details.stock.quantity` alanını değiştirir.
   * `details.stock.warehouseCode`, `details.dimensions` ve diğer default alanlar korunur.
   *
   * Not:
   * Object alanları deep merge edilir.
   * Array alanları merge edilmez; override verilirse array komple değiştirilir.
   */
  const defaultPayload = {
    title: `Nested API Automation Product ${Date.now()}`,
    price: 249.99,
    description: 'Created with nested JSON body from API automation framework',
    image: 'https://example.com/nested-product.png',
    category: 'electronics',
    details: {
      stock: {
        quantity: 10,
        warehouseCode: 'TR-IST-01'
      },
      dimensions: {
        width: 20,
        height: 10,
        depth: 5,
        unit: 'cm'
      },
      warranty: {
        period: 24,
        unit: 'month'
      }
    },
    metadata: {
      source: 'api-automation',
      tags: ['smoke', 'nested-payload'],
      attributes: {
        fragile: false,
        returnable: true
      }
    }
  };

  return mergePayload(defaultPayload, overrides);
}
