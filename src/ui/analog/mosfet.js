import { calculatorView, calculatorPanel, verifyNote } from '../form.js';
import { formula } from '../formula.js';
import { VOLTAGE_UNITS, CURRENT_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { mosfet, sizeForCurrent, outputCurve } from '../../calc/analog.js';
import { lineChart } from '../chart.js';

const REGION = { saturation: 'doyma (aktif)', triode: 'doğrusal (triyot)', cutoff: 'kesim' };

const DEFAULTS = {
  nmos: { k: '200', vth: '0.45', label: 'μnCox (µA/V²)' },
  pmos: { k: '80', vth: '0.45', label: 'μpCox (µA/V²)' },
};

const deviceNotes = [
  'Uzun kanal (kare yasası) modeli: alt eşik iletimi, hız doygunluğu, gövde etkisi ve kısa kanal etkileri ihmal edilir. Modern kısa kanallı süreçlerde gerçek akım daha düşük çıkar; benzetim (SPICE) ile doğrulayın.',
  verifyNote('Varsayılan μCox ve VTH değerleri 0,18 µm sınıfı bir süreç için yuvarlak örnek değerlerdir; kendi sürecinizin model dosyasındaki değerleri kullanın.'),
  'PMOS için VSG, VSD ve |VTH| mutlak değer olarak girilir; akım kaynaktan savağa akar.',
];

function devicePanel(type) {
  const d = DEFAULTS[type];
  const p = type === 'pmos';
  return calculatorPanel({
    fields: [
      { key: 'k', label: d.label, name: 'μCox', value: d.k },
      { key: 'wl', label: 'Boyut oranı W/L', name: 'W/L', value: '10' },
      { key: 'vth', label: p ? '|VTH|' : 'Eşik gerilimi VTH', name: 'VTH', value: d.vth, units: VOLTAGE_UNITS, unit: 'V', constraint: 'nonnegative' },
      { key: 'vgs', label: p ? 'VSG' : 'VGS', name: 'VGS', value: '0.8', units: VOLTAGE_UNITS, unit: 'V', constraint: 'nonnegative' },
      { key: 'vds', label: p ? 'VSD' : 'VDS', name: 'VDS', value: '1', units: VOLTAGE_UNITS, unit: 'V', constraint: 'nonnegative' },
      { key: 'lambda', label: 'Kanal boyu modülasyonu λ (1/V)', name: 'λ', value: '0.1', constraint: 'nonnegative', hint: 'Kısa kanalda büyük (≈ 0,1–0,3), uzun kanalda küçük' },
    ],
    compute(v) {
      const m = mosfet({ ...v, k: v.k * 1e-6 });
      const warnings = [];
      if (m.region === 'cutoff') warnings.push('VGS ≤ VTH: transistör kesimde (kare yasası modelinde akım sıfır; gerçekte küçük bir alt eşik akımı akar).');
      if (m.region === 'triode') warnings.push('VDS < VOV: transistör doğrusal bölgede; kuvvetlendirici olarak değil, anahtar ya da direnç gibi davranır.');
      if (m.region === 'saturation' && m.vov < 0.1) warnings.push('VOV < 100 mV: zayıf terslenmeye yakın; kare yasası burada geçerliliğini yitirir.');
      return {
        results: [
          { label: p ? 'Savak akımı |ID|' : 'Savak akımı ID', value: formatSI(m.id, 'A') },
          { label: 'Çalışma bölgesi', value: REGION[m.region] },
          { label: 'Aşırı sürüm gerilimi VOV', value: formatSI(m.vov, 'V') },
          { label: 'Geçiş iletkenliği gm', value: formatSI(m.gm, 'S') },
          { label: 'Çıkış direnci ro', value: Number.isFinite(m.ro) ? formatSI(m.ro, 'Ω') : '∞ (λ = 0)' },
          { label: 'İç kazanç gm·ro', value: Number.isFinite(m.intrinsicGain) ? `${formatNumber(m.intrinsicGain, 4)} (${formatNumber(20 * Math.log10(m.intrinsicGain), 3)} dB)` : '∞' },
          { label: 'gm/ID', value: m.id > 0 ? `${formatNumber(m.gm / m.id, 4)} 1/V` : '—' },
          { label: 'Doyma için en küçük VDS', value: m.vov > 0 ? formatSI(m.vov, 'V') : '—' },
        ],
        warnings,
        raw: m,
      };
    },
    diagram: (v, out) => {
      if (!out) return [];
      const vdsMax = Math.max(2 * v.vds, 1.5 * (v.vgs - v.vth), 0.5);
      const pts = outputCurve({ ...v, k: v.k * 1e-6, vdsMax });
      return lineChart({
        title: `Çıkış karakteristiği: ${p ? '|ID| – VSD' : 'ID – VDS'} (${p ? 'VSG' : 'VGS'} = ${formatSI(v.vgs, 'V', 3)})`,
        points: pts,
        xLabel: p ? 'VSD (V)' : 'VDS (V)',
        yLabel: 'ID (A)',
        xFormat: (x) => formatSI(x, 'V', 2),
        yFormat: (y, precise) => formatSI(y, 'A', precise ? 4 : 2),
        marker: { x: v.vds, y: out.raw.id },
        refs: out.raw.vov > 0 ? [{ x: out.raw.vov, label: 'VOV (doyma sınırı)' }] : [],
      });
    },
    diagramTitle: 'Karakteristik',
    formulas: [
      formula(String.raw`I_D = \tfrac12\mu C_{ox}\tfrac{W}{L}V_{OV}^2(1+\lambda V_{DS}),\quad V_{OV} = V_{GS}-V_{TH},\quad V_{DS}\ge V_{OV}`,
        'ID = ½·μCox·(W/L)·VOV²·(1 + λVDS),  VOV = VGS − VTH  (doyma)'),
      formula(String.raw`g_m = \frac{2I_D}{V_{OV}},\qquad r_o \approx \frac{1}{\lambda I_D},\qquad A_i = g_m r_o`, 'gm = 2ID/VOV,  ro ≈ 1/(λ·ID),  Ai = gm·ro'),
    ],
    notes: deviceNotes,
  });
}

function sizingPanel() {
  return calculatorPanel({
    fields: [
      { key: 'k', label: 'μCox (µA/V²)', name: 'μCox', value: '200' },
      { key: 'id', label: 'İstenen akım ID', name: 'ID', value: '100', units: CURRENT_UNITS, unit: 'µA' },
      { key: 'vov', label: 'Seçilen aşırı sürüm VOV', name: 'VOV', value: '200', units: VOLTAGE_UNITS, unit: 'mV', hint: 'Tipik 100–300 mV: küçük VOV yüksek gm/ID, büyük VOV hızlı ve küçük transistör' },
      { key: 'lmin', label: 'Kanal boyu L (µm)', name: 'L', value: '0.36', hint: 'Kazanç için genellikle en küçük boyun 2–4 katı' },
    ],
    compute(v) {
      const r = sizeForCurrent({ k: v.k * 1e-6, id: v.id, vov: v.vov });
      return {
        results: [
          { label: 'Gereken W/L', value: formatNumber(r.wl, 4) },
          { label: 'Kanal genişliği W', value: `${formatNumber(r.wl * v.lmin, 4)} µm` },
          { label: 'Geçiş iletkenliği gm', value: formatSI(r.gm, 'S') },
          { label: 'gm/ID', value: `${formatNumber(r.gmOverId, 4)} 1/V` },
        ],
        warnings: v.vov < 0.1 ? ['VOV < 100 mV: zayıf terslenme bölgesi, kare yasası geçersizleşir; gm/ID en fazla ≈ 25–30 1/V olur.'] : [],
      };
    },
    formulas: [formula(String.raw`\frac{W}{L} = \frac{2I_D}{\mu C_{ox}V_{OV}^2},\qquad \frac{g_m}{I_D} = \frac{2}{V_{OV}}`, 'W/L = 2ID/(μCox·VOV²),  gm/ID = 2/VOV')],
    notes: [
      'gm/ID tasarım yaklaşımı: önce verimlilik (gm/ID) ve hız arasında VOV seçilir, sonra akım ve W/L bulunur.',
      ...deviceNotes.slice(0, 2),
    ],
  });
}

export default {
  id: 'analog/mosfet',
  title: 'MOSFET (kare yasası)',
  render(container) {
    container.append(calculatorView({
      title: 'MOSFET — kare yasası modeli',
      intro: 'Çalışma bölgesi, savak akımı, gm, ro ve iç kazanç; istenen akım için W/L boyutlandırması.',
      modes: [
        { id: 'nmos', label: 'NMOS', build: () => devicePanel('nmos') },
        { id: 'pmos', label: 'PMOS', build: () => devicePanel('pmos') },
        { id: 'size', label: 'Boyutlandırma', build: sizingPanel },
      ],
    }));
  },
};
