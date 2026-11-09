// Tüm hesaplayıcıların listesi. Yeni bir hesaplayıcı eklemek için
// görünüm modülünü içe aktarıp ilgili kategorinin listesine ekleyin.
import wavelength from './ui/rf/wavelength.js';
import microstrip from './ui/rf/microstrip.js';
import spiral from './ui/rf/spiral.js';
import decibel from './ui/rf/decibel.js';
import vswr from './ui/rf/vswr.js';
import linkBudget from './ui/rf/link-budget.js';
import patch from './ui/rf/patch.js';
import divider from './ui/circuit/divider.js';
import led from './ui/circuit/led.js';
import filter from './ui/circuit/filter.js';
import rlc from './ui/circuit/rlc.js';
import opamp from './ui/circuit/opamp.js';
import combine from './ui/circuit/combine.js';
import transient from './ui/circuit/transient.js';
import turbine from './ui/wind/turbine.js';
import density from './ui/wind/density.js';
import profile from './ui/wind/profile.js';
import aep from './ui/wind/aep.js';
import resistorColor from './ui/codes/resistor-color.js';
import smdResistor from './ui/codes/smd-resistor.js';
import capacitorCode from './ui/codes/capacitor-code.js';
import inductorCode from './ui/codes/inductor-code.js';
import numberBase from './ui/digital/number-base.js';

export const categories = [
  {
    id: 'rf',
    title: 'Anten / RF',
    calculators: [wavelength, microstrip, patch, spiral, linkBudget, decibel, vswr],
  },
  {
    id: 'circuit',
    title: 'Devre',
    calculators: [combine, divider, led, filter, transient, rlc, opamp],
  },
  {
    id: 'wind',
    title: 'Rüzgâr enerjisi',
    calculators: [turbine, aep, density, profile],
  },
  {
    id: 'codes',
    title: 'Bileşen kodları',
    calculators: [resistorColor, smdResistor, capacitorCode, inductorCode],
  },
  {
    id: 'digital',
    title: 'Sayısal',
    calculators: [numberBase],
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
