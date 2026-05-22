# Backend Automation With Database Verification

TypeScript + Playwright Test tabanli API automation projesidir.

Bu repo tek backend projesi icin ilerler. Eski `example` domain dosyalari ve gereksiz ic ice klasorler kaldirilmistir.

## Temel Komutlar

```bash
npm install
npm run typecheck
npm test
```

Gercek API testleri varsayilan olarak kapali gelir:

```env
TESTS_ENABLED=false
```

Gercek API'ye istek atmak icin `.env` dosyasinda bunu acmak gerekir:

```env
TESTS_ENABLED=true
BASE_URL=https://dev-mys.ptt.gov.tr
AUTH_USERNAME=
AUTH_PASSWORD=
```

## Proje Yapisi

Tek proje kullanildigi icin dosyalar dogrudan ana klasorlerde tutulur:

```txt
src/clients/
tests/
tests/data/
tests/fixtures/
```

Yeni domain eklerken ayni pattern korunur:

```txt
src/clients/<domain>Client.ts
tests/<domain>.spec.ts
tests/data/<domain>Payloads.ts
tests/data/<domain>Params.ts
```

## Endpoint Kurali

Endpoint path'leri sadece `src/config/endpoints.ts` icinde tutulur.

Test veya client dosyalarinda full URL yazilmaz.

Dogru kullanim:

```ts
endpoints.auth.login;
endpoints.musteriKarti.getAllWithPaging(params);
```

Base URL `.env` uzerinden gelir:

```env
BASE_URL=https://dev-mys.ptt.gov.tr
```

## Client Kurali

Client dosyalari sadece request atar ve `APIResponse` dondurur.

Client icinde sunlar bulunmaz:

- assertion
- business validation
- database query
- payload uretimi
- raw credential

## Test Data Kurali

Request body gerekiyorsa:

```txt
tests/data/<domain>Payloads.ts
```

Query param gerekiyorsa:

```txt
tests/data/<domain>Params.ts
```

Test data dosyalari sadece plain JSON body veya query param objesi uretir.

Bu dosyalarda API cagrisi, database baglantisi veya assertion bulunmaz.

## Test Kurali

Spec dosyalari business akisini yonetir:

1. payload veya query params hazirlanir
2. gerekiyorsa token/header alinir
3. client ile API cagrisi yapilir
4. response status kontrol edilir
5. response body plain JSON olarak okunur
6. gerekli alanlar assert edilir

## Token Kullanimi

Token yonetimi:

```txt
src/utils/tokenManager.ts
```

Login testi token'i response icinden cikarip cache'e koyabilir.

Diger testler token header almak icin sunu kullanir:

```ts
getAuthorizationHeaders(apiRequest);
```

## Database Verification

Database core altyapisi korunur:

```txt
src/config/dbConfig.ts
src/database/dbClient.ts
```

Bu proje database'i test etmez. Database sadece API sonucu veya API isleminin persistence durumunu dogrulamak icin kullanilir.

Gercek database verification eklenecegi zaman dosyalar domain bazli acilir:

```txt
src/database/queries/<domain>Queries.ts
src/database/repositories/<domain>Repository.ts
tests/<domain>DatabaseVerification.spec.ts
```

Kurallar:

- Test dosyasinda raw SQL yazilmaz.
- Test dosyasinda database connection olusturulmaz.
- SQL sadece `src/database/queries` altinda olur.
- Repository sadece database query calistirir.
- Repository API cagrisi yapmaz.
- API client database query calistirmaz.

## Logging

Loglar varsayilan olarak kapali gelir:

```env
LOG_LEVEL=silent
```

Debug log icin:

```bash
LOG_LEVEL=debug LOG_PAYLOADS=false npm test
```

Body ve database row iceriklerini de gormek icin:

```bash
LOG_LEVEL=debug LOG_PAYLOADS=true LOG_DB_QUERIES=true npm test
```

Hassas alanlar logger tarafindan maskelenir.
