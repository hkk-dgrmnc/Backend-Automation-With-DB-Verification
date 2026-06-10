# API Automation Framework Talimatlari

## Proje Amaci

Bu proje TypeScript + Playwright Test tabanli bir API automation framework'udur.

Framework basit, genisletilebilir, bakimi kolay ve farkli backend projeleri icin uygun olmalidir.

Ana amac API test automation'dir. Database erisimi yalnizca API sonuclarinin kalici (persisted) veriyle dogrulanmasi gerektiginde kullanilir.

Bu proje gereksiz karmasiklik icermemeli; Java tarzi POJO, DTO, model class veya response interface yapilari getirmemelidir.

API response'lari dogrudan plain JSON olarak ele alinmalidir.

---

## Temel Teknoloji Kararlari

Su stack kullanilir:

- Dil: TypeScript
- Test Framework: Playwright Test
- HTTP Client: Playwright APIRequestContext
- Assertion Kutuphanesi: Playwright expect
- Database: PostgreSQL
- Database Client: pg
- ORM: Yasak

Kullanilmaz:

- Prisma
- TypeORM
- Sequelize
- postman-request
- callback tabanli request kutuphaneleri
- POJO yapilari
- DTO yapilari
- response model class'lari
- API body'leri icin response interface'leri

---

## Yuksek Seviye Mimari

Proje su kavramsal yapiyi izlemelidir:

- src/clients
  - Domain bazli API client'lari
  - Yalnizca API request gondermekten sorumlu

- src/config
  - Environment config
  - Endpoint config
  - Database config

- src/database
  - Database verification katmani
  - Merkezi database client
  - Domain bazli repository'ler
  - SQL query tanimlari

- src/utils
  - Genel, yeniden kullanilabilir helper'lar
  - Genel assertion'lar
  - Token/auth helper'lari
  - Response helper'lari

- tests
  - Playwright test dosyalari
  - Business assertion'lari
  - API response kontrolleri
  - Opsiyonel API-to-database verification

clients ve tests icerigi dinamiktir. product, basket, order, payment veya campaign gibi sabit modullerin var olacagini varsayma. Domain dosyalari gercek backend projesine gore olusturulur.

---

## Response Ele Alma Kurallari

API response'lari dogrudan JSON olarak okunur.

Response body'leri sunlarla sarmalanmaz:

- class'lar
- DTO'lar
- POJO'lar
- response model'leri
- response interface'leri
- gereksiz response type alias'lari

Ic ice (nested) JSON, normal JavaScript object erisimiyle ele alinir. Response yapisi derinse okunabilir ara degiskenler kullan.

Framework basit kalmali ve asiri soyutlamadan (over-abstraction) kacinmalidir.

---

## API Client Katmani Kurallari

API client'lari src/clients altinda bulunmalidir.

Her API client tek bir backend domain'ini veya mantiksal API alanini temsil etmelidir.

API client'lari yalnizca sunlardan sorumludur:

- HTTP request gondermek
- Playwright APIRequestContext kullanmak
- merkezi endpoint config'inden endpoint path'lerini kullanmak
- APIResponse objeleri dondurmek

API client'lari sunlari yapmaz:

- assertion yapmak
- database sorgulamak
- business validation mantigi icermek
- full URL hardcode etmek
- raw credential yonetmek
- token mantigini tekrar etmek

Bir response'un gecerli olup olmadigina test katmani karar verir.

---

## Endpoint Yonetimi Kurallari

Tum endpoint path'leri src/config/endpoints.ts altinda merkezilestirilmelidir.

Testler hardcode edilmis full URL icermemelidir.

Dinamik endpoint'ler bakimi kolay bir sekilde temsil edilmelidir.

Yeni bir domain eklendiginde, client metotlari olusturulmadan once endpoint tanimlari eklenmelidir.

---

## Environment Yonetimi Kurallari

Environment degerleri config dosyalari uzerinden okunmalidir.

Su amaclar icin ayri config dosyalari kullan:

- uygulama environment degerleri
- base URL
- database konfigurasyonu
- authentication ile ilgili konfigurasyon

Testler dogrudan process.env okumamalidir.

Gercek credential'lar asla hardcode edilmemelidir.

.env.example yalnizca guvenli ornek degerler icermelidir.

---

## Database Verification Amaci

Bu proje SQL testleri yazmaz.

Database dogrudan test edilmez.

Database erisimi yalnizca API test verification'ini desteklemek icin vardir.

Database'i yalnizca sunlar icin kullan:

- beklenen veriyi alip API response ile karsilastirmak
- POST islemlerinin veriyi kalici hale getirdigini dogrulamak
- PUT/PATCH islemlerinin veriyi guncelledigini dogrulamak
- DELETE islemlerinin beklendigi gibi veriyi sildigini, pasiflestirdigini veya degistirdigini dogrulamak

Dogru terminolojiyi kullan:

- database verification
- database validation
- API response database verification

Su terminolojiden kacin:

- SQL test
- DB test
- database testing

---

## Database Katmani Kurallari

Database dosyalari src/database altinda bulunmalidir.

Database katmani sunlari icermelidir:

- merkezi bir database client
- domain bazli repository'ler
- SQL query tanim dosyalari

Database client sorumluluklari:

- pg kullanmak
- connection pooling kullanmak
- database erisimini merkezi olarak yonetmek
- yeniden kullanilabilir bir query calistirma fonksiyonu sunmak
- gerektiginde pool'u guvenli sekilde kapatmanin bir yolunu sunmak

Query kurallari:

- SQL ifadeleri test dosyalarinin disinda tutulmalidir
- SQL ifadeleri query tanim dosyalarina konulmalidir
- testler asla raw SQL icermemelidir

Repository kurallari:

- repository'ler domain'e ozgu database erisim metotlari saglamalidir
- repository'ler merkezi database client'i cagirmalidir
- repository'ler query tanim dosyalarindaki SQL'i kullanmalidir
- repository'ler raw database row'lari veya ise yarar plain object'ler dondurmelidir
- repository'ler API request yapmamalidir
- repository'ler Playwright request mantigi icermemelidir
- repository'ler business assertion yapmamalidir

---

## Test Katmani Kurallari

Test dosyalari tests altinda bulunmalidir.

Testler business validation'dan sorumludur.

Testler sunlari cagirabilir:

- API client'lari
- database repository'leri
- genel assertion helper'lari
- token/auth helper'lari

Testler sunlari yapmalidir:

- response status'unu kontrol etmek
- response body'yi plain JSON olarak okumak
- onemli response alanlarini dogrulamak
- gerektiginde API response'u database sonucuyla karsilastirmak
- birbirinden bagimsiz kalmak
- mumkun oldugunda paralel calistirmaya uygun olmak

Testler sunlari yapmamalidir:

- raw database connection olusturmak
- raw SQL yazmak
- full URL hardcode etmek
- token veya header mantigini tekrar etmek
- POJO/DTO/model class yapilari kullanmak
- assertion mantigini API client'larin icine koymak

---

## API ve Database Verification Akisi

GET tarzi verification icin:

1. Gerektiginde beklenen veriyi bir repository uzerinden database'den al.
2. API'yi bir client uzerinden cagir.
3. Response status'unu kontrol et.
4. Response body'yi plain JSON olarak oku.
5. Ilgili API response alanlarini database degerleriyle karsilastir.

POST tarzi verification icin:

1. API uzerinden veri olustur.
2. Response status'unu kontrol et.
3. Response body'yi plain JSON olarak oku.
4. Response identifier'ini kullanarak bir repository uzerinden database'i sorgula.
5. Kaydin database'de var oldugunu dogrula.
6. Ilgili API response alanlarini database degerleriyle karsilastir.

PUT/PATCH tarzi verification icin:

1. API uzerinden veriyi guncelle.
2. Response status'unu kontrol et.
3. Response body'yi plain JSON olarak oku.
4. Guncellenen kaydi database'den sorgula.
5. Guncellenen alanlarin beklenen degerlerle ve API response ile eslestigini dogrula.

DELETE tarzi verification icin:

1. API uzerinden veriyi sil veya pasiflestir.
2. Response status'unu kontrol et.
3. Database'i identifier ile sorgula.
4. Kaydin backend davranisina gore silindigini, pasiflestirildigini veya degistirildigini dogrula.

---

## Authentication ve Token Kurallari

Authentication mantigi testler arasinda tekrar edilmemelidir.

Token yonetimi src/utils/tokenManager.ts veya esdeger bir utility altinda merkezilestirilmelidir.

Token helper sorumluluklari sunlari icerebilir:

- token istemek
- token cache'lemek
- gerektiginde token yenilemek
- yeniden kullanilabilir authorization header'lari dondurmek

Testler header'i tekrar tekrar elle olusturmak yerine token helper'larini cagirmalidir.

---

## Utility Kurallari

Genel helper'lar src/utils altinda bulunmalidir.

Ise yarar helper alanlari sunlari icerir:

- genel assertion'lar
- response helper'lari
- token yonetimi
- veri formatlama helper'lari

Genel assertion helper'lari genel kalmalidir.

Domain'e ozgu assertion helper'lari yalnizca okunabilirligi artirdiklarinda eklenebilir; ancak POJO, DTO veya model yapilari getirmemelidir.

---

## Playwright Konfigurasyon Kurallari

playwright.config.ts API test kurulumunu basit tutmalidir.

Su tanimlari icermelidir:

- tests dizini
- base URL konfigurasyonu
- ise yarar reporter'lar
- gerekiyorsa retry stratejisi
- uygun oldugunda varsayilan API header'lari

Config, business mantiginin yeri haline gelmemelidir.

---

## Package Script Kurallari

package.json su amaclar icin ise yarar script'ler icermelidir:

- tum testleri calistirmak
- API testlerini calistirmak
- raporu acmak

Gunluk kullanimi veya CI entegrasyonunu iyilestirdiginde ek script'ler eklenebilir.

---

## Kodlama Standartlari

Kullan:

- TypeScript
- async/await
- Playwright expect
- Playwright APIRequestContext
- pg Pool
- database verification icin repository pattern
- merkezi endpoint yonetimi
- merkezi environment config

Kacin:

- callback tabanli request kodu
- hardcode credential
- testlerde hardcode full URL
- testlerde raw SQL
- testlerde database connection
- API client'larin icinde assertion
- database repository'lerin icinde API cagrisi
- API client'larin icinde database query
- gereksiz soyutlama (abstraction)
- POJO, DTO, model veya response interface yapilari

---

## Sorumluluk Ayrimi

API client sorumluluklari:

- API request gondermek
- API response dondurmek

API client'lari sunlari yapmaz:

- assertion
- database sorgulama
- business davranis dogrulama

Database repository sorumluluklari:

- database query calistirmak
- database kayitlari dondurmek

Database repository'leri sunlari yapmaz:

- API cagirmak
- Playwright request kullanmak
- business assertion yapmak

Test dosyasi sorumluluklari:

- API client'lari cagirmak
- gerektiginde repository cagirmak
- status code kontrol etmek
- JSON response body okumak
- API response'u database sonucuyla karsilastirmak
- business assertion yapmak

---

## Yeni Domain Ekleme

Yeni bir domain eklerken:

1. Endpoint tanimlarini ekle.
2. Domain API client'ini olustur.
3. Database verification gerekiyorsa yalnizca o zaman database query tanimlari ekle.
4. Database verification gerekiyorsa yalnizca o zaman repository metotlari ekle.
5. Ilgili test dosyasini veya business-flow test dosyasini olustur.

Her domain'in database verification'a ihtiyaci oldugunu varsayma.

Database verification'i yalnizca API testine gercek deger katiyorsa kullan.

---

## Test Tasarim Rehberi

Her API testinin database verification'a ihtiyaci yoktur.

Su durumlar icin API-only testler kullan:

- temel status kontrolleri
- basit response dogrulama
- public lookup endpoint'leri
- list endpoint'leri
- hafif smoke testleri

Su durumlar icin API arti database verification kullan:

- kritik business akislari
- create islemleri
- update islemleri
- delete/pasiflestirme islemleri
- payment, order, basket, user veya state degistiren akislar
- response dogrulamanin tek basina yeterli olmadigi durumlar

---

## Herhangi Bir Gorevi Tamamlamadan Once Son Kontrol Listesi

Herhangi bir degisikligi bitirmeden once sunlari dogrula:

- POJO, DTO veya model class eklenmedi
- API body'leri icin response interface eklenmedi
- gereksiz response type alias eklenmedi
- test dosyalarinda raw SQL yok
- test dosyalarinda database connection yok
- API client'larin icinde assertion yok
- database repository'lerin icinde API request yok
- API client'larin icinde database query yok
- testlerde hardcode full URL yok
- hicbir credential hardcode edilmedi
- response body plain JSON olarak okunuyor
- client'lar APIResponse donduruyor
- testler business assertion yapiyor
- database yalnizca API sonucu verification'i icin kullaniliyor
