# Backend API Automation Framework

## Genel Bakis

Backend API Automation Framework, farkli backend projelerinde API testlerini
ortak bir standarda almak icin hazirlanmis TypeScript + Playwright Test tabanli
bir otomasyon altyapisidir.

Framework; endpoint, client, test data, assertion, token, logging ve database
verification ihtiyaclarini duzenli bir yapi altinda toplar. Bu sayede yeni API
testleri ayni dille yazilir, mevcut testler daha kolay bakilir ve proje
buyudukce test kodunun dagilmasi engellenir.

Yapi belirli bir backend projesine bagimli olacak sekilde tasarlanmamistir.
Domain, endpoint ve test data katmanlari degistirilerek farkli backend
projelerine entegre edilebilir.

Bu proje sadece API status kontrolu yapan basit bir test seti olarak
tasarlanmamistir. Gereken durumlarda API sonucunu PostgreSQL uzerindeki kalici
veriyle karsilastirarak database verification yapar. Boylece API'nin sadece
cevap donmesi degil, beklenen veriyi gercekten uretmesi, guncellemesi veya
korumasi da kontrol edilebilir.

## Projenin Degeri

| Alan | Katki |
| --- | --- |
| Standartlasma | Endpoint, client, test data, assertion, token ve logging yapisi tek yaklasimla yonetilir. |
| Bakim kolayligi | Her domain ayni klasor ve sorumluluk ayrimi ile buyur. Yeni test eklemek mevcut yapinin kopyasi degil, standardin devami olur. |
| Guvenlik | Credential, token, cookie ve API key gibi hassas degerler kaynak koda yazilmaz; logger hassas alanlari maskeler. |
| Kontrollu calisma | Gercek API testleri varsayilan olarak kapali gelir. Yanlislikla dev/test ortamlarina istek atilmasi engellenir. |
| Veri dogrulama | Kritik islemlerde API response, database uzerindeki kalici veriyle dogrulanabilir. |
| AI destekli bakim | Kurallar `AGENTS.md` icinde tek kaynak olarak tutulur; generator ayni standartta kod uretir. |
| CI kalitesi | Typecheck, unit test ve generator testleri tek kalite kapisi altinda otomatik kosulabilir. |

## Cozulen Problem

Backend API otomasyon projelerinde zamanla en cok gorulen problemler sunlardir:

- Endpoint path'lerinin farkli dosyalara dagilmasi.
- Her testte tekrar eden token, header ve payload hazirlama kodlari.
- Test icinde raw SQL veya dogrudan database connection olusturulmasi.
- Client katmaninda assertion veya business validation bulunmasi.
- Her yeni endpoint icin farkli bir kod yazim stili olusmasi.
- Testlerin buyudukce okunamaz ve bakimi zor hale gelmesi.

Bu framework bu problemleri bastan kurallarla ayirir. Client sadece API request
gonderir, spec dosyasi business assertion yapar, database katmani sadece API
sonucunu dogrulamak icin kullanilir.

## Ornek Uygulama Kapsami

Framework mevcut repo icinde su domain'ler uzerinden orneklenmistir:

| Domain | Kapsam |
| --- | --- |
| Auth | Login ve merkezi token yonetimi |
| Musteri Karti | Listeleme ve isim endpoint kontrolleri |
| Kampanya | Kampanya kategori olusturma akisi |
| Platform | Platform olusturma endpoint testi |
| Sozlesme | ID ile sozlesme detay endpoint kontrolu |

Bu domain'ler framework'un nasil kullanilacagini gosteren mevcut uygulama
ornekleridir. Yeni bir backend projesinde ayni yapi korunarak farkli domain,
endpoint ve test senaryolari eklenebilir.

## Mimari Yaklasim

| Katman | Sorumluluk |
| --- | --- |
| `src/config` | Environment, endpoint ve database konfigurasyonlari |
| `src/clients` | Domain bazli API request metotlari |
| `src/utils` | Token manager, logger, response helper ve assertion helper'lari |
| `src/database` | Database verification icin merkezi db client, query ve repository katmani |
| `tests/data` | Payload ve query param factory'leri |
| `tests/specs` | API test senaryolari ve business assertion'lar |
| `tests/unit` | Helper ve utility unit testleri |
| `tools/api-test-generator` | cURL'den framework standardinda test taslagi ureten yerel arac |

Bu ayrim sayesinde proje buyudukce her dosyanin gorevi net kalir.

## Temel Tasarim Kurallari

- Endpoint path'leri sadece `src/config/endpoints.ts` icinde tutulur.
- Test veya client dosyalarinda full URL yazilmaz.
- Client dosyalari sadece API request atar ve `APIResponse` dondurur.
- Client icinde assertion, database query veya business validation bulunmaz.
- Test dosyalari response status, response body ve business dogrulamalardan sorumludur.
- Testlerde raw SQL veya database connection bulunmaz.
- Database sadece API sonucunu desteklemek icin verification katmani olarak kullanilir.
- DTO, POJO, ORM veya response model class yapilari kullanilmaz.
- API response'lari plain JSON olarak okunur.
- Credential, token, API key ve cookie gibi hassas bilgiler kaynak koda yazilmaz.

## Test Akisi

Tipik bir API testi su sirayla ilerler:

1. Payload veya query parametreleri data factory uzerinden hazirlanir.
2. Endpoint auth istiyorsa token manager uzerinden authorization header alinir.
3. Domain client'i ile API istegi gonderilir.
4. Response status kontrol edilir.
5. Response body plain JSON olarak okunur.
6. Gerekli alanlar assert edilir.
7. Gerekirse API response database sonucu ile karsilastirilir.

Bu akis testleri okunabilir, genisletilebilir ve review edilebilir tutar.

## Database Verification Yaklasimi

Bu proje database'i dogrudan test etmek icin tasarlanmamistir. Database katmani,
yalnizca API davranisinin kalici veriyle uyumunu dogrulamak icin kullanilir.

Database verification su durumlarda anlamlidir:

- Create isleminin database'de kayit olusturdugunu dogrulamak.
- Update isleminin ilgili alanlari guncelledigini dogrulamak.
- Delete veya pasiflestirme isleminin beklenen kalici durumu olusturdugunu dogrulamak.
- Kritik business akislarinda API response ile database degerlerini karsilastirmak.

SQL ifadeleri `src/database/queries` altinda, database erisim metotlari
`src/database/repositories` altinda tutulur. Test dosyasi raw SQL bilmez.

## API Test Generator

Projede cURL komutundan framework standardina uygun baslangic testi ureten yerel
bir generator bulunur:

```bash
npm run generate:api-test
```

Generator sunlari otomatik hazirlar:

- Endpoint tanimi
- Domain client metodu
- Query param veya body icin test data factory
- Basarili status assertion'i iceren spec taslagi
- Merkezi token manager kullanimi
- Hassas header ve body alanlari icin guvenli davranis

Generator internete, yapay zeka servisine veya API key'e baglanmaz. Tamamen
yerel calisir. Ayni endpoint, client metodu, test data fonksiyonu veya spec testi
farkli icerikle zaten varsa dosyalari sessizce ezmez; hata vererek kontrolu
gelistiriciye birakir.

## Kalite Kapisi ve CI

Projede kalite kontrolu tek komut altinda toplanmistir:

```bash
npm run test:quality
```

Bu komut su kontrolleri calistirir:

- TypeScript typecheck
- Unit testler
- API test generator testleri

GitHub Actions uzerinde push ve pull request durumlarinda ayni kalite kapisi
calisacak sekilde workflow hazirlanmistir. Bu sayede framework kurallari sadece
dokumanda kalmaz; kod degisikligi yapildiginda otomatik olarak kontrol edilir.

## Guvenlik ve Loglama

Framework guvenli varsayilanlarla gelir:

```env
TESTS_ENABLED=false
LOG_LEVEL=silent
LOG_PAYLOADS=false
LOG_DB_QUERIES=false
```

Bu yaklasimla:

- Gercek API testleri bilincli olarak acilmadan calismaz.
- Request/response body'leri varsayilan olarak loglanmaz.
- Database query ve row icerikleri varsayilan olarak loglanmaz.
- Authorization, token, password, cookie, secret ve API key gibi hassas alanlar maskelenir.

## Kullanilan Teknolojiler

| Teknoloji | Kullanim Amaci |
| --- | --- |
| TypeScript | Tip guvenligi ve surdurulebilir kod yapisi |
| Playwright Test | API test runner, fixture ve assertion altyapisi |
| Playwright APIRequestContext | HTTP request katmani |
| PostgreSQL `pg` client | Database verification |
| dotenv | Environment konfigurasyonu |
| GitHub Actions | CI kalite kapisi |

## Clean Code ve Surdurulebilirlik Kararlari

Bu framework'te amac gereksiz soyutlama eklemek degil, buyudukce okunabilir
kalacak bir test standardi olusturmaktir.

Bu nedenle:

- ORM kullanilmaz.
- DTO, POJO veya response model class eklenmez.
- API response'lari plain JSON olarak ele alinir.
- Reusable helper'lar merkezi tutulur.
- Domain'e ozgu davranislar ilgili client, data veya spec dosyasinda kalir.
- Database verification sadece business olarak deger kattiginda eklenir.

Bu kararlar, hem manuel gelistirmeyi hem de AI destekli bakimi daha guvenli ve
tutarli hale getirir.

## Yeni Endpoint Ekleme Standardi

Yeni bir endpoint veya domain eklendiginde izlenecek standart:

1. Endpoint path'i `src/config/endpoints.ts` icine eklenir.
2. API istegi ilgili domain client'i icinde tanimlanir.
3. Query param gerekiyorsa `tests/data/<domain>Params.ts` eklenir.
4. Request body gerekiyorsa `tests/data/<domain>Payloads.ts` eklenir.
5. API testi `tests/specs/<domain>.spec.ts` icinde yazilir.
6. Database verification gerekiyorsa query ve repository katmani ayrica eklenir.
7. Degisiklik `npm run test:quality` ile dogrulanir.

## Sahiplik ve Gorunurluk

| Alan | Bilgi |
| --- | --- |
| Framework sahibi | `<Ad Soyad>` |
| Teknik kapsam | Backend API automation, token yonetimi, logging, database verification, generator ve CI kalite kapisi |
| Hedef kullanim | Farkli backend projelerinde API testlerinin ortak standarda alinmasi |
| Bakim modeli | Yazili kurallar + generator + otomatik kalite kontrolleri |
| Genisleme modeli | Yeni domain'ler ayni klasor yapisi ve sorumluluk ayrimi ile eklenir |

Bu dokuman, framework'un teknik kararlarini ve ekibe sagladigi operasyonel
degeri gostermek icin hazirlanmistir. Proje; standartlasma, guvenlik, test
kalitesi ve surdurulebilirlik hedefleriyle gelistirilmistir.

## Kisa Sonuc

Backend API Automation Framework; farkli backend projelerine entegre edilebilen,
API testlerini ortak bir dile alan, kontrollu sekilde genisleyebilen, database
verification ile kritik akis dogrulamasini guclendiren ve CI kalite kapisi ile
korunabilen profesyonel bir otomasyon altyapisidir.

Framework, yeni endpoint testlerinin hizli uretilmesini saglarken uzun vadeli
bakim maliyetini azaltmayi hedefler. Bu yapi, ekip icinde tekrar eden test
kodunu azaltir, standartlari gorunur hale getirir ve API otomasyonunu
surdurulebilir bir seviyeye tasir.
