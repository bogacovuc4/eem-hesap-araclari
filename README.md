# EEM Hesap Araçları

**Canlı site:** https://bogacovuc4.github.io/eem-hesap-araclari/

Elektrik-elektronik mühendisliği derslerinde sık yapılan hesapları tek yerde toplayan, bağımlılıksız bir web sitesi. Saf HTML + CSS + JavaScript (ES modülleri) ile yazıldı. Build adımı, framework ve `node_modules` yok.

## Hesaplayıcılar

| Kategori | Hesaplayıcı |
|---|---|
| Anten / RF | Dalga boyu ↔ frekans · Mikroşerit hat (analiz + sentez, Hammerstad-Jensen) · Arşimet spiral anten bandı · dB çeviriciler (dBm ↔ W, dB ↔ oran) · VSWR ↔ \|Γ\| ↔ geri dönüş kaybı |
| Devre | Gerilim bölücü · LED seri direnci · RC / RL filtre kesim frekansı · Seri RLC rezonansı ve Q · Op-amp evirmeyen / eviren kazanç |
| Rüzgâr enerjisi | Türbin gücü (Betz uyarılı) · Hava yoğunluğu (yükseklik + sıcaklık) · Rüzgâr hız profili (güç yasası, logaritmik) |
| Bileşen kodları | Direnç renk kodu (3–6 bant, iki yönlü) · SMD direnç kodu (3 haneli, 4 haneli, R, EIA-96) · Kondansatör kodu (104K, 4n7, 4R7…) · Bobin kodu (renk ve yazılı, µH/nH) |

Her hesaplayıcı formülü, geçerlilik aralığını ve varsayımları ekranda gösterir. Emin olunamayan yaklaşımlar arayüzde **doğrulanmalı** etiketiyle işaretlidir. Şu an bu etiket spiral anten tahmininde ve rüzgâr profilindeki tipik α / z₀ tablolarında var.

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
    rf.js · circuit.js · wind.js · codes.js
  ui/                 Arayüz
    dom.js            Küçük el() DOM oluşturucu
    form.js           calculatorView / calculatorPanel / numberField
    formula.js        KaTeX ile formül (CDN yoksa düz metin)
    theme.js          Tema değiştirme (localStorage, try/catch)
    rf/ · circuit/ · wind/ · codes/   Her hesaplayıcı için bir görünüm dosyası
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
- D. M. Pozar, *Microwave Engineering*, 4. baskı, Wiley (mikroşerit sentez, VSWR/yansıma).
- U.S. Standard Atmosphere, 1976 (ISA basınç modeli).
- A. Betz (1920) — rüzgâr türbini güç katsayısı sınırı 16/27.
