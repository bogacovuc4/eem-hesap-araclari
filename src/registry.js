// Tüm hesaplayıcıların listesi. Yeni bir hesaplayıcı eklemek için
// görünüm modülünü içe aktarıp ilgili kategorinin listesine ekleyin.
import wavelength from './ui/rf/wavelength.js';
import microstrip from './ui/rf/microstrip.js';
import spiral from './ui/rf/spiral.js';
import decibel from './ui/rf/decibel.js';
import vswr from './ui/rf/vswr.js';
import linkBudget from './ui/rf/link-budget.js';
import patch from './ui/rf/patch.js';
import quarterWave from './ui/rf/quarter-wave.js';
import lineInput from './ui/rf/line-input.js';
import coax from './ui/rf/coax.js';
import skinDepth from './ui/rf/skin-depth.js';
import noise from './ui/rf/noise.js';
import antennaBasics from './ui/rf/antenna-basics.js';
import radar from './ui/rf/radar.js';
import divider from './ui/circuit/divider.js';
import led from './ui/circuit/led.js';
import filter from './ui/circuit/filter.js';
import rlc from './ui/circuit/rlc.js';
import opamp from './ui/circuit/opamp.js';
import combine from './ui/circuit/combine.js';
import transient from './ui/circuit/transient.js';
import parallelRlc from './ui/circuit/parallel-rlc.js';
import impedanceCalc from './ui/circuit/impedance.js';
import acPower from './ui/circuit/ac-power.js';
import timer555 from './ui/circuit/timer555.js';
import wheatstone from './ui/circuit/wheatstone.js';
import thevenin from './ui/circuit/thevenin.js';
import wyeDelta from './ui/circuit/wye-delta.js';
import cable from './ui/circuit/cable.js';
import turbine from './ui/wind/turbine.js';
import density from './ui/wind/density.js';
import profile from './ui/wind/profile.js';
import aep from './ui/wind/aep.js';
import resistorColor from './ui/codes/resistor-color.js';
import smdResistor from './ui/codes/smd-resistor.js';
import capacitorCode from './ui/codes/capacitor-code.js';
import inductorCode from './ui/codes/inductor-code.js';
import numberBase from './ui/digital/number-base.js';
import karnaugh from './ui/digital/karnaugh.js';
import bjtBias from './ui/electronics/bjt-bias.js';
import fourier from './ui/signals/fourier.js';
import bode from './ui/signals/bode.js';
import secondOrder from './ui/control/second-order.js';
import transformer from './ui/machines/transformer.js';
import threePhase from './ui/machines/three-phase.js';
import modulation from './ui/comm/modulation.js';
import voltageDrop from './ui/distribution/voltage-drop.js';
import shortCircuit from './ui/distribution/short-circuit.js';
import grounding from './ui/distribution/grounding.js';
import confusion from './ui/ml/confusion.js';
import regression from './ui/ml/regression.js';
import activationFn from './ui/ml/activation.js';
import mosfetCalc from './ui/analog/mosfet.js';
import commonSourceAmp from './ui/analog/common-source.js';
import currentMirrorCalc from './ui/analog/current-mirror.js';

export const categories = [
  {
    id: 'rf',
    icon: 'antenna',
    title: 'Anten / RF',
    calculators: [wavelength, microstrip, coax, lineInput, quarterWave, patch, spiral, antennaBasics, linkBudget, radar, noise, skinDepth, decibel, vswr],
  },
  {
    id: 'circuit',
    icon: 'chip',
    title: 'Devre',
    calculators: [combine, divider, wyeDelta, thevenin, wheatstone, impedanceCalc, filter, transient, rlc, parallelRlc, acPower, opamp, timer555, led, cable],
  },
  {
    id: 'electronics',
    icon: 'transistor',
    title: 'Elektronik',
    calculators: [bjtBias],
  },
  {
    id: 'signals',
    icon: 'sine',
    title: 'Sinyaller ve sistemler',
    calculators: [fourier, bode],
  },
  {
    id: 'control',
    icon: 'target',
    title: 'Kontrol sistemleri',
    calculators: [secondOrder],
  },
  {
    id: 'power',
    icon: 'bolt',
    title: 'Elektrik makineleri ve güç sistemleri',
    calculators: [transformer, threePhase],
  },
  {
    id: 'distribution',
    icon: 'pylon',
    title: 'Enerji dağıtımı',
    calculators: [voltageDrop, shortCircuit, grounding],
  },
  {
    id: 'analog',
    icon: 'ic',
    title: 'Analog tümdevre tasarımı',
    calculators: [mosfetCalc, commonSourceAmp, currentMirrorCalc],
  },
  {
    id: 'comm',
    icon: 'broadcast',
    title: 'Haberleşme',
    calculators: [modulation],
  },
  {
    id: 'ml',
    icon: 'network',
    title: 'Makine öğrenmesi',
    calculators: [confusion, regression, activationFn],
  },
  {
    id: 'wind',
    icon: 'wind',
    title: 'Rüzgâr enerjisi',
    calculators: [turbine, aep, density, profile],
  },
  {
    id: 'codes',
    icon: 'tag',
    title: 'Bileşen kodları',
    calculators: [resistorColor, smdResistor, capacitorCode, inductorCode],
  },
  {
    id: 'digital',
    icon: 'binary',
    title: 'Sayısal',
    calculators: [karnaugh, numberBase],
  },
];

// Arama ve ana sayfa için kısa açıklamalar ve ek anahtar kelimeler.
const META = {
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
