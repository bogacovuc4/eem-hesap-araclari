import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber, VOLTAGE_UNITS, CURRENT_UNITS } from '../../calc/units.js';
import { diodeShockley } from '../../calc/electronics.js';
import { lineChart } from '../chart.js';

const IS_UNITS = { fA: 1e-15, pA: 1e-12, nA: 1e-9, 'µA': 1e-6 };
const COMMON = [
  { key: 'is', label: 'Doyma akımı Is', name: 'Is', value: '10', units: IS_UNITS, unit: 'fA', hint: 'Küçük sinyal Si diyot ≈ 1–10 fA … nA (veri sayfası)' },
  { key: 'n', label: 'İdealite faktörü n', name: 'n', value: '1', min: 1, max: 2.5 },
  { key: 't', label: 'Sıcaklık (°C)', name: 'T', value: '27', constraint: 'any', min: -60, max: 200 },
];

function results(r) {
  return [
    { label: 'Gerilim VD', value: formatSI(r.v, 'V') },
    { label: 'Akım ID', value: formatSI(r.i, 'A') },
    { label: 'Isıl gerilim VT = kT/q', value: formatSI(r.vt, 'V') },
    { label: 'Dinamik direnç rd = nVT/ID', value: formatSI(r.rd, 'Ω') },
    { label: 'Harcanan güç', value: formatSI(r.p, 'W') },
  ];
}

function curve(v) {
  if (![v.is, v.n, v.t].every(Number.isFinite)) return null;
  const pts = [];
  for (let k = 0; k <= 120; k += 1) {
    const vd = (k / 120) * 0.9;
    const r = diodeShockley({ is: v.is, n: v.n, t: v.t + 273.15, v: vd });
    if (r.i > 0.2) break;
    pts.push({ x: vd, y: r.i * 1e3 });
  }
  return lineChart({
    title: 'I–V karakteristiği',
    points: pts,
    xLabel: 'VD (V)',
    yLabel: 'ID (mA)',
    xFormat: (x) => formatNumber(x, 3),
    yFormat: (y, precise) => formatNumber(y, precise ? 4 : 3),
  });
}

const formulas = [formula(String.raw`I_D=I_S\left(e^{V_D/nV_T}-1\right),\qquad V_T=\frac{kT}{q}\approx 25{,}85\ \mathrm{mV}\ (300\,\mathrm{K}),\qquad r_d=\frac{nV_T}{I_D}`, 'ID = Is·(e^(VD/nVT) − 1),  VT = kT/q,  rd = nVT/ID')];
const notes = [
  'İdeal Shockley modeli: seri direnç, yüksek enjeksiyon ve kırılma (zener) bölgesi hesaba katılmaz.',
  'Akım her ~60 mV’ta (n = 1, 300 K) 10 kat artar. Is sıcaklıkla yaklaşık her 10 °C’de iki katına çıkar; burada sabit alınır.',
];

export default {
  id: 'electronics/diode',
  title: 'Diyot (Shockley denklemi)',
  render(container) {
    container.append(calculatorView({
      title: 'Diyot akım–gerilim ilişkisi (Shockley)',
      intro: 'Gerilimden akım ya da akımdan gerilim; ısıl gerilim, dinamik direnç ve I–V eğrisi.',
      modes: [
        {
          id: 'v2i',
          label: 'Gerilimden akım',
          build: () => calculatorPanel({
            fields: [{ key: 'v', label: 'Diyot gerilimi VD', name: 'VD', value: '0.65', units: VOLTAGE_UNITS, unit: 'V', constraint: 'any' }, ...COMMON],
            compute: (v) => ({ results: results(diodeShockley({ is: v.is, n: v.n, t: v.t + 273.15, v: v.v })) }),
            diagram: (v) => curve(v),
            diagramTitle: 'Karakteristik',
            formulas,
            notes,
          }),
        },
        {
          id: 'i2v',
          label: 'Akımdan gerilim',
          build: () => calculatorPanel({
            fields: [{ key: 'i', label: 'Diyot akımı ID', name: 'ID', value: '1', units: CURRENT_UNITS, unit: 'mA' }, ...COMMON],
            compute: (v) => ({ results: results(diodeShockley({ is: v.is, n: v.n, t: v.t + 273.15, i: v.i })) }),
            diagram: (v) => curve(v),
            diagramTitle: 'Karakteristik',
            formulas,
            notes,
          }),
        },
      ],
    }));
  },
};
