# EEM Hesap Araçları

**Canlı site:** https://bogacovuc4.github.io/eem-hesap-araclari/

Elektrik-elektronik mühendisliği derslerinde sık yapılan hesapları tek yerde toplayan, bağımlılıksız bir web sitesi. Saf HTML + CSS + JavaScript (ES modülleri) ile yazıldı. Build adımı, framework ve `node_modules` yok.

## Hesaplayıcılar

| Kategori | Hesaplayıcı |
|---|---|
| Anten / RF | Dalga boyu ↔ frekans · Mikroşerit hat (analiz + sentez, Hammerstad-Jensen) · Koaksiyel hat (analiz + sentez) · Hat giriş empedansı (karmaşık yük) · Çeyrek dalga dönüştürücü (bant genişliğiyle) · Anten temel büyüklükleri (Ae, dBd, uzak alan) · Radar menzil denklemi · Gürültü (NF ↔ Te, Friis kademe, kTB ve duyarlılık) · Deri derinliği (tel AC/DC direnci) · Yama (patch) anten tasarımı (Balanis iletim hattı modeli, G1/G12 ile kenar direnci ve girintili besleme) · Friis / link bütçesi (alınan güç, bağlantı payı, en büyük mesafe) · Arşimet spiral anten bandı · dB çeviriciler (dBm ↔ W, dB ↔ oran) · VSWR ↔ \|Γ\| ↔ geri dönüş kaybı |
| Devre | Seri / paralel birleştirici (R, L, C) · Yıldız ↔ üçgen dönüşümü · Thevenin ↔ Norton · Wheatstone köprüsü · Empedans (|Z|, faz, güçler) · Paralel RLC · AC güç ve güç faktörü düzeltme (tek/üç faz) · 555 zamanlayıcı · İletken kesiti (gerilim düşümüne göre) · RC / RL geçici yanıt (grafikli) · Gerilim bölücü · LED seri direnci · RC / RL filtre kesim frekansı · Seri RLC rezonansı ve Q · Op-amp evirmeyen / eviren kazanç |
| Elektronik | BJT gerilim bölücülü polarma (Q noktası, çalışma bölgesi, devre şeması, DC yük doğrusu) |
| Sinyaller ve sistemler | Fourier serisi (kare/üçgen/testere, kısmi toplam ve harmonik grafikleri, THD) · Bode diyagramı (kutup/sıfır, genlik-faz, kazanç ve faz payı) |
| Kontrol sistemleri | İkinci derece sistem (aşım, yükselme, tepe, yerleşme süresi; basamak yanıtı grafiği) |
| Elektrik makineleri ve güç sistemleri | Transformatör (oran, akımlar, empedans yansıtma, verim–yük eğrisi, regülasyon) · Üç fazlı sistem (Y/Δ faz-hat değerleri, güçler) |
| Enerji dağıtımı | Gerilim düşümü (tek/üç faz, reaktanslı, gereken kesit; çok yüklü hatta yük momentleri ve hat boyunca düşüm grafiği) · Kısa devre akımı (şebeke + trafo + kablo, I″k3, darbe akımı) · Topraklama direnci (çubuk, şerit, levha) |
| Analog tümdevre tasarımı | MOSFET kare yasası (NMOS/PMOS; ID, bölge, gm, ro, gm·ro, çıkış karakteristiği; W/L boyutlandırma) · Ortak kaynaklı kuvvetlendirici (Av, Rout, bant genişliği, geçiş eğrisi) · Akım aynası (Iout, kopyalama hatası, Rout, Iout–Vout eğrisi) |
| Haberleşme | AM / FM modülasyonu (güç, verim, Carson bant genişliği, Bessel spektrumu) |
| Makine öğrenmesi | Karışıklık matrisi (doğruluk, kesinlik, duyarlılık, F1, MCC) · Doğrusal regresyon (en küçük kareler, R², saçılım grafiği, tahmin) · Aktivasyon fonksiyonları (sigmoid, tanh, ReLU, Leaky ReLU, softplus ve türevleri) |
| Rüzgâr enerjisi | Türbin gücü (Betz uyarılı) · Weibull ile yıllık enerji üretimi ve kapasite faktörü (grafikli) · Hava yoğunluğu (yükseklik + sıcaklık) · Rüzgâr hız profili (güç yasası, logaritmik) |
| Sayısal | Karnaugh haritası ve mantık sadeleştirme (Quine–McCluskey, en sade SOP) · Sayı tabanı dönüştürücü (2/8/10/16, 64 bite kadar, ikinin tümleyeni, bit ızgarası) |
| Bileşen kodları | Direnç renk kodu (3–6 bant, iki yönlü) · SMD direnç kodu (3 haneli, 4 haneli, R, EIA-96) · Kondansatör kodu (104K, 4n7, 4R7…) · Bobin kodu (renk ve yazılı, µH/nH) |

Her hesaplayıcı formülü, geçerlilik aralığını ve varsayımları ekranda gösterir. Emin olunamayan yaklaşımlar arayüzde **doğrulanmalı** etiketiyle işaretlidir. Şu an bu etiket spiral anten tahmininde ve rüzgâr profilindeki tipik α / z₀ tablolarında var.

### Kullanım kolaylıkları

- **Arama:** Kenar çubuğundaki ya da ana sayfadaki kutuya yazın (`/` tuşu odaklar, Enter ilk sonuca gider). Türkçe karakterler fark etmez: "direnc" de "Direnç"i bulur.
- **Paylaşılabilir bağlantı:** Girdiğiniz değerler, birimler ve seçili sekme adres çubuğunda tutulur (ör. `#/rf/microstrip?mode=synthesis&z0=75`). "Bağlantıyı kopyala" ile aynı hesabı başkasına gönderebilirsiniz.
- **Sonucu kopyalama:** Her sonuç satırının yanındaki düğme değeri panoya kopyalar.
- **Son kullanılanlar:** Ana sayfada en son açtığınız hesaplayıcılar listelenir (yalnızca bu tarayıcıda saklanır).
- **Erişilebilirlik:** Hatalı girdi mesajı ilgili alanın hemen altında çıkar ve alana bağlıdır (`aria-describedby`). Klavye odağı her kontrolde görünür, sekmeler ok tuşlarıyla değişir. Renk kontrastı açık ve koyu temada WCAG AA eşiklerini sağlar. Azaltılmış hareket tercihinde geçişler kapanır.

Arayüz iyileştirmeleri [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) skill'inin UX kurallarıyla yapılan bir denetime dayanır.

**Tema — teknik defter:** kâğıt beyazı zemin (içerikte hafif nokta ızgarası), lacivert mürekkep metin ve vurgular, kırmızı kalemle yalnızca küçük vurgular (etkin menü öğesi, asıl sonuç, odak halkası, grafikte işaretli nokta). Koyu temada "gece defteri": koyu lacivert zemin, açık mürekkep, kırmızı vurgu. Renkler `styles.css` başındaki token'larda; iki temada da metin kontrastı ≥ 4,5:1, kenar ve vurgu ≥ 3:1 olarak ölçülmüştür.

**Menü:** kategoriler ikonlu ve sayaçlı başlıklar altında açılıp kapanır; hangi kategorilerin açık olduğu tarayıcıda hatırlanır, açık sayfanın kategorisi kendiliğinden açılır. Aramada yalnızca eşleşen kategoriler açılır ve sayaçlar eşleşme sayısını gösterir.

## Çalıştırma

Tarayıcılar `file://` adresinden açılan sayfalarda ES modüllerini engeller. Bu yüzden `index.html` dosyasına çift tıklamak işe yaramaz; siteyi küçük bir yerel sunucuyla açın. Proje klasöründe aşağıdakilerden birini çalıştırın:

```bash
python -m http.server 8000
```

```bash
npx serve .
```

Sonra tarayıcıda `http://localhost:8000` adresini açın. `npx serve` kendi portunu (genelde 3000) ekrana yazar.

## Testler

Hesap formülleri `src/calc/` altında, DOM'a dokunmayan saf fonksiyonlardır. Testleri ders kitabı örnekleri ve bilinen sonuçlarla karşılaştırır (ör. Pozar Örnek 3.7, FR-4 üzerinde 50 Ω hat, ISA tablosu).

**Node.js ile (asıl yöntem, Node 20+):**

```bash
node --test
```

**Node kurulu değilse:** yerel sunucuyu açıp `http://localhost:8000/tools/test-runner/` adresine gidin. Bu sayfa `test/` klasöründeki dosyaları değiştirmeden tarayıcıda çalıştırır; `node:test` ve `node:assert/strict` import map ile küçük sarmalayıcılara yönlendirilir.

## Klasör yapısı

```
index.html            Kabuk: üst çubuk, sol menü, içerik alanı
styles.css            Açık/koyu tema token'ları, mobil düzen
src/
  main.js             Hash tabanlı yönlendirme (#/rf/microstrip), menü
  registry.js         Tüm hesaplayıcıların kategori listesi
  calc/               Saf hesap fonksiyonları (test edilir)
    constants.js      c0, μ0, ε0, η0
    units.js          Birim tabloları, sayı ayrıştırma, SI ön ekli biçimlendirme
    validate.js       Girdi doğrulama mesajları
    rf.js · rf2.js · circuit.js · circuit2.js · electronics.js · signals.js · power.js · distribution.js · analog.js · comm.js · ml.js · logic.js · wind.js · codes.js · digital.js
    math.js           Simpson integrali, Bessel J0, Gamma fonksiyonu, karmaşık sayılar
  ui/                 Arayüz
    dom.js            Küçük el() DOM oluşturucu
    form.js           calculatorView / calculatorPanel / numberField
    formula.js        KaTeX ile formül (CDN yoksa düz metin)
    theme.js          Tema değiştirme (localStorage, try/catch)
    chart.js          Tek serili SVG çizgi/çubuk grafik (ipucu + tablo görünümü)
    rf/ · circuit/ · wind/ · codes/ · digital/   Her hesaplayıcı için bir görünüm dosyası
test/                 node --test dosyaları
tools/test-runner/    Node olmadan tarayıcıda test çalıştırma
```

## Yeni hesaplayıcı ekleme

Örnek olarak "Ohm yasası" ekleyelim:

**1. Formülü `src/calc/` altına saf fonksiyon olarak yazın.** Geçersiz girdide `RangeError` fırlatın:

```js
// src/calc/circuit.js
export function ohmsLaw({ v, r }) {
  assert(r > 0, 'Direnç sıfırdan büyük olmalı.');
  return { i: v / r, p: v ** 2 / r };
}
```

**2. Testi `test/` altına ekleyin** (bilinen bir sonuçla):

```js
it('12 V, 4 Ω → 3 A, 36 W', () => {
  const { i, p } = ohmsLaw({ v: 12, r: 4 });
  assertClose(i, 3, 1e-12);
  assertClose(p, 36, 1e-12);
});
```

**3. Görünüm dosyasını `src/ui/<kategori>/` altına yazın.** `calculatorPanel` girdi okuma, birim çevirme, doğrulama, anlık hesaplama ve hata/uyarı gösterimini kendisi yapar:

```js
// src/ui/circuit/ohm.js
import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { VOLTAGE_UNITS, RESISTANCE_UNITS, formatSI } from '../../calc/units.js';
import { ohmsLaw } from '../../calc/circuit.js';

export default {
  id: 'circuit/ohm',          // URL: #/circuit/ohm
  title: 'Ohm yasası',
  render(container) {
    container.append(calculatorView({
      title: 'Ohm yasası',
      modes: [{
        id: 'ohm',
        label: 'I ve P',
        build: () => calculatorPanel({
          fields: [
            // Değerler compute'a SI biriminde (V, Ω) gelir
            { key: 'v', label: 'Gerilim V', value: '12', units: VOLTAGE_UNITS, unit: 'V', constraint: 'any' },
            { key: 'r', label: 'Direnç R', value: '4', units: RESISTANCE_UNITS, unit: 'Ω' },
          ],
          compute(values) {
            const { i, p } = ohmsLaw(values);
            return {
              results: [
                { label: 'Akım I', value: formatSI(i, 'A') },
                { label: 'Güç P', value: formatSI(p, 'W') },
              ],
              warnings: [],  // isteğe bağlı sarı uyarılar
            };
          },
          formulas: [formula(String.raw`I=\frac{V}{R}`, 'I = V/R')],  // LaTeX + düz metin yedeği
          notes: ['Doğrusal, zamanla değişmeyen direnç varsayılır.'],
        }),
      }],
    }));
  },
};
```

**Devre şeması (isteğe bağlı).** `calculatorPanel`'e `diagram: (values, output) => Node` verirseniz panelin üstünde bir "Devre şeması" kartı çıkar ve her girişte yeniden çizilir. `values` girdilerin SI değerleridir; `output`, `compute`'un döndürdüğü nesnedir (hata varsa `null`). Hesaplanan büyüklükleri şemaya taşımak için `compute`'tan `raw: { ... }` döndürün. Çizim yardımcıları `src/ui/schematic.js` içinde: `twoTerminal('resistor' | 'capacitor' | 'inductor' | 'led' | 'source' | 'ac', a, b)`, `wire`, `ground`, `dot`, `terminal`, `opamp`, `label(x, y, ad, değer)`. Değeri olmayan bir etikete `{ unknown: true }` verilirse "?" gösterilir. Mevcut örnekler `src/ui/circuit/schematics.js` dosyasında.

```js
diagram: (v, out) => dividerSchematic({ ...v, vout: out?.raw.vout }),
```

Alan seçenekleri: `constraint` (`'positive'` varsayılan, `'nonnegative'`, `'any'`), `min`, `max` (dahil, SI cinsinden), `hint`, `name` (hata mesajlarındaki kısa ad). Birden çok mod (ör. analiz/sentez) için `modes` dizisine yeni öğe ekleyin; sekmeler otomatik oluşur. Doğrulanmamış bir yaklaşım için notlarda `verifyNote('...')` kullanın.

**4. `src/registry.js` içinde içe aktarıp ilgili kategorinin `calculators` listesine ekleyin.** Menü ve ana sayfa kendiliğinden güncellenir.

## Gezinme ve favoriler

- Üst çubuktaki **Ana menü** düğmesi her sayfadan ana sayfaya döndürür (telefonda yalnızca ev simgesi).
- Bir dersin (kategorinin) başlığındaki **yıldıza** basınca ders favorilere eklenir; favoriler hem kenar menüsünde hem ana sayfada en üstte, eklenme sırasıyla görünür. Tek tek hesaplayıcılar da favorilenebilir: hesaplayıcı sayfasının başlığındaki ya da ana sayfadaki her hesaplayıcının yanındaki yıldız. Favori hesaplayıcılar menünün ve ana sayfanın en üstünde ayrı bir listede görünür. Favoriler yalnızca o tarayıcıda (localStorage) saklanır.

## Görünüm ve arka plan

Arayüz "buzlu cam" temasındadır: kartlar ve çubuklar yarı saydam ve bulanıktır, arkada hareketli bir sahne vardır. Sahnede renk bulutları, devre kartı izleri ve izler üzerinde akan akım darbeleri bulunur; tamamı CSS ve SVG ile çizilir (`src/ui/background.js`, `styles.css` sonundaki "Buzlu cam" bölümü). Azaltılmış hareket tercihinde animasyonlar durur.

Arka planda Higgsfield ile üretilmiş bir video döner (`assets/bg.webm`, `assets/bg.mp4`, ilk kare `assets/bg.jpg`); ileri-geri oynatılarak kesintisiz döngü yapılmıştır. Videoyu değiştirmek için:

1. Yeni videoyu sessiz ve küçük (1–3 MB) olarak `assets/` klasörüne, ilk karesini `assets/bg.jpg` olarak koyun.
2. Gerekirse `src/ui/background.js` içindeki `BG_VIDEO` kaynaklarını güncelleyin. Kesintisiz döngü için ffmpeg ile ileri-geri birleştirme:
   ```bash
   ffmpeg -i girdi.mp4 -filter_complex "[0:v]fps=24,split[f][r];[r]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[rv];[f][rv]concat=n=2:v=1[o]" -map "[o]" -an -c:v libx264 -crf 30 -movflags +faststart assets/bg.mp4
   ```

Video, azaltılmış hareket ya da veri tasarrufu açıksa ve 760 px'ten dar ekranlarda (telefon) yüklenmez; orada yalnızca CSS sahnesi görünür.

## GitHub Pages'e yükleme

Site statik olduğu için olduğu gibi yayınlanabilir:

1. GitHub'da yeni, boş bir depo oluşturun (ör. `eem-hesap-araclari`).
2. Depoyu bağlayıp gönderin:

   ```bash
   git remote add origin https://github.com/<kullanıcı-adı>/eem-hesap-araclari.git
   ```

   ```bash
   git push -u origin main
   ```

3. Depoda **Settings → Pages** bölümüne gidin. **Source** olarak "Deploy from a branch", dal olarak `main`, klasör olarak `/ (root)` seçip kaydedin.
4. Bir iki dakika içinde site `https://<kullanıcı-adı>.github.io/eem-hesap-araclari/` adresinde yayında olur.

Tüm yollar göreli olduğu için alt klasörde yayınlanmak sorun çıkarmaz. KaTeX jsDelivr CDN'inden yüklenir; CDN'e ulaşılamazsa formüller düz metin olarak görünür.

## Kaynaklar

- E. Hammerstad, Ø. Jensen, "Accurate Models for Microstrip Computer-Aided Design," IEEE MTT-S Int. Microwave Symp. Digest, 1980.
- C. A. Balanis, *Antenna Theory: Analysis and Design*, Böl. 14 (dikdörtgen yama anten, Örnek 14.1–14.3).
- D. M. Pozar, *Microwave Engineering*, 4. baskı, Wiley (mikroşerit sentez, VSWR/yansıma).
- U.S. Standard Atmosphere, 1976 (ISA basınç modeli).
- A. Betz (1920) — rüzgâr türbini güç katsayısı sınırı 16/27.
