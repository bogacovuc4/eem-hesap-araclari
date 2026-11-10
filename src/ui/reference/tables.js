// Başvuru sayfası: fiziksel sabitler, SI ön ekleri, malzeme tabloları, AWG, E serileri.
import { el } from '../dom.js';
import { calculatorView } from '../form.js';
import { formatNumber } from '../../calc/units.js';
import { awgWire, awgName } from '../../calc/reference.js';
import { E_SERIES } from '../../calc/circuit.js';
import { copyButton } from '../clipboard.js';

function table(headers, rows, { caption = '' } = {}) {
  return el('div', { class: 'table-wrap' },
    el('table', { class: 'data-table' },
      caption ? el('caption', {}, caption) : null,
      el('thead', {}, el('tr', {}, ...headers.map((h) => el('th', { scope: 'col' }, h)))),
      el('tbody', {}, ...rows.map((r) => el('tr', {}, ...r.map((c, i) => (i === 0 ? el('th', { scope: 'row' }, c) : el('td', {}, c))))))));
}

const card = (title, ...children) => el('section', { class: 'card card-wide' }, el('h2', {}, title), ...children);
const note = (text) => el('p', { class: 'table-note' }, text);

const CONSTANTS = [
  ['Işık hızı', 'c', '299 792 458', 'm/s', '299792458'],
  ['Temel yük', 'e', '1,602 176 634×10⁻¹⁹', 'C', '1.602176634e-19'],
  ['Planck sabiti', 'h', '6,626 070 15×10⁻³⁴', 'J·s', '6.62607015e-34'],
  ['Boltzmann sabiti', 'k', '1,380 649×10⁻²³', 'J/K', '1.380649e-23'],
  ['Avogadro sayısı', 'N_A', '6,022 140 76×10²³', '1/mol', '6.02214076e23'],
  ['Boşluğun elektrik geçirgenliği', 'ε₀', '8,854 187 8128×10⁻¹²', 'F/m', '8.8541878128e-12'],
  ['Boşluğun manyetik geçirgenliği', 'μ₀', '1,256 637 062 12×10⁻⁶', 'H/m', '1.25663706212e-6'],
  ['Boşluğun dalga empedansı', 'η₀ = √(μ₀/ε₀)', '≈ 376,73', 'Ω', '376.730313668'],
  ['Elektron kütlesi', 'mₑ', '9,109 383 7015×10⁻³¹', 'kg', '9.1093837015e-31'],
  ['Elektron-volt', 'eV', '1,602 176 634×10⁻¹⁹', 'J', '1.602176634e-19'],
  ['Isıl gerilim (300 K)', 'V_T = kT/q', '≈ 25,85', 'mV', '0.025852'],
];

const PREFIXES = [
  ['T', 'tera', '10¹²'], ['G', 'giga', '10⁹'], ['M', 'mega', '10⁶'], ['k', 'kilo', '10³'],
  ['m', 'mili', '10⁻³'], ['µ', 'mikro', '10⁻⁶'], ['n', 'nano', '10⁻⁹'], ['p', 'piko', '10⁻¹²'], ['f', 'femto', '10⁻¹⁵'],
];

// Tipik değerler (20 °C); kaynaklar ve alaşım/saflığa göre küçük farklar olur.
const RESISTIVITY = [
  ['Gümüş', '1,59×10⁻⁸', '0,0038'],
  ['Bakır', '1,68×10⁻⁸', '0,0039'],
  ['Altın', '2,44×10⁻⁸', '0,0034'],
  ['Alüminyum', '2,65×10⁻⁸', '0,0039'],
  ['Tungsten', '5,6×10⁻⁸', '0,0045'],
  ['Demir', '9,7×10⁻⁸', '0,005'],
  ['Nikrom', '1,10×10⁻⁶', '0,0004'],
];

const PERMITTIVITY = [
  ['Boşluk', '1'],
  ['Hava (deniz seviyesi)', '≈ 1,0006'],
  ['PTFE (teflon)', '≈ 2,1'],
  ['Polietilen', '≈ 2,25'],
  ['FR-4 (PCB)', '≈ 4,3–4,8 (frekansa bağlı)'],
  ['Alümina seramik', '≈ 9,8'],
  ['Silisyum', '≈ 11,7'],
  ['Galyum arsenür', '≈ 12,9'],
  ['Saf su (20 °C)', '≈ 80'],
];

function awgTable() {
  const rows = [];
  for (let n = -3; n <= 30; n += 1) {
    if (n > 0 && n < 30 && n % 2 === 1 && n > 18) continue; // ince tellerde ikişer adım
    const w = awgWire(n);
    rows.push([
      awgName(n),
      formatNumber(w.d * 1e3, 4),
      formatNumber(w.area * 1e6, 4),
      formatNumber(w.rPerM * 1e3, 4),
    ]);
  }
  return table(['AWG', 'Çap (mm)', 'Kesit (mm²)', 'Bakır direnci (Ω/km, 20 °C)'], rows);
}

function eSeries(name) {
  return el('div', { class: 'series-row' },
    el('strong', {}, name),
    el('span', { class: 'series-values' }, E_SERIES[name].map((x) => formatNumber(x, 2)).join(' · ')));
}

function render() {
  return el('div', { class: 'panel-grid reference' },
    card('Fiziksel sabitler',
      table(['Büyüklük', 'Sembol', 'Değer', 'Birim', ''],
        CONSTANTS.map(([name, sym, val, unit, raw]) => [name, sym, val, unit,
          copyButton({ getText: () => raw, label: `${name} değerini kopyala` })])),
      note('SI 2019 tanımıyla c, e, h, k ve N_A tamdır; ε₀ ve μ₀ CODATA 2018 değerleridir.')),
    card('SI ön ekleri',
      table(['Sembol', 'Ad', 'Çarpan'], PREFIXES)),
    card('Özdirenç ve sıcaklık katsayısı',
      table(['Malzeme', 'ρ (Ω·m, 20 °C)', 'α (1/°C)'], RESISTIVITY),
      note('Tipik değerler; alaşım ve saflığa göre değişir. R(T) ≈ R₂₀·[1 + α(T − 20 °C)]. Kablo hesaplarında tavlanmış bakır için ρ = 1,724×10⁻⁸ Ω·m kullanılır.')),
    card('Bağıl dielektrik sabiti εr',
      table(['Malzeme', 'εr'], PERMITTIVITY),
      note('Yaklaşık oda sıcaklığı ve düşük frekans değerleri; tasarımda üreticinin veri sayfasını esas alın.')),
    card('Standart direnç serileri (IEC 60063)',
      eSeries('E12'), eSeries('E24'),
      note('Her değer 10’un kuvvetleriyle çarpılır: 4,7 → 4,7 Ω, 47 Ω, 470 Ω, 4,7 kΩ… E96 değerleri için Bileşen kodları → SMD direnç sayfasına bakın.')),
    card('AWG tel ölçüleri',
      awgTable(),
      note('Değerler tanımdan hesaplanır: d = 0,127 mm · 92^((36 − n)/39). Direnç, tavlanmış bakır (ρ = 1,724×10⁻⁸ Ω·m) içindir. Akım taşıma kapasitesi yalıtım ve ortama bağlıdır, buradan çıkarılmaz.')),
  );
}

export default {
  id: 'reference/tables',
  title: 'Sabitler ve tablolar',
  render(container) {
    container.append(calculatorView({
      title: 'Sabitler ve tablolar',
      intro: 'Sık kullanılan fiziksel sabitler, SI ön ekleri, malzeme değerleri, direnç serileri ve AWG tel tablosu.',
      modes: [{ id: 'tables', label: 'Tablolar', build: render }],
    }));
  },
};
