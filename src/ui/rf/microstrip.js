import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { LENGTH_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import {
  microstripAnalysis, microstripSynthesis, MICROSTRIP_LIMITS,
} from '../../calc/rf.js';

const { uMin, uMax, erMax } = MICROSTRIP_LIMITS;

function validityWarnings(u, er) {
  const warnings = [];
  if (u < uMin || u > uMax) {
    warnings.push(`W/h = ${formatNumber(u)}: Hammerstad-Jensen formülü ${formatNumber(uMin)} ≤ W/h ≤ ${formatNumber(uMax)} için geçerli; sonuç güvenilir olmayabilir.`);
  }
  if (er > erMax) {
    warnings.push(`εr = ${formatNumber(er)}: formül εr ≤ ${erMax} için doğrulanmıştır.`);
  }
  return warnings;
}

const substrateFields = [
  {
    key: 'h', label: 'Alt tabaka kalınlığı h', name: 'h',
    value: '1.6', units: LENGTH_UNITS, unit: 'mm',
  },
  {
    key: 'er', label: 'Bağıl dielektrik sabiti εr', name: 'εr',
    value: '4.4', min: 1, hint: 'FR-4 ≈ 4,4 · Rogers RO4003C ≈ 3,55 · alümina ≈ 9,8',
  },
];

// Her panel kendi DOM düğümlerine ihtiyaç duyar, bu yüzden fonksiyon.
const formulas = () => [
  formula(
    String.raw`u=\frac{W}{h},\qquad \varepsilon_{\text{eff}}=\frac{\varepsilon_r+1}{2}+\frac{\varepsilon_r-1}{2}\left(1+\frac{10}{u}\right)^{-ab}`,
    'u = W/h,  εeff = (εr+1)/2 + (εr−1)/2 · (1 + 10/u)^(−a·b)',
  ),
  formula(
    String.raw`a=1+\frac{1}{49}\ln\!\left[\frac{u^4+(u/52)^2}{u^4+0.432}\right]+\frac{1}{18.7}\ln\!\left[1+\left(\frac{u}{18.1}\right)^3\right],\qquad b=0.564\left(\frac{\varepsilon_r-0.9}{\varepsilon_r+3}\right)^{0.053}`,
    'a = 1 + (1/49)·ln[(u⁴ + (u/52)²)/(u⁴ + 0,432)] + (1/18,7)·ln[1 + (u/18,1)³],  b = 0,564·((εr − 0,9)/(εr + 3))^0,053',
  ),
  formula(
    String.raw`Z_0=\frac{\eta_0}{2\pi\sqrt{\varepsilon_{\text{eff}}}}\ln\!\left[\frac{F}{u}+\sqrt{1+\left(\frac{2}{u}\right)^2}\right],\qquad F=6+(2\pi-6)\,e^{-(30.666/u)^{0.7528}}`,
    'Z0 = η0 / (2π·√εeff) · ln[F/u + √(1 + (2/u)²)],  F = 6 + (2π − 6)·exp(−(30,666/u)^0,7528)',
  ),
];

const notes = [
  'Hammerstad & Jensen (1980) modeli. 0,01 ≤ W/h ≤ 100 ve εr ≤ 128 aralığında εeff hatası %0,2’den, havadaki empedans hatası %0,03’ten küçüktür.',
  'İletken kalınlığı sıfır (t = 0), kayıpsız hat ve quasi-TEM varsayılır.',
  'Statik model: frekans arttıkça εeff büyür ve Z0 değişir (dispersiyon). Yüksek frekanslarda sonuçlar yaklaşık kalır.',
  'Sentezde W, analiz formülünün sayısal olarak tersine çevrilmesiyle bulunur. Pozar’daki (Wheeler) kapalı-form tahmin karşılaştırma için ayrıca gösterilir.',
];

function analysisPanel() {
  return calculatorPanel({
    fields: [
      { key: 'w', label: 'Şerit genişliği W', name: 'W', value: '3.06', units: LENGTH_UNITS, unit: 'mm' },
      ...substrateFields,
    ],
    compute({ w, h, er }) {
      const { z0, eeff, u } = microstripAnalysis({ w, h, er });
      return {
        results: [
          { label: 'Karakteristik empedans Z0', value: formatSI(z0, 'Ω') },
          { label: 'Etkin dielektrik sabiti εeff', value: formatNumber(eeff) },
          { label: 'W/h', value: formatNumber(u) },
          { label: 'Faz hızı v/c = 1/√εeff', value: formatNumber(1 / Math.sqrt(eeff)) },
        ],
        warnings: validityWarnings(u, er),
      };
    },
    formulas: formulas(),
    notes,
  });
}

function synthesisPanel() {
  return calculatorPanel({
    fields: [
      { key: 'z0', label: 'Hedef empedans Z0 (Ω)', name: 'Z0', value: '50' },
      ...substrateFields,
    ],
    compute({ z0, h, er }) {
      const { w, u, eeff, uEstimate } = microstripSynthesis({ z0, h, er });
      return {
        results: [
          { label: 'Şerit genişliği W', value: formatSI(w, 'm') },
          { label: 'W/h', value: formatNumber(u) },
          { label: 'Etkin dielektrik sabiti εeff', value: formatNumber(eeff) },
          { label: 'Kapalı-form tahmini W (Pozar)', value: formatSI(uEstimate * h, 'm') },
        ],
        warnings: validityWarnings(u, er),
      };
    },
    formulas: formulas(),
    notes,
  });
}

export default {
  id: 'rf/microstrip',
  title: 'Mikroşerit hat',
  render(container) {
    container.append(calculatorView({
      title: 'Mikroşerit hat',
      intro: 'Şerit genişliği ve alt tabakadan karakteristik empedans (analiz) ya da hedef empedanstan şerit genişliği (sentez).',
      modes: [
        { id: 'analysis', label: 'Analiz: W → Z0', build: analysisPanel },
        { id: 'synthesis', label: 'Sentez: Z0 → W', build: synthesisPanel },
      ],
    }));
  },
};
