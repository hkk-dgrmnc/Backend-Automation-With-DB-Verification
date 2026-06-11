# MYS Backend API Automation Framework

## Kisa Ozet

Bu proje, MYS backend servisleri icin hazirlanmis TypeScript + Playwright Test
tabanli API automation framework'udur. Framework, API endpoint'lerinin beklenen
status ve response davranisini dogrular; gerekli oldugunda API sonucunu
PostgreSQL uzerindeki kalici veriyle karsilastirarak database verification
yapar.

Ana hedef, backend API testlerini standart, tekrar calistirilabilir, bakimi kolay
ve genisletilebilir bir yapiya almaktir.

## Projenin Amaci

Proje su ihtiyaclari karsilar:

- Backend API endpoint'leri icin otomatik test altyapisi saglamak.
- Testlerde ortak endpoint, token, logging ve assertion yapisi kullanmak.
- Gercek API ortamlarina kontrolsuz istek atilmasini engellemek.
- Kritik business akislarinda API sonucunu database kaydiyla dogrulamak.
- Yeni endpoint testlerinin ayni proje standardiyla hizli eklenmesini saglamak.

Bu proje database'i dogrudan test etmek icin kullanilmaz. Database katmani,
yalnizca API sonucunun kalici veriyle uyumlu olup olmadigini dogrulamak icin
kullanilir.

## Kapsam

Mevcut test domain'leri:

- Auth
- Musteri Karti
- Kampanya
- Platform
- Sozlesme

Framework yeni backend domain'leri eklendikce ayni klasor ve sorumluluk ayrimi
ile genisletilebilir.

## Kullanilan Teknolojiler

- TypeScript
- Playwright Test
- Playwright APIRequestContext
- Playwright expect
- PostgreSQL `pg` client
- dotenv

Projede ORM, DTO, POJO veya response model class yapilari kullanilmaz. API
cevaplari plain JSON olarak okunur ve dogrulama test katmaninda yapilir.

## Mimari Yaklasim

Proje sorumluluklari net ayiran basit bir yapi izler:

- `src/config`: Environment, endpoint ve database konfigurasyonlari.
- `src/clients`: Domain bazli API client'lari.
- `src/utils`: Token, logger, response ve assertion helper'lari.
- `src/database`: Database verification icin query ve repository katmani.
- `tests/data`: Payload ve query param ureten test data factory'leri.
- `tests/specs`: API test senaryolari.
- `tools/api-test-generator`: cURL'den test taslagi ureten yerel arac.

Endpoint path'leri tek merkezde tutulur. Test ve client dosyalarinda full URL
yazilmaz. Base URL environment uzerinden gelir.

## Test Akisi

Tipik bir API testi su adimlari izler:

1. Payload veya query parametreleri hazirlanir.
2. Endpoint auth istiyorsa token manager uzerinden authorization header alinir.
3. Domain client'i ile API istegi gonderilir.
4. Response status kontrol edilir.
5. Response body plain JSON olarak okunur.
6. Business icin gerekli alanlar assert edilir.
7. Gerekiyorsa response database sonucu ile karsilastirilir.

Client katmani sadece request atar ve response dondurur. Assertion, business
validation veya database sorgusu client icinde bulunmaz.

## Gercek API Testlerini Calistirma

Gercek API testleri varsayilan olarak kapali gelir:

```env
TESTS_ENABLED=false
```

Calistirmak icin `.env` dosyasinda asagidaki degerler set edilir:

```env
TESTS_ENABLED=true
BASE_URL=https://dev-mys.ptt.gov.tr
AUTH_USERNAME=
AUTH_PASSWORD=
```

Temel komutlar:

```bash
npm install
npm run typecheck
npm test
```

## Token Yonetimi

Authentication tekrarini onlemek icin token islemleri merkezi helper uzerinden
yapilir. Login response'undan token alinir, cache'lenir ve sonraki testlerde
authorization header olarak kullanilir.

JWT token'larda son kullanma zamani token icindeki `exp` alanindan okunur. JWT
olmayan token'larda `.env` icindeki cache TTL degeri kullanilir.

## Database Verification Yaklasimi

Database verification sadece API testini anlamli bicimde guclendirdigi durumlarda
eklenir:

- Create islemlerinin database'de kayit olusturdugunu dogrulamak.
- Update islemlerinde ilgili alanlarin guncellendigini dogrulamak.
- Delete veya pasiflestirme islemlerinde beklenen kalici durumun olustugunu
  dogrulamak.
- Kritik business akislarinda API response ile database degerlerini
  karsilastirmak.

Test dosyalarinda raw SQL veya database connection bulunmaz. SQL ifadeleri
`src/database/queries`, database erisim metotlari ise
`src/database/repositories` altinda tutulur.

## Logging ve Guvenlik

Loglar varsayilan olarak kapali gelir:

```env
LOG_LEVEL=silent
```

Debug ihtiyacinda log seviyesi acilabilir. Request/response body ve database row
icerikleri ancak bilerek `LOG_PAYLOADS=true` ve `LOG_DB_QUERIES=true` yapilirsa
yazilir.

Authorization, token, password, cookie, secret ve API key gibi hassas alanlar
logger tarafindan maskelenir.

## API Test Generator

Projede cURL komutundan framework standardina uygun test taslagi uretebilen
yerel bir generator bulunur:

```bash
npm run generate:api-test
```

Generator endpoint, client metodu, test data dosyalari ve basarili status
assertion'i iceren spec taslagini olusturur. Internet, yapay zeka servisi veya
API key kullanmaz.

## Bakim Kurallari

Yeni endpoint veya domain eklenirken su standart korunur:

- Endpoint path'i `src/config/endpoints.ts` icine eklenir.
- API istegi domain client'i icinde tanimlanir.
- Payload ve query parametreleri `tests/data` altinda uretilir.
- Assertion ve business dogrulama spec dosyasinda yapilir.
- Database verification gerekiyorsa query ve repository katmani ayrica eklenir.
- Credential veya full URL kaynak koda yazilmaz.

Bu ayrim, testlerin okunabilir kalmasini ve yeni endpoint'lerin ayni yaklasimla
hizli eklenmesini saglar.
