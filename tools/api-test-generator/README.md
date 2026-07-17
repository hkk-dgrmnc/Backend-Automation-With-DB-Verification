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
- `Client icine eklenecek metot adi`: API islemini belirler. Ornek: `getAllMusteriKartiWithPaging`
- `Endpoint grubu`: Endpoint'in `src/config/endpoints.ts` icinde eklenecegi grubu belirler. Ornek: `musteriKarti`
- `Spec dosyasi`: Testin `tests/specs` altinda eklenecegi veya yeni olusturulacagi dosyayi belirler. Ornek: `musteriKarti.spec.ts`
- Client adi ile metot adi farkli alanlardir. `MusteriKartiClient` bir client adidir; metot adi degildir.

Isimlendirme davranisi:

- Onerilen metot adi HTTP fiilini degil domain aksiyonunu tasir: POST /Platform icin `createPlatform` onerilir (GET -> get, POST -> create, PUT -> update, PATCH -> patch, DELETE -> delete).
- Turkce karakterler identifier uretiminde ASCII'ye translitere edilir (Müşteri -> Musteri).
- Test data factory adlari metot adindan turetilir: `<metotAdi>Params` ve `<metotAdi>Payload`.

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
  --method getAllMusteriKartiWithPaging \
  --endpoint-group musteriKarti \
  --spec musteriKarti.spec.ts \
  --status 200 \
  --test-name "getAllMusteriKartiWithPaging returns success" \
  --curl "curl 'https://example.test/api/cards?Page=1'"
```

Uzun cURL komutlari icin dosya kullanilabilir:

```bash
npm run generate:api-test -- \
  --client MusteriKartiClient \
  --method getAllMusteriKartiWithPaging \
  --endpoint-group musteriKarti \
  --spec musteriKarti.spec.ts \
  --status 200 \
  --curl-file ./request.curl
```

Arguman notlari:

- Her arguman `--name deger` veya `--name=deger` bicimiyle verilebilir. Deger `--` ile basliyorsa esitlik bicimi zorunludur: `--test-name="--edge case"`.
- Hassas gorunen ama gercekte hassas olmayan alanlara bilincli izin vermek icin `--allow-field` kullanilir (virgulle coklu deger alabilir, tekrarlanabilir): `--allow-field tokenCount`.

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

Ayni endpoint, client metodu, test data fonksiyonu veya spec testi zaten varsa
generator icerigi karsilastirir: birebir ayniysa (format farklari haric)
degisiklik yapilmaz, farkliysa dosyalari degistirmeden hata verir. Client
metodunda bu karsilastirma imzayi da kapsar; ayni metot adiyla query'li ve
query'siz iki farkli imza sessizce birbirine karisamaz.

## Guvenlik

- `Authorization` degeri kaynak koda yazilmaz. Test merkezi token manager'i kullanir.
- Cookie, API key, token ve benzeri hassas header'lar kaynak koda yazilmaz.
- `-u` (basic auth) ve `--oauth2-bearer` degerleri kaynak koda yazilmaz; auth gereksinimi merkezi token manager'a baglanir.
- Hassas query parametresi veya JSON body alani algilanirsa uretim durdurulur. Kontrol kelime bazlidir: `maxTokens` gibi masum alanlar engellenmez, `userPassword` engellenir. Gercekte hassas olmayan alanlara `--allow-field` ile izin verilir.
- `Accept` ve `Content-Type` disindaki header'lar otomatik eklenmez; terminalde uyari verilir.
- Tam URL kaynak koda yazilmaz. Yalnizca endpoint path'i eklenir.

## Ilk Surum Kapsami

Desteklenenler:

- `GET`, `POST`, `PUT`, `PATCH`, `DELETE` (`-X POST`, `-XPOST` ve `--request=POST` bicimleri)
- query parametreleri
- plain JSON object request body (`-d`, `--data`, `--data-raw`, `--data-binary`, `--json`)
- Windows CRLF satir sonlari ve `\` satir devamlari
- merkezi Bearer auth kullanimi
- basarili status assertion'i

Desteklenmeyen girdiler sessizce yutulmaz; davranis sudur:

- Acik hata verenler: multipart/form-data (`-F`), `--data-urlencode`, `-G`, dosyadan body (`-d @dosya`), ANSI-C quoting (`$'...'`), Windows cmd caret formati (`^"`), birden fazla URL.
- Uyari ile atlananlar: `-u`/`--user`, `-b`/`--cookie`, `--referer`, `--user-agent` gibi uretimi etkilemeyen option'lar ve taninmayan option/token'lar.

Bilerek otomatiklestirilmeyenler:

- response body assertion'lari
- multipart veya dosya upload
- path parametrelerinin otomatik genellestirilmesi
- database verification
- cookie veya API key auth
- `Accept` ve `Content-Type` disindaki ozel header'lar

Bu alanlar API davranisi bilindikten sonra manuel eklenmelidir.
