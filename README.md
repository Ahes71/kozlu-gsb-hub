# KOZLU GSB HUB

Kozlu İlçe GSB operasyonları için çok kurumlu web/PWA pilotu. Üretim ekranlarında örnek kayıt, sahte istatistik veya tarayıcıya kaydedilen operasyon verisi yoktur. Supabase bağlantısı eksikse açık bir kurulum durumu gösterilir.

## Çalışan uygulama kapsamı

- Müdür paneli: günlük program, katılım, görev, personel ve tesis sayıları SQL ile hesaplanır.
- Etkinlik oluşturma/düzenleme/iptal/tamamlama; haftalık takvim; Türkiye saat dilimi; veritabanı düzeyinde tesis çakışma kontrolü.
- Görev atama, kontrol listesi, ilerleme, tamamlanma zamanı. Görev ve maddeleri tek işlemde kaydedilir.
- Tesis ayrıntıları, faaliyet/bakım/malzeme listeleri; bakım fotoğrafları özel Storage alanında.
- Envanter durumu/adedi/tesis ataması ve otomatik değişiklik geçmişi.
- Personel talepleri ve yönetici durum güncellemeleri.
- Kurumlar ve ortak faaliyet sonuçları; duyurular.
- Anonim QR sayımı, fikir gönderme, üç soruluk değerlendirme.
- Aylık SQL raporu, kategori grafiği ve A4 PDF çıktısı (tarayıcıdaki PDF olarak kaydet).
- Gençlik nabzı: kategori kapasitesi, fikirlerin dönem karşılaştırması, yoğun gün/saat, memnuniyet.
- Müdür/yönetici/personel rolleri, kurum ayrımı, yönetici MFA kapısı, işlem günlüğü.
- PWA manifesti, 192/512 ikonlar, güvenli çevrimdışı bilgilendirme. Çevrimdışı kayıt yazılmaz.

## İlk kurulum

1. Bu uygulama için **yeni ve ayrı** Supabase projesi oluşturun. Devrek projesini kullanmayın.
2. SQL Editor'da sırayla `supabase/001_schema.sql` ve `supabase/002_reports_storage.sql` ve `supabase/005_decision_support.sql` dosyalarını çalıştırın. Bunlar yeni proje için sürümlü migration'lardır; aynı dosyayı ikinci kez çalıştırmayın.
3. Authentication / Providers içinde herkese açık yeni üyeliği kapatın; yalnız personel davet edin. En az 12 karakter parola kuralı, TOTP MFA ve kuruma uygun oturum/kimlik doğrulama sınırlarını etkinleştirin.
4. Authentication / URL Configuration içine uygulamanın gerçek HTTPS adresini Site URL olarak ekleyin; aynı adresin `/?reset=1` parola yenileme dönüşünü izinli yapın. Geliştirme için localhost adresini ayrıca ekleyebilirsiniz.
5. Authentication / Users üzerinden ilk müdür hesabını davet edin. `003_first_director.sql` içindeki e-posta ve adı değiştirerek çalıştırın. Hiçbir varsayılan parola oluşturulmaz.
6. `.env.example` dosyasını `.env.local` olarak kopyalayın; `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ORGANIZATION_SLUG=kozlu-gsb` doldurun. Sites dağıtımında aynı değerleri ortam değişkenlerine ekleyin. **Service-role anahtarı uygulamaya gerekmez ve tarayıcıya gönderilmez.**
7. Personel girişi yapın. Müdür/yönetici ilk girişte doğrulayıcı uygulamasını eşleştirir. Ardından tesisleri, personeli ve etkinlikleri ekleyin.

## Geliştirme ve dağıtım

Node 22.13+ gereklidir. Paket sürümleri `package-lock.json` ile sabitlenir.

```powershell
npm ci
npm run dev
npm run typecheck
npm run test:db
npm run build
```

Sites için mevcut Vite/Vinext çalışma ortamı, Next.js App Router API'lerini kullanır; çıktı Cloudflare Worker biçimindedir. Kurumun başka bir Next.js sunucusu seçmesi için standart `npm run dev:next`, `npm run build:next`, `npm run start:next` komutları da vardır. Supabase erişimi HTTPS ile yapılır. Yeni barındırmaya geçerken çevre değişkenleri ve Auth dönüş adresleri güncellenmelidir.

Paketler çalıştırılmadan önce kurumun barındırma/veri yerleşimi kararı alınmalıdır. Özel Sites inceleme bağlantısı vatandaş yayını değildir: QR'ı vatandaşların kullanabilmesi için kurumun onayladığı erişilebilir HTTPS yayını gerekir. Özel önizleme erişimi otomatik olarak herkese açılmaz.

## Güvenlik sınırları

- Her operasyon tablosunda RLS, her ilişkide kurum kimliği; özel SQL işlevlerinde ayrıca rol kontrolü var. Müdür ve yönetici sorguları JWT `aal2` olmadan reddedilir. UI düğmesini gizlemek tek başına yetki kontrolü değildir.
- Personel kendi görevlerini/etkinliklerini ve açtığı talepleri/sorunları görür; yöneticiler kurum genelini görür. Personel görev atamasını veya son tarihini değiştiremez.
- Audit log'u uygulama rolleri değiştiremez. Veritabanı sahibi/servis yöneticisi yine yönetim yetkisine sahiptir; bu bir kriptografik değiştirilemezlik garantisi değildir.
- Dosyalar yalnız JPG/PNG/WebP ve 5 MB ile sınırlı; arayüz görüntüyü yeniden kodlayıp EXIF'i çıkarır. Signed URL 60 saniyeliktir. Doğrudan Storage API'ye yükleyen yetkili kullanıcı için sunucu tarafı antivirüs kurulmuş değildir.
- React metin kaçışları kullanılır; ham HTML çalıştırılmaz. SQL parametreleri PostgREST/RPC ile gönderilir. Yetkili isteklerde bearer token kullanıldığı için uygulamaya ait ambient-cookie CSRF akışı yoktur.
- 30 dakika hareketsizlikte arayüz oturumu kapatılır. Sunucu JWT süresi ve Auth oturum politikası ayrıca Supabase'den ayarlanır; yalnız tarayıcı zamanlayıcısı sunucu tarafı iptal garantisi değildir.
- QR sayımı aynı tarayıcı anahtarıyla aynı etkinlikte bir kez yapılır, DB kilidi ve benzersiz kayıtla tekrar gönderim korunur. Tarayıcı verisini temizlemek/başka cihaz kullanmak yeni sayım yapabilir. **Tekil kişi doğrulaması değildir.** Personel gerçek katılımı ayrıca onaylar.
- Anonim yazmalarda cihaz başına fikir için saatlik sınır ve kurum başına saatte 1.000 gönderim üst sınırı vardır. Bu, kararlı botlara karşı CAPTCHA/WAF yerine geçmez; kamu yayını öncesi kurumun trafik ve kötüye kullanım politikasıyla değerlendirilmelidir.
- Anonim tarayıcı UUID'sinin kapsamla hash'i tutulur; ham IP, vatandaş hesabı, TC, sağlık, adres, doğum tarihi, öğrenci profili tutulmaz. Serbest metinlere yanlışlıkla kişisel veri yazılabilir; içerik inceleme ve imha süreci gerekir.
- Veritabanı günlük yedeği barındırma planından etkinleştirilip geri yükleme denemesiyle doğrulanmalıdır. Storage dosyaları için ayrı yedek gerekir. Bu depoda yedeklerin alındığı iddia edilmez.

## Raporun anlamı

Aylık faaliyet ve katılım sayıları seçilen ay başlayan **tamamlanmış** etkinliklerdir. Onaylı sayı varsa o, yoksa QR sayımı kullanılır. Aynı kişinin farklı etkinliklere katılımı ayrı sayılır. Tesis kullanım saati gerçekleşmiş işaretli etkinliğin planlanan süresidir. Görev/sorun sayıları ay içinde açılan kayıtların rapor anındaki durumudur. Memnuniyet yanıtlayanların ortalamasıdır. Yaş grafiği birey yaşı değil, etkinliğin hedef yaş grubudur.

Karar destek ekranı ayrıca son dört tamamlanmış haftanın her birinde %90 ve üzeri doluluk olan tesis/kategori çiftlerini ve aynı isimli faaliyetin son üç oturumunun her birinde %35 altı katılımı işaretler. Kayıt yetersizliğinde çıkarım yapmaz. Yoğun saatler faaliyet başlangıç saatlerine dayanır; otomatik tesis optimizasyonu değildir.

## Doğrulama ve tamamlanmayı bekleyenler

`npm run test:db`, PGlite/PostgreSQL'de geçici iki kurumla gerçek SQL migration, RLS ve RPC testlerini çalıştırır. Test kayıtları canlı projeye eklenmez. Test Auth JWT işlevleri yerelde taklit edilir; gerçek Supabase Auth e-posta/MFA/Storage entegrasyonu yerine geçmez.

Canlı Supabase URL/anahtarının eklenmesi, SQL migration'ların canlı projeye uygulanması, gerçek personel MFA girişinin sınanması ve iki cihazdan kayıt görünürlüğü testi henüz kurum projesinde yapılmalıdır. Otomatik yedek, saklama/imha süreleri, e-posta SMTP, erişim alan adı ve kamu yayını kurumla tamamlanır. KVKK uyumluluğu veya resmî kurum onayı iddiası yoktur.

## Teknik kaynaklar

- [Supabase MFA ve RLS](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabase kimlik doğrulama sınırları](https://supabase.com/docs/guides/auth/rate-limits)
- [Supabase yedekleme kapsamı](https://supabase.com/docs/guides/platform/backups)
- [Cloudflare ortam değişkenleri](https://developers.cloudflare.com/workers/configuration/environment-variables/)
