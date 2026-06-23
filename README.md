# MYS Backend API Automation Framework

Bu repo, MYS backend servisleri icin hazirlanmis TypeScript + Playwright Test
tabanli API automation framework'udur. Amac, API endpoint'lerini tekrar
calistirilabilir testlerle dogrulamak ve gerekli durumlarda API sonucunu
PostgreSQL uzerindeki kalici veriyle karsilastirmaktir.

Framework API test automation odaklidir. Database dogrudan test edilmez;
yalnizca API isleminin beklenen veriyi urettigini, guncelledigini veya
korudugunu dogrulamak icin verification katmani olarak kullanilir.

## Kapsam

Mevcut test alanlari:

- Auth
- Musteri Karti
- Kampanya
- Platform
- Sozlesme

Her domain icin hedef yapi aynidir: endpoint tanimi, domain client'i, test data
factory'leri ve Playwright spec dosyalari birbirinden ayrilir.

## Teknoloji Stack'i

- Dil: TypeScript
- Test framework: Playwright Test
- HTTP client: Playwright `APIRequestContext`
- Assertion: Playwright `expect`
- Database client: `pg`
- Environment yonetimi: `dotenv`

ORM, DTO, POJO, response model class'i veya gereksiz response interface'i
kullanilmaz. API response'lari plain JSON olarak okunur ve assertion test
katmaninda yapilir.

## Hizli Baslangic

```bash
npm install
npm run typecheck
npm test
```

Gercek API testleri varsayilan olarak kapali gelir. Bu sayede local veya CI
ortaminda yanlislikla gercek ortama istek atilmaz.

`.env.example` dosyasini `.env` olarak kopyalayip gerekli degerleri doldurun:

```env
TESTS_ENABLED=false
BASE_URL=https://dev-mys.ptt.gov.tr
AUTH_USERNAME=
AUTH_PASSWORD=
```

Gercek API testlerini calistirmak icin:

```env
TESTS_ENABLED=true
```

## Komutlar

```bash
npm test
```

Tum Playwright testlerini calistirir. `TESTS_ENABLED=false` iken gercek API
spec'leri skip edilir, unit testler calismaya devam eder.

```bash
npm run test:api
```

`tests/specs` altindaki API testlerini calistirir.

```bash
npm run test:unit
```

`tests/unit` altindaki helper ve utility unit testlerini calistirir.

```bash
npm run typecheck
```

Ana proje ve `tools/api-test-generator` icin TypeScript tip kontrolu yapar.

```bash
npm run test:generator
```

Yerel API test generator unit testlerini calistirir.

```bash
npm run test:quality
```

CI kalite kapisinda calisan kontrolleri tek komutta calistirir: TypeScript tip
kontrolu, unit testler ve generator testleri.

```bash
npm run report
```

Playwright HTML raporunu acar.

## Proje Yapisi

```txt
src/
  clients/        Domain bazli API client'lari
  config/         Env, endpoint ve database config dosyalari
  database/       Database verification altyapisi
  utils/          Assertion, token, logger ve response helper'lari
tests/
  data/           Payload ve query param factory'leri
  fixtures/       Ortak Playwright fixture'lari
  specs/          API test senaryolari
  unit/           Helper ve utility unit testleri
tools/
  api-test-generator/
```

## Mimari Kurallar

Endpoint path'leri sadece `src/config/endpoints.ts` icinde tutulur. Test veya
client dosyalarinda full URL yazilmaz.

Dogru kullanim:

```ts
endpoints.auth.login;
endpoints.musteriKarti.getAllWithPaging;
```

Base URL `.env` uzerinden gelir:

```env
BASE_URL=https://dev-mys.ptt.gov.tr
```

Client dosyalari yalnizca API request atar ve `APIResponse` dondurur. Client
icinde assertion, database query, business validation, payload uretimi veya raw
credential bulunmaz.

Test data dosyalari sadece request body veya query param objesi uretir:

```txt
tests/data/<domain>Payloads.ts
tests/data/<domain>Params.ts
```

Spec dosyalari business akisindan sorumludur:

1. Payload veya query params hazirlanir.
2. Gerekiyorsa authorization header alinir.
3. Domain client'i ile API cagrisi yapilir.
4. Response status kontrol edilir.
5. Response body plain JSON olarak okunur.
6. Gerekli alanlar veya database verification sonucu assert edilir.

## Token Yonetimi

Token islemleri `src/utils/tokenManager.ts` icinde merkezilestirilir.

Login testi token'i response icinden cikarip cache'e koyabilir. Diger testler
authorization header almak icin su helper'i kullanir:

```ts
getAuthorizationHeaders(apiRequest);
```

Token JWT formatindaysa cache suresi `exp` alanindan okunur. JWT olmayan token
icin `.env` icindeki `AUTH_TOKEN_CACHE_TTL_MS` kullanilir. Token bitimine
`AUTH_TOKEN_EXPIRY_SKEW_MS` kadar sure kaldiginda yeni token alinir.

## Database Verification

Database katmani su dosyalarla baslar:

```txt
src/config/dbConfig.ts
src/database/dbClient.ts
src/database/queries/
src/database/repositories/
```

Database sadece API sonucunu desteklemek icin kullanilir. Test dosyasinda raw
SQL yazilmaz ve test icinde database connection olusturulmaz.

Yeni bir domain icin database verification gerekiyorsa yapi su sekilde
genisletilir:

```txt
src/database/queries/<domain>Queries.ts
src/database/repositories/<domain>Repository.ts
tests/specs/<domain>DatabaseVerification.spec.ts
```

## Logging

Loglar varsayilan olarak kapali gelir:

```env
LOG_LEVEL=silent
LOG_PAYLOADS=false
LOG_DB_QUERIES=false
```

Debug log icin:

```bash
LOG_LEVEL=debug LOG_PAYLOADS=false npm test
```

Request/response body veya database row iceriklerini de gormek icin:

```bash
LOG_LEVEL=debug LOG_PAYLOADS=true LOG_DB_QUERIES=true npm test
```

Logger hassas alanlari maskeleyerek yazar.

## API Test Generator

cURL komutundan framework'e uygun baslangic testi uretmek icin yerel generator
kullanilabilir:

```bash
npm run generate:api-test
```

Generator internete, yapay zeka servisine veya API key'e baglanmaz. Endpoint,
client metodu, gerekli test data dosyalari ve basarili status assertion'i iceren
spec taslagini olusturur.

Detayli kullanim:

```txt
tools/api-test-generator/README.md
```

## Yeni Domain Ekleme Akisi

1. `src/config/endpoints.ts` icine endpoint path'lerini ekle.
2. `src/clients/<domain>Client.ts` dosyasini olustur veya guncelle.
3. Query param gerekiyorsa `tests/data/<domain>Params.ts` ekle.
4. Request body gerekiyorsa `tests/data/<domain>Payloads.ts` ekle.
5. `tests/specs/<domain>.spec.ts` icinde API testini yaz.
6. Database verification gerekiyorsa query ve repository katmanini ayrica ekle.

Her domain'in database verification'a ihtiyaci oldugu varsayilmaz. Once API-only
test yazilir, database verification sadece business olarak anlamli oldugunda
eklenir.

## Confluence Dokumani

Confluence'a proje aciklamasi olarak README'nin birebir kopyasi yerine daha
ozet ve ekip odakli taslak kullanilabilir:

```txt
docs/confluence-project-overview.md
```
