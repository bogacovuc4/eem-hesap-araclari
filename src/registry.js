// Tüm hesaplayıcıların listesi. Hesaplayıcı kodları yalnızca sayfası açılınca yüklenir
// (dinamik import); burada yalnızca kimlik, başlık ve yükleyici durur. Yeni bir hesaplayıcı
// eklemek için görünüm modülünü yazıp ilgili kategoriye calc(id, başlık, yükleyici) ekleyin.
// id ve başlık modüldeki "export default { id, title }" ile aynı olmalı (test/registry.test.js denetler).

const calc = (id, title, load) => ({ id, title, load });

export const categories = [
  {
    id: 'rf',
    icon: 'antenna',
    title: 'Anten / RF',
    calculators: [
      calc('rf/wavelength', 'Dalga boyu ↔ frekans', () => import('./ui/rf/wavelength.js')),
      calc('rf/microstrip', 'Mikroşerit hat', () => import('./ui/rf/microstrip.js')),
      calc('rf/coax', 'Koaksiyel hat', () => import('./ui/rf/coax.js')),
      calc('rf/line-input', 'Hat giriş empedansı', () => import('./ui/rf/line-input.js')),
      calc('rf/quarter-wave', 'Çeyrek dalga dönüştürücü', () => import('./ui/rf/quarter-wave.js')),
      calc('rf/patch', 'Yama (patch) anten', () => import('./ui/rf/patch.js')),
      calc('rf/spiral', 'Arşimet spiral anten', () => import('./ui/rf/spiral.js')),
      calc('rf/antenna-basics', 'Anten temel büyüklükleri', () => import('./ui/rf/antenna-basics.js')),
      calc('rf/link-budget', 'Friis / link bütçesi', () => import('./ui/rf/link-budget.js')),
      calc('rf/radar', 'Radar menzil denklemi', () => import('./ui/rf/radar.js')),
      calc('rf/noise', 'Gürültü faktörü ve sıcaklığı', () => import('./ui/rf/noise.js')),
      calc('rf/skin-depth', 'Deri derinliği', () => import('./ui/rf/skin-depth.js')),
      calc('rf/decibel', 'dB çeviriciler', () => import('./ui/rf/decibel.js')),
      calc('rf/vswr', 'VSWR ↔ |Γ| ↔ geri dönüş kaybı', () => import('./ui/rf/vswr.js')),
    ],
  },
  {
    id: 'circuit',
    icon: 'chip',
    title: 'Devre',
    calculators: [
      calc('circuit/ohm', 'Ohm yasası ve güç', () => import('./ui/circuit/ohm.js')),
      calc('circuit/phasor', 'Fazör / karmaşık sayı', () => import('./ui/circuit/phasor.js')),
      calc('circuit/combine', 'Seri / paralel birleştirici', () => import('./ui/circuit/combine.js')),
      calc('circuit/divider', 'Gerilim bölücü', () => import('./ui/circuit/divider.js')),
      calc('circuit/wye-delta', 'Yıldız ↔ üçgen (Y–Δ)', () => import('./ui/circuit/wye-delta.js')),
      calc('circuit/thevenin', 'Thevenin ↔ Norton', () => import('./ui/circuit/thevenin.js')),
      calc('circuit/wheatstone', 'Wheatstone köprüsü', () => import('./ui/circuit/wheatstone.js')),
      calc('circuit/impedance', 'Empedans (|Z| ve faz)', () => import('./ui/circuit/impedance.js')),
      calc('circuit/filter', 'RC / RL filtre', () => import('./ui/circuit/filter.js')),
      calc('circuit/transient', 'RC / RL geçici yanıt', () => import('./ui/circuit/transient.js')),
      calc('circuit/rlc', 'Seri RLC rezonansı', () => import('./ui/circuit/rlc.js')),
      calc('circuit/parallel-rlc', 'Paralel RLC rezonansı', () => import('./ui/circuit/parallel-rlc.js')),
      calc('circuit/ac-power', 'AC güç ve PF düzeltme', () => import('./ui/circuit/ac-power.js')),
      calc('circuit/opamp', 'Op-amp kuvvetlendirici', () => import('./ui/circuit/opamp.js')),
      calc('circuit/timer555', '555 zamanlayıcı', () => import('./ui/circuit/timer555.js')),
      calc('circuit/led', 'LED seri direnci', () => import('./ui/circuit/led.js')),
      calc('circuit/cable', 'İletken kesiti', () => import('./ui/circuit/cable.js')),
    ],
  },
  {
    id: 'electronics',
    icon: 'transistor',
    title: 'Elektronik',
    calculators: [
      calc('electronics/bjt-bias', 'BJT polarma (gerilim bölücü)', () => import('./ui/electronics/bjt-bias.js')),
      calc('electronics/rectifier', 'Doğrultucu ve filtre', () => import('./ui/electronics/rectifier.js')),
      calc('electronics/zener', 'Zener regülatör', () => import('./ui/electronics/zener.js')),
    ],
  },
  {
    id: 'em',
    icon: 'magnet',
    title: 'Elektromanyetik alanlar',
    calculators: [
      calc('em/point-charge', 'Noktasal yük ve Coulomb', () => import('./ui/em/point-charge.js')),
      calc('em/capacitance', 'Kapasitans (geometri)', () => import('./ui/em/capacitance.js')),
      calc('em/magnetic-field', 'Manyetik alan (Biot–Savart, Amper)', () => import('./ui/em/magnetic-field.js')),
      calc('em/inductance', 'Endüktans (geometri)', () => import('./ui/em/inductance.js')),
    ],
  },
  {
    id: 'signals',
    icon: 'sine',
    title: 'Sinyaller ve sistemler',
    calculators: [
      calc('signals/fourier', 'Fourier serisi', () => import('./ui/signals/fourier.js')),
      calc('signals/bode', 'Bode diyagramı', () => import('./ui/signals/bode.js')),
      calc('signals/adc', 'ADC ve örnekleme', () => import('./ui/signals/adc.js')),
    ],
  },
  {
    id: 'control',
    icon: 'target',
    title: 'Kontrol sistemleri',
    calculators: [
      calc('control/second-order', 'İkinci derece sistem', () => import('./ui/control/second-order.js')),
      calc('control/routh', 'Routh–Hurwitz kararlılık', () => import('./ui/control/routh.js')),
    ],
  },
  {
    id: 'power',
    icon: 'bolt',
    title: 'Elektrik makineleri ve güç sistemleri',
    calculators: [
      calc('machines/transformer', 'Transformatör', () => import('./ui/machines/transformer.js')),
      calc('machines/three-phase', 'Üç fazlı sistem', () => import('./ui/machines/three-phase.js')),
      calc('machines/induction-motor', 'Asenkron motor', () => import('./ui/machines/induction-motor.js')),
    ],
  },
  {
    id: 'distribution',
    icon: 'pylon',
    title: 'Enerji dağıtımı',
    calculators: [
      calc('distribution/voltage-drop', 'Gerilim düşümü', () => import('./ui/distribution/voltage-drop.js')),
      calc('distribution/short-circuit', 'Kısa devre akımı', () => import('./ui/distribution/short-circuit.js')),
      calc('distribution/grounding', 'Topraklama direnci', () => import('./ui/distribution/grounding.js')),
    ],
  },
  {
    id: 'analog',
    icon: 'ic',
    title: 'Analog tümdevre tasarımı',
    calculators: [
      calc('analog/mosfet', 'MOSFET (kare yasası)', () => import('./ui/analog/mosfet.js')),
      calc('analog/common-source', 'Ortak kaynaklı kuvvetlendirici', () => import('./ui/analog/common-source.js')),
      calc('analog/current-mirror', 'Akım aynası', () => import('./ui/analog/current-mirror.js')),
    ],
  },
  {
    id: 'comm',
    icon: 'broadcast',
    title: 'Haberleşme',
    calculators: [
      calc('comm/modulation', 'AM / FM modülasyonu', () => import('./ui/comm/modulation.js')),
    ],
  },
  {
    id: 'ml',
    icon: 'network',
    title: 'Makine öğrenmesi',
    calculators: [
      calc('ml/confusion', 'Karışıklık matrisi ve metrikler', () => import('./ui/ml/confusion.js')),
      calc('ml/regression', 'Doğrusal regresyon', () => import('./ui/ml/regression.js')),
      calc('ml/activation', 'Aktivasyon fonksiyonları', () => import('./ui/ml/activation.js')),
    ],
  },
  {
    id: 'wind',
    icon: 'wind',
    title: 'Rüzgâr enerjisi',
    calculators: [
      calc('wind/turbine', 'Türbin gücü', () => import('./ui/wind/turbine.js')),
      calc('wind/aep', 'Yıllık enerji (Weibull)', () => import('./ui/wind/aep.js')),
      calc('wind/density', 'Hava yoğunluğu', () => import('./ui/wind/density.js')),
      calc('wind/profile', 'Rüzgâr hız profili', () => import('./ui/wind/profile.js')),
    ],
  },
  {
    id: 'codes',
    icon: 'tag',
    title: 'Bileşen kodları',
    calculators: [
      calc('codes/resistor-color', 'Direnç renk kodu', () => import('./ui/codes/resistor-color.js')),
      calc('codes/smd-resistor', 'SMD direnç kodu', () => import('./ui/codes/smd-resistor.js')),
      calc('codes/capacitor', 'Kondansatör kodu', () => import('./ui/codes/capacitor-code.js')),
      calc('codes/inductor', 'Bobin kodu', () => import('./ui/codes/inductor-code.js')),
    ],
  },
  {
    id: 'digital',
    icon: 'binary',
    title: 'Sayısal',
    calculators: [
      calc('digital/karnaugh', 'Karnaugh / mantık sadeleştirme', () => import('./ui/digital/karnaugh.js')),
      calc('digital/number-base', 'Sayı tabanı dönüştürücü', () => import('./ui/digital/number-base.js')),
    ],
  },
  {
    id: 'reference',
    icon: 'book',
    title: 'Başvuru',
    calculators: [
      calc('reference/tables', 'Sabitler ve tablolar', () => import('./ui/reference/tables.js')),
    ],
  },
];

// Arama ve ana sayfa için kısa açıklamalar ve ek anahtar kelimeler.
const META = {
  'circuit/ohm': ['V, I, R, P: bilinen ikisinden diğerleri', 'ohm yasasi gerilim akim direnc guc watt v=ir temel'],
  'circuit/phasor': ['Dikdörtgen ↔ kutupsal, dört işlem, paralel bağlama', 'fazor karmasik sayi kompleks polar kutupsal dikdortgen aci genlik j eslenik'],
  'electronics/rectifier': ['Yarım/tam dalga, köprü: Vdc, ripple, PIV', 'dogrultucu yarim dalga tam dalga kopru diyot ripple dalgalanma filtre kondansator piv'],
  'electronics/zener': ['Zener regülatör analizi ve Rs tasarımı', 'zener diyot regulator gerilim sabitleme seri direnc'],
  'em/point-charge': ['Noktasal yükün E alanı, potansiyeli, Coulomb kuvveti', 'coulomb kuvvet elektrik alan potansiyel noktasal yuk elektromanyetik elektrostatik'],
  'em/capacitance': ['Paralel levha, koaksiyel, küresel kondansatör', 'kapasitans kondansator paralel levha koaksiyel kuresel dielektrik enerji elektromanyetik'],
  'em/magnetic-field': ['Tel, halka, solenoid ve toroidin B alanı', 'manyetik alan biot savart amper solenoid toroid tel halka tesla akı yogunlugu elektromanyetik'],
  'em/inductance': ['Solenoid, toroid, koaksiyel hat endüktansı', 'enduktans bobin solenoid toroid koaksiyel sarim enerji elektromanyetik'],
  'signals/adc': ['LSB, çıkış kodu, SQNR, Nyquist ve örtüşme', 'adc analog dijital donusturucu ornekleme nyquist ortusme aliasing cozunurluk bit lsb sqnr kuantalama'],
  'control/routh': ['Routh tablosu, sağ yarı düzlem kökleri', 'routh hurwitz kararlilik karakteristik polinom kok kontrol'],
  'machines/induction-motor': ['Senkron hız, kayma, moment, verim', 'asenkron induksiyon motor kayma senkron hiz kutup moment tork verim'],
  'reference/tables': ['Sabitler, SI ön ekleri, özdirenç, εr, AWG, E12/E24', 'sabitler tablo fiziksel sabit si on ek ozdirenc dielektrik awg tel e12 e24 bakir'],
  'rf/wavelength': ['Frekanstan dalga boyu, dalga boyundan frekans (εr ile)', 'lambda frekans dalga boyu ghz mhz'],
  'rf/microstrip': ['W, h, εr → Z0 ve εeff; Z0 → W sentezi', 'mikroserit microstrip empedans pcb hat genişlik fr4'],
  'rf/spiral': ['İç/dış yarıçaptan yaklaşık çalışma bandı', 'anten spiral arsimet bant genis bant'],
  'rf/decibel': ['dBm ↔ W, dB ↔ güç/gerilim oranı', 'db dbm desibel guc kazanc oran'],
  'rf/vswr': ['VSWR, yansıma katsayısı ve geri dönüş kaybı', 'vswr swr gamma yansima return loss s11 uyumsuzluk'],
  'circuit/divider': ['Vout ya da istenen çıkış için R2', 'gerilim bolucu voltage divider direnc'],
  'circuit/led': ['Besleme, Vf ve akımdan seri direnç', 'led direnc akim seri'],
  'circuit/filter': ['Birinci derece alçak/yüksek geçiren kesim frekansı', 'rc rl filtre kesim frekansi alcak yuksek gecir'],
  'circuit/rlc': ['Rezonans frekansı, Q ve bant genişliği', 'rlc rezonans q faktor bant genisligi'],
  'circuit/opamp': ['Evirmeyen ve eviren kuvvetlendirici kazancı', 'opamp op-amp kazanc kuvvetlendirici amplifikator'],
  'wind/turbine': ['P = ½ρAv³Cp, Betz sınırı', 'ruzgar turbin guc betz cp'],
  'wind/density': ['Yükseklik ve sıcaklıkla hava yoğunluğu', 'hava yogunlugu rho yukseklik sicaklik isa'],
  'wind/profile': ['Rüzgâr hızını başka yüksekliğe taşıma', 'ruzgar hizi profil yukseklik alfa puruzluluk'],
  'codes/resistor-color': ['Renk bantlarından değer ve tersi', 'renk kodu direnc bant'],
  'codes/smd-resistor': ['472, 1002, 4R7, EIA-96 kodları', 'smd direnc kodu eia96 cip'],
  'codes/capacitor': ['104K, 4n7, 4R7 gibi kodlar', 'kondansator kapasitor kod pf nf seramik'],
  'codes/inductor': ['Renk bantlı ve yazılı (SMD) bobin kodları', 'bobin enduktans kod uh smd'],
  'rf/quarter-wave': ['Z1 = √(Z0·ZL), uzunluk ve bant genişliği', 'ceyrek dalga donusturucu empedans uyumlama lambda/4 eslestirme'],
  'rf/line-input': ['Karmaşık yükle hat girişinde Zin, Γ, VSWR', 'giris empedansi hat zin yuk yansima stub kisa devre acik devre'],
  'rf/coax': ['D, d, εr → Z0, C′, L′; Z0 → D sentezi', 'koaksiyel koaks kablo rg58 empedans'],
  'rf/skin-depth': ['δ, yüzey direnci ve tel AC/DC direnci', 'deri derinligi skin depth iletkenlik bakir yuzey direnci'],
  'rf/noise': ['NF ↔ Te, kademeli katlar (Friis), kTB ve duyarlılık', 'gurultu faktoru sicakligi friis kademe lna ktb duyarlilik'],
  'rf/antenna-basics': ['Kazanç ↔ etkin açıklık, dBd, uzak alan sınırı', 'anten kazanc aciklik dbi dbd uzak alan dipol canak'],
  'rf/radar': ['Hedeften dönen güç ve en büyük menzil', 'radar menzil denklemi rcs kesit alani'],
  'circuit/parallel-rlc': ['Paralel (tank) devrede f0, Q ve bant genişliği', 'paralel rlc rezonans tank q faktor'],
  'circuit/impedance': ['Seri/paralel R, L, C empedansı, faz, akım ve güç', 'empedans reaktans faz acisi xl xc admitans'],
  'circuit/ac-power': ['Güç üçgeni ve güç faktörü düzeltme kondansatörü', 'ac guc faktoru kompanzasyon cos phi reaktif aktif gorunur kondansator'],
  'circuit/timer555': ['Astable frekans/görev oranı, monostable darbe süresi', '555 zamanlayici timer astable monostable osilator'],
  'circuit/wheatstone': ['Dengede Rx ya da dengesiz köprüde Vout', 'wheatstone kopru denge gerinim olcer'],
  'circuit/thevenin': ['Thevenin ↔ Norton, yük gücü, en büyük güç aktarımı', 'thevenin norton esdeger maksimum guc aktarimi'],
  'circuit/wye-delta': ['Yıldız ve üçgen direnç ağları arası dönüşüm', 'yildiz ucgen y delta donusum star'],
  'circuit/cable': ['Gerilim düşümüne göre kablo kesiti (DC, 1 faz, 3 faz)', 'iletken kesit kablo gerilim dusumu mm2 bakir aluminyum'],
  'electronics/bjt-bias': ['Gerilim bölücülü polarmada Q noktası ve yük doğrusu', 'bjt transistor polarma bias q noktasi yuk dogrusu npn'],
  'signals/fourier': ['Kare, üçgen, testere dalganın harmonikleri', 'fourier serisi harmonik thd gibbs kare dalga'],
  'signals/bode': ['Kutup/sıfırdan genlik-faz, kazanç ve faz payı', 'bode diyagrami faz payi kazanc payi kararlilik transfer fonksiyonu'],
  'control/second-order': ['ζ, ωn → aşım, yerleşme, yükselme süresi', 'ikinci derece sistem basamak yaniti asim yerlesme sonum zeta kontrol'],
  'machines/transformer': ['Oran, akımlar, verim ve gerilim regülasyonu', 'transformator trafo verim regulasyon donusturme orani'],
  'machines/three-phase': ['Y/Δ faz-hat değerleri ve üç faz güç', 'uc faz yildiz ucgen hat gerilimi faz akimi guc'],
  'distribution/voltage-drop': ['Tek/üç faz %e, hat kaybı, kesit; çok yüklü hatta yük momenti', 'gerilim dusumu yuzde e kesit yuk momenti dagitim hatti kablo kayip enerji dagitimi'],
  'distribution/short-circuit': ['Trafo, şebeke ve kablodan I″k3 ve darbe akımı', 'kisa devre akimi iec 60909 trafo uk darbe akimi kesme kapasitesi'],
  'distribution/grounding': ['Çubuk, şerit ve levha topraklayıcı direnci', 'topraklama direnci cubuk serit levha toprak ozdirenci elektrot'],
  'ml/confusion': ['TP/FP/FN/TN → doğruluk, kesinlik, duyarlılık, F1, MCC', 'karisiklik matrisi confusion matrix precision recall f1 mcc dogruluk siniflandirma makine ogrenmesi'],
  'ml/regression': ['Veri noktalarından en küçük kareler doğrusu ve R²', 'dogrusal regresyon en kucuk kareler r2 egim tahmin makine ogrenmesi'],
  'ml/activation': ['Sigmoid, tanh, ReLU: değer, türev ve grafik', 'aktivasyon fonksiyonu sigmoid tanh relu leaky softplus sinir agi turev'],
  'analog/mosfet': ['ID, bölge, gm, ro, gm·ro; W/L boyutlandırma', 'mosfet kare yasasi nmos pmos gm ro vov w/l doyma trioid analog tumdevre'],
  'analog/common-source': ['Direnç yüklü CS kuvvetlendirici: Av, Rout, bant genişliği', 'ortak kaynakli kuvvetlendirici common source kazanc analog tumdevre'],
  'analog/current-mirror': ['Iout, kopyalama hatası, Rout ve en küçük çıkış gerilimi', 'akim aynasi current mirror kaskod analog tumdevre'],
  'comm/modulation': ['AM güç ve verim, FM Carson ve Bessel spektrumu', 'am fm modulasyon carson bessel bant genisligi haberlesme'],
  'digital/karnaugh': ['Mintermlerden en sade SOP, K-haritası', 'karnaugh harita mantik sadelestirme quine mccluskey sop minterm'],
  'rf/link-budget': ['Alınan güç, bağlantı payı ve en büyük mesafe', 'friis link butce fspl yol kaybi menzil alinan guc eirp'],
  'rf/patch': ['f, εr, h → W, L ve girintili besleme', 'yama patch mikroserit anten tasarim inset'],
  'circuit/combine': ['R, L, C seri ve paralel toplam değer', 'seri paralel esdeger direnc kondansator bobin toplam'],
  'circuit/transient': ['Basamak girişte vC(t) ve iL(t), τ ve yükselme süresi', 'gecici yanit rc rl sarj desarj zaman sabiti tau'],
  'wind/aep': ['Weibull dağılımıyla yıllık enerji ve kapasite faktörü', 'weibull aep yillik enerji kapasite faktoru rayleigh'],
  'digital/number-base': ['İkili, sekizli, onluk, onaltılı; ikinin tümleyeni', 'sayi tabani binary hex ikili onaltili ikinin tumleyeni bit'],
};

for (const category of categories) {
  for (const calc of category.calculators) {
    const [summary = '', keywords = ''] = META[calc.id] ?? [];
    calc.summary = summary;
    calc.category = category.title;
    calc.searchText = normalize(`${calc.title} ${summary} ${keywords} ${category.title}`);
  }
}

/** Türkçe harfleri ve büyük/küçük harfi aramada eşitler: "Direnç" ~ "direnc". */
export function normalize(text) {
  return text
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (ch) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[ch])
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Sorgudaki her kelime hesaplayıcının metninde geçiyorsa eşleşir. */
export function matches(calc, query) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return words.every((w) => calc.searchText.includes(w));
}

export function allCalculators() {
  return categories.flatMap((c) => c.calculators);
}

export function findCalculator(id) {
  for (const category of categories) {
    const found = category.calculators.find((calc) => calc.id === id);
    if (found) return found;
  }
  return null;
}

// Sayfa altındaki "İlgili hesaplayıcılar": önce bu elle seçilmiş (dersler arası) bağlar,
// sonra aynı dersteki komşu hesaplayıcılar.
const RELATED = {
  'circuit/ohm': ['circuit/divider', 'circuit/combine', 'circuit/led', 'reference/tables'],
  'circuit/phasor': ['circuit/impedance', 'circuit/ac-power', 'rf/line-input', 'machines/three-phase'],
  'circuit/impedance': ['circuit/phasor', 'circuit/ac-power'],
  'circuit/ac-power': ['circuit/phasor', 'machines/three-phase'],
  'circuit/rlc': ['control/second-order', 'circuit/parallel-rlc'],
  'circuit/filter': ['signals/bode', 'circuit/transient'],
  'circuit/cable': ['distribution/voltage-drop', 'reference/tables'],
  'circuit/combine': ['em/capacitance', 'em/inductance'],
  'electronics/rectifier': ['electronics/zener', 'machines/transformer', 'circuit/transient'],
  'electronics/zener': ['electronics/rectifier', 'circuit/led'],
  'electronics/bjt-bias': ['analog/mosfet', 'circuit/thevenin'],
  'em/point-charge': ['em/capacitance', 'reference/tables'],
  'em/capacitance': ['rf/coax', 'circuit/combine', 'codes/capacitor'],
  'em/magnetic-field': ['em/inductance', 'machines/transformer'],
  'em/inductance': ['em/magnetic-field', 'codes/inductor', 'rf/coax'],
  'signals/adc': ['digital/number-base', 'signals/fourier'],
  'signals/bode': ['control/routh', 'circuit/filter'],
  'control/routh': ['control/second-order', 'signals/bode'],
  'control/second-order': ['control/routh', 'circuit/rlc'],
  'machines/induction-motor': ['machines/three-phase', 'machines/transformer'],
  'machines/transformer': ['machines/induction-motor', 'electronics/rectifier'],
  'distribution/voltage-drop': ['circuit/cable'],
  'comm/modulation': ['signals/fourier', 'rf/link-budget', 'signals/adc'],
  'rf/skin-depth': ['reference/tables'],
  'rf/coax': ['em/capacitance', 'em/inductance'],
  'analog/mosfet': ['electronics/bjt-bias'],
  'reference/tables': ['codes/resistor-color', 'circuit/cable', 'rf/skin-depth'],
};

/** Bir hesaplayıcıya ilgili en çok `max` hesaplayıcı. */
export function relatedCalculators(id, max = 6) {
  const out = [];
  const add = (c) => { if (c && c.id !== id && !out.includes(c)) out.push(c); };
  for (const rid of RELATED[id] ?? []) add(findCalculator(rid));
  const category = categories.find((c) => c.calculators.some((x) => x.id === id));
  if (category) {
    const list = category.calculators;
    const at = list.findIndex((x) => x.id === id);
    // Komşulardan başlayarak dışa doğru
    for (let d = 1; d < list.length && out.length < max; d += 1) {
      add(list[at + d]);
      if (out.length < max) add(list[at - d]);
    }
  }
  return out.slice(0, max);
}
