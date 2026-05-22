# Backend Automation With Database Verification

TypeScript + Playwright Test tabanli API automation projesidir.

Bu repo artik sadece gercek proje akisina gore ilerler. Eski `example` domain dosyalari bilerek kaldirildi.

## Temel Komutlar

```bash
npm install
npm run typecheck
npm test
```

Gercek proje API testleri varsayilan olarak kapali gelir:

```env
PROJECT_TESTS_ENABLED=false
```

Gercek API'ye istek atmak icin `.env` dosyasinda bunu acmak gerekir:

```env
PROJECT_TESTS_ENABLED=true
PROJECT_BASE_URL=https://dev-mys.ptt.gov.tr
PROJECT_AUTH_USERNAME=
PROJECT_AUTH_PASSWORD=
```

## Proje Yapisi

Gercek proje dosyalari `project` altinda tutulur:

```txt
src/clients/project/
tests/project/
tests/project/data/
tests/project/fixtures/
```

Yeni domain eklerken ayni pattern korunur:

```txt
src/clients/project/<domain>Client.ts
tests/project/<domain>.spec.ts
tests/project/data/<domain>Payloads.ts
tests/project/data/<domain>Params.ts
```

## Endpoint Kurali

Endpoint path'leri sadece `src/config/endpoints.ts` icinde tutulur.

Test veya client dosyalarinda full URL yazilmaz.

Dogru kullanim:

```ts
endpoints.project.auth.login
```

Base URL `.env` uzerinden gelir:

```env
PROJECT_BASE_URL=https://dev-mys.ptt.gov.tr
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
tests/project/data/<domain>Payloads.ts
```

Query param gerekiyorsa:

```txt
tests/project/data/<domain>Params.ts
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

Project token yonetimi:

```txt
src/utils/projectTokenManager.ts
```

Login testi token'i response icinden cikarip cache'e koyabilir.

Diger testler token header almak icin sunu kullanir:

```ts
getProjectAuthorizationHeaders(projectRequest)
```

## Database Verification

Database core altyapisi korunur:

```txt
src/config/dbConfig.ts
src/database/dbClient.ts
```

Bu proje database'i test etmez. Database sadece API sonucu veya API isleminin persistence durumunu dogrulamak icin kullanilir.

Gercek DB verification eklenecegi zaman dosyalar domain bazli acilir:

```txt
src/database/queries/project/<domain>Queries.ts
src/database/repositories/project/<domain>Repository.ts
tests/project/<domain>DatabaseVerification.spec.ts
```

Kurallar:

- Test dosyasinda raw SQL yazilmaz.
- Test dosyasinda database connection olusturulmaz.
- SQL sadece `src/database/queries/project` altinda olur.
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
