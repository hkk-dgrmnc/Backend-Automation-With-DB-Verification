# Backend API Automation Framework

## Genel Bakis

Backend API Automation Framework, backend servislerinin API testlerini tek bir
standart altinda toplamak, test yazma suresini azaltmak ve kritik akislarin
kalici veriyle dogrulanmasini saglamak icin hazirlanmis bir otomasyon
altyapisidir.

Framework; TypeScript, Playwright Test, cURL'den test ureten generator ve
PostgreSQL database verification katmanini bir araya getirir. API testleri
yalnizca response status kontroluyle sinirli kalmaz; ihtiyac duyulan
senaryolarda API'nin database uzerinde beklenen kaydi olusturdugu, guncelledigi
veya korudugu da dogrulanabilir.

Projenin en gorunur kabiliyeti, cURL komutundan otomatik API test taslagi
ureten yerel generator'dir. Bu generator sayesinde Swagger, Postman veya browser
network ekranindan alinan bir cURL komutu; endpoint, client, test data ve spec
dosyalarina framework standardinda donusturulebilir. Boylece kod yazma deneyimi
sinirli olan ekip uyeleri de dogru klasor yapisini, import'lari, token
kullanimini ve temel test iskeletini ezberlemek zorunda kalmadan yeni API
testlerinin baslangicini hazirlayabilir.

## Kimler Icin Deger Uretir?

| Hedef Kitle | Saglanan Deger |
| --- | --- |
| QA ekipleri | API testlerini ayni standartla, daha hizli ve tekrar kullanilabilir sekilde yazar. |
| Backend ekipleri | Endpoint davranisinin otomatik testlerle korunmasini ve regresyonlarin erken yakalanmasini saglar. |
| Teknik liderler | Test mimarisini merkezi, bakimi kolay ve ekipler arasi yayginlastirilabilir hale getirir. |
| Proje yonetimi | API kalite seviyesini gorunur kilar; CI kalite kapisi ile teslimat guvenini artirir. |

## Projenin One Cikan Kabiliyetleri

| Kabiliyet | Aciklama |
| --- | --- |
| cURL'den test uretimi | Tek bir cURL komutundan framework'e uygun baslangic testi uretilir. |
| Merkezi endpoint yonetimi | Endpoint path'leri tek dosyada tutulur; testlerde full URL daginikligi olusmaz. |
| Domain bazli client yapisi | Her API alani kendi client'i ile temsil edilir; client sadece request atmaktan sorumludur. |
| Test data factory standardi | Query parametreleri ve request body'leri tekrar kullanilabilir factory fonksiyonlariyla hazirlanir. |
| Merkezi token yonetimi | Login, token cache ve authorization header uretimi tek utility uzerinden yonetilir. |
| Bagli database verification | PostgreSQL baglantisi framework'e entegre edilmis durumdadir; API sonucunun kalici veriyle uyumu repository katmani uzerinden dogrulanabilir. |
| Guvenli logging | Token, password, cookie ve secret gibi hassas alanlar maskelenir. |
| CI kalite kapisi | Typecheck, unit test ve generator testleri tek komutla calisir. |

## Genel Mimari

Framework, herkesin kolay takip edebilecegi net bir sorumluluk ayrimi uzerine
kuruludur:

| Katman | Gorev |
| --- | --- |
| `src/config` | Environment, endpoint ve database konfigurasyonlarini tutar. |
| `src/clients` | Domain bazli API request metotlarini icerir. |
| `src/utils` | Token manager, logger, response helper ve assertion helper'larini saglar. |
| `src/database` | PostgreSQL database verification icin merkezi db client, query ve repository katmanini barindirir. |
| `tests/data` | Payload ve query parametrelerini standart factory fonksiyonlariyla uretir. |
| `tests/specs` | API senaryolarini, status kontrollerini ve business assertion'lari icerir. |
| `tests/unit` | Framework helper'larinin unit testlerini barindirir. |
| `tools/api-test-generator` | cURL komutundan framework standardinda test dosyalari ureten yerel aracidir. |

Bu yapi sayesinde yeni bir domain veya endpoint eklendiginde kodun nereye
yazilacagi nettir. Client, test, data ve database sorumluluklari birbirine
karismaz.

## cURL'den Test Ureten Generator

Generator, projenin en pratik ve vitrine cikarilabilir parcasidir. Amaci,
manuel test iskeleti yazma yukunu azaltmak ve ekip icinde ayni test standardini
otomatik olarak uygulatmaktir.

Calistirma komutu:

```bash
npm run generate:api-test
```

Generator'a bir cURL komutu verildiginde su dosyalari ihtiyaca gore olusturur
veya gunceller:

| Uretilen Alan | Ne Ise Yarar? |
| --- | --- |
| `src/config/endpoints.ts` | Endpoint path'ini merkezi config'e ekler. |
| `src/clients/<domain>Client.ts` | API istegini atan client metodunu uretir. |
| `tests/data/<domain>Params.ts` | Query parametreleri icin data factory olusturur. |
| `tests/data/<domain>Payloads.ts` | JSON body icin payload factory olusturur. |
| `tests/specs/<domain>.spec.ts` | Basarili status assertion'i iceren Playwright API test taslagi ekler. |

Generator'in sagladigi gorunur avantajlar:

- Yeni endpoint icin test iskeleti dakikalar icinde hazirlanir.
- Endpoint, client, data ve spec ayrimi otomatik korunur.
- Authorization, cookie, token, password ve secret gibi hassas bilgiler kaynak
  koda yazilmaz.
- Ayni endpoint veya test farkli icerikle tekrar eklenmek istenirse dosyalar
  sessizce ezilmez; generator gelistiriciyi uyarir.
- Internet, yapay zeka servisi veya harici API key gerektirmez; tamamen lokal
  calisir.

Bu ozellik, projeyi sadece bir test framework'u olmaktan cikarip ekip icinde
test uretim standardini da yoneten bir otomasyon aracina donusturur.

## Bagli Database Verification Katmani

Framework'te PostgreSQL database verification katmani hazir ve bagli durumdadir
(su an ornek repository iskeletiyle gelir; domain bazli query/repository
dosyalari ihtiyac olustukca eklenir). Bu katman, API testlerinin database'e
dogrudan ve daginik sekilde erismesini engeller; tum database kontrolleri
merkezi db client, query dosyalari ve repository katmani uzerinden yapilir.

Database verification'in amaci database'i tek basina test etmek degildir. Amac,
API'nin yaptigi islemin kalici veri tarafinda da dogru sonucu urettigini
dogrulamaktir.

Kullanildigi tipik senaryolar:

- Create API'si cagrildiktan sonra kaydin database'de olustugunu dogrulamak.
- Update API'si sonrasinda ilgili alanlarin kalici veride guncellendigini
  kontrol etmek.
- Delete veya pasiflestirme API'si sonrasinda beklenen database durumunu
  dogrulamak.
- Kritik business akislarinda API response ile database sonucunu
  karsilastirmak.

Database baglantisi `pg` client ile merkezi pool uzerinden yonetilir. Testler
raw SQL yazmaz ve dogrudan connection olusturmaz. Bu sayede database verification
kontrollu, okunabilir ve surdurulebilir kalir.

## Ornek Domain Kapsami

Mevcut proje, framework'un nasil kullanilacagini gostermek icin asagidaki API
alanlariyla orneklenmistir:

| Domain | Ornek Kapsam |
| --- | --- |
| Auth | Login ve merkezi token cache akisi |
| Musteri Karti | Listeleme ve isim endpoint kontrolleri |
| Kampanya | Kampanya kategori olusturma akisi |
| Platform | Platform olusturma endpoint testi |
| Sozlesme | ID ile sozlesme detay endpoint kontrolu |

Bu domain'ler sabit bir urun siniri degildir. Ayni mimari korunarak farkli
backend projelerine yeni domain'ler, endpoint'ler ve test senaryolari eklenebilir.

## Standart API Test Akisi

Tipik bir test su adimlarla ilerler:

1. Payload veya query parametreleri data factory uzerinden hazirlanir.
2. Endpoint authorization istiyorsa token manager'dan header alinir.
3. Domain client'i ile API istegi gonderilir.
4. Response status kontrol edilir.
5. Response body plain JSON olarak okunur.
6. Gerekli alanlar assertion helper'lariyla dogrulanir.
7. Senaryo kritikse API sonucu database verification katmani ile karsilastirilir.

Bu akis yeni test yazan kisiler icin anlasilir, review eden kisiler icin
okunabilir ve proje buyudukce surdurulebilir bir standart sunar.

## Guvenlik ve Kontrollu Calisma

Framework guvenli varsayilanlarla gelir:

```env
TESTS_ENABLED=false
LOG_LEVEL=silent
LOG_PAYLOADS=false
LOG_DB_QUERIES=false
```

Bu yaklasimla:

- Gercek API testleri bilincli olarak acilmadan calismaz.
- Request ve response body'leri varsayilan olarak loglanmaz.
- Database query ve row icerikleri varsayilan olarak loglanmaz.
- Token, password, cookie, secret ve API key gibi hassas alanlar maskelenir.
- Credential bilgileri kaynak koda yazilmaz; `.env` uzerinden yonetilir.

## Kalite Kapisi

Projede kalite kontrolu tek komut altinda toplanmistir:

```bash
npm run test:quality
```

Bu komut su kontrolleri calistirir:

- TypeScript typecheck
- Unit testler
- API test generator testleri

Ayni kalite kapisi GitHub Actions uzerinde push ve pull request durumlarinda
calisacak sekilde hazirlanmistir. Boylece framework kurallari yalnizca dokumanda
kalmaz; kod degisikligi yapildiginda otomatik olarak denetlenir.

## Kullanilan Teknolojiler

| Teknoloji | Kullanim Amaci |
| --- | --- |
| TypeScript | Tip guvenligi ve okunabilir kod standardi |
| Playwright Test | API test runner, fixture ve assertion altyapisi |
| Playwright APIRequestContext | HTTP request katmani |
| PostgreSQL `pg` client | Bagli database verification katmani |
| dotenv | Environment ve credential konfigurasyonu |
| GitHub Actions | CI kalite kapisi |

## Neden Bu Yapi Tercih Edildi?

Framework gereksiz soyutlamadan uzak, net ve genisletilebilir bir test standardi
olusturmak icin tasarlanmistir.

Bu nedenle:

- ORM kullanilmaz.
- DTO, POJO veya response model class eklenmez.
- API response'lari plain JSON olarak ele alinir.
- Endpoint path'leri tek merkezde tutulur.
- Client katmani assertion veya business validation yapmaz.
- Test dosyalari business dogrulamanin ana yeridir.
- Database verification sadece API sonucunu desteklemek icin kullanilir.

Bu kararlar, hem manuel gelistirmeyi hem de generator destekli test uretimini
daha tutarli hale getirir.

## Yeni Endpoint Ekleme Deneyimi

Yeni bir endpoint eklemek icin tercih edilen akis:

1. Swagger, Postman veya browser network ekranindan cURL komutu alinir.
2. `npm run generate:api-test` calistirilir.
3. Generator endpoint, client, data factory ve spec taslagini uretir.
4. Gerekirse response body assertion'lari manuel olarak zenginlestirilir.
5. Kritik akislar icin database verification repository'si eklenir.
6. `npm run test:quality` ile degisiklik dogrulanir.

Bu akis, test yazmayi tekrarlayan manuel bir is olmaktan cikarip kontrollu ve
standart bir uretim surecine donusturur.

## Gorunurluk ve Operasyonel Kazanim

| Kazanim | Etki |
| --- | --- |
| Hizli test uretimi | cURL generator ile yeni endpoint testlerinin baslangic maliyeti azalir. |
| Ortak standart | Ekipte herkes ayni dosya yapisi ve ayni test akisi ile ilerler. |
| Daha guvenli otomasyon | Hassas bilgiler kaynak koda veya loglara tasinmaz. |
| Database destekli guven | Kritik API davranislari kalici veri uzerinden dogrulanabilir. |
| CI ile korunma | Typecheck ve testler otomatik calisarak regresyon riskini azaltir. |
| Bakim kolayligi | Yeni domain'ler mevcut mimarinin devami olarak eklenir. |

## Sahiplik Bilgisi

| Alan | Bilgi |
| --- | --- |
| Framework sahibi | `<Ad Soyad>` |
| Teknik kapsam | Backend API automation, cURL generator, token yonetimi, logging, database verification ve CI kalite kapisi |
| Hedef kullanim | Farkli backend projelerinde API testlerinin ortak standarda alinmasi |
| Bakim modeli | Yazili kurallar + generator + otomatik kalite kontrolleri |
| Genisleme modeli | Yeni domain'ler ayni mimari ve sorumluluk ayrimi ile eklenir |

## Kisa Sonuc

Backend API Automation Framework; API testlerini standartlastiran, cURL'den test
uretimiyle hiz kazandiran, PostgreSQL database verification katmani bagli olan
ve CI kalite kapisi ile korunabilen kapsamli bir otomasyon altyapisidir.

Bu proje, ekiplerin API testlerini daha hizli uretmesini, daha guvenli
calistirmasini ve kritik backend davranislarini daha gorunur sekilde
dogrulamasini hedefler.
