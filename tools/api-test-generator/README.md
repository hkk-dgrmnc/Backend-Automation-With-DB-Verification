# API Test Generator

Bu arac cURL komutundan framework'e uygun baslangic testi olusturur. Tamamen
yerel calisir; internete, yapay zeka servisine veya API key'e ihtiyac duymaz.

## Calistirma

Proje kokunde:

```bash
npm run generate:api-test
```

cURL komutunu yapistir, bos satirla bitir ve sorulan kisa alanlari kontrol et.
Arac endpoint, client, gerekli test data dosyalari ve yalnizca basarili status
assertion'i iceren spec dosyasini olusturur veya mevcut dosyalara ekler.

Sorulan alanlarin anlami:

- `Client adi`: Eklenecek veya guncellenecek client'i belirler. Ornek: `MusteriKartiClient`
- `Client icine eklenecek metot adi`: API islemini belirler. Ornek: `getAllWithPaging`
- `Endpoint grubu`: Endpoint'in `src/config/endpoints.ts` icinde eklenecegi grubu belirler. Ornek: `musteriKarti`
- `Spec dosyasi`: Testin `tests/specs` altinda eklenecegi veya yeni olusturulacagi dosyayi belirler. Ornek: `musteriKarti.spec.ts`
- Client adi ile metot adi farkli alanlardir. `MusteriKartiClient` bir client adidir; metot adi degildir.

Query parametreleri ve JSON body icin data dosyalari cURL'e gore otomatik
olusturulur veya guncellenir. Query veya body yoksa data dosyasina dokunulmaz.

Dosyalara yazmadan sonucu gormek icin:

```bash
npm run generate:api-test -- --dry-run
```

Parametrelerle tek komutta da calistirilabilir:

```bash
npm run generate:api-test -- \
  --client MusteriKartiClient \
  --method getAllWithPaging \
  --endpoint-group musteriKarti \
  --spec musteriKarti.spec.ts \
  --status 200 \
  --test-name "gets customer cards successfully" \
  --curl "curl 'https://example.test/api/cards?Page=1'"
```

Uzun cURL komutlari icin dosya kullanilabilir:

```bash
npm run generate:api-test -- \
  --client MusteriKartiClient \
  --method getAllWithPaging \
  --endpoint-group musteriKarti \
  --spec musteriKarti.spec.ts \
  --status 200 \
  --curl-file ./request.curl
```

## Uretilen Dosyalar

Gerektigi kadar su alanlar guncellenir:

```txt
src/config/endpoints.ts
src/clients/<domain>Client.ts
tests/data/<domain>Params.ts
tests/data/<domain>Payloads.ts
tests/specs/<domain>.spec.ts
```

Mevcut fixture `apiRequest` sagladigi icin her yeni client icin fixture degisikligi
gerekmez. Spec dosyasi client'i `apiRequest` ile olusturur.

Ayni endpoint, client metodu, test data fonksiyonu veya spec testi farkli
icerikle zaten varsa generator dosyalari degistirmeden hata verir.

## Guvenlik

- `Authorization` degeri kaynak koda yazilmaz. Test merkezi token manager'i kullanir.
- Cookie, API key, token ve benzeri hassas header'lar kaynak koda yazilmaz.
- Hassas query parametresi veya JSON body alani algilanirsa uretim durdurulur.
- `Accept` ve `Content-Type` disindaki header'lar otomatik eklenmez; terminalde uyari verilir.
- Tam URL kaynak koda yazilmaz. Yalnizca endpoint path'i eklenir.

## Ilk Surum Kapsami

Desteklenenler:

- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- query parametreleri
- plain JSON object request body
- merkezi Bearer auth kullanimi
- basarili status assertion'i

Bilerek otomatiklestirilmeyenler:

- response body assertion'lari
- multipart veya dosya upload
- path parametrelerinin otomatik genellestirilmesi
- database verification
- cookie veya API key auth
- `Accept` ve `Content-Type` disindaki ozel header'lar

Bu alanlar API davranisi bilindikten sonra manuel eklenmelidir.
