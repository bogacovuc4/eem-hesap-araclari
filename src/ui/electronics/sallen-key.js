import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber, RESISTANCE_UNITS, CAPACITANCE_UNITS, FREQUENCY_UNITS } from '../../calc/units.js';
import { sallenKeyLowpass, sallenKeyDesign, secondOrderLowpassDb } from '../../calc/electronics.js';
import { lineChart } from '../chart.js';

function response(f0, q) {
  if (!(f0 > 0 && q > 0)) return null;
  const pts = [];
  for (let k = 0; k <= 240; k += 1) {
    const lx = Math.log10(f0) - 2 + (k / 240) * 4;
    pts.push({ x: lx, y: secondOrderLowpassDb(10 ** lx, f0, q) });
  }
  return lineChart({
    title: 'Genlik yanıtı',
    points: pts,
    xLabel: 'Frekans (Hz, logaritmik)',
    yLabel: 'Kazanç (dB)',
    xFormat: (x) => formatSI(10 ** x, 'Hz', 2),
    yFormat: (y, precise) => formatNumber(y, precise ? 4 : 3),
    refs: [{ x: Math.log10(f0), label: 'f0' }],
  });
}

const notes = [
  'Birim kazançlı (gerilim izleyici) Sallen–Key alçak geçiren; C1 çıkıştan geri besleme kondansatörü, C2 toprak kondansatörü.',
  'Q = 0,707 Butterworth (en düz geçiş bandı), Q = 0,577 Bessel (en düz grup gecikmesi), Q > 0,707 tepe (Chebyshev benzeri).',
  'Geçiş bandının çok üstünde op-amp çıkış empedansı nedeniyle sönüm bozulur; ideal op-amp varsayılır.',
];
const formulas = [formula(String.raw`f_0=\frac{1}{2\pi\sqrt{R_1R_2C_1C_2}},\qquad Q=\frac{\sqrt{R_1R_2C_1C_2}}{C_2(R_1+R_2)},\qquad H(s)=\frac{\omega_0^2}{s^2+\frac{\omega_0}{Q}s+\omega_0^2}`, 'f0 = 1/(2π√(R1R2C1C2)),  Q = √(R1R2C1C2)/(C2(R1+R2))')];

export default {
  id: 'electronics/sallen-key',
  title: 'Sallen–Key aktif filtre',
  render(container) {
    container.append(calculatorView({
      title: 'Sallen–Key 2. derece alçak geçiren filtre',
      intro: 'Elemanlardan f0 ve Q; ya da istenen f0 ve Q için eşit dirençli tasarım. Genlik yanıtı grafiğiyle.',
      modes: [
        {
          id: 'analysis',
          label: 'Analiz',
          build: () => calculatorPanel({
            fields: [
              { key: 'r1', label: 'R1', name: 'R1', value: '10', units: RESISTANCE_UNITS, unit: 'kΩ' },
              { key: 'r2', label: 'R2', name: 'R2', value: '10', units: RESISTANCE_UNITS, unit: 'kΩ' },
              { key: 'c1', label: 'C1 (geri besleme)', name: 'C1', value: '22', units: CAPACITANCE_UNITS, unit: 'nF' },
              { key: 'c2', label: 'C2 (toprak)', name: 'C2', value: '10', units: CAPACITANCE_UNITS, unit: 'nF' },
            ],
            compute(v) {
              const r = sallenKeyLowpass(v);
              return {
                results: [
                  { label: 'Kesim (doğal) frekansı f0', value: formatSI(r.f0, 'Hz') },
                  { label: 'Kalite faktörü Q', value: formatNumber(r.q, 4) },
                  { label: 'Sönüm oranı ζ = 1/(2Q)', value: formatNumber(1 / (2 * r.q), 4) },
                  { label: 'f0’daki kazanç', value: `${formatNumber(secondOrderLowpassDb(r.f0, r.f0, r.q), 4)} dB` },
                  { label: 'Yanıt tipi', value: Math.abs(r.q - 0.7071) < 0.02 ? 'Butterworth' : Math.abs(r.q - 0.5774) < 0.02 ? 'Bessel' : r.q > 0.7071 ? 'tepeli (Q > 0,707)' : 'aşırı sönümlü' },
                ],
              };
            },
            diagram: (v, out) => (out ? response(sallenKeyLowpass(v).f0, sallenKeyLowpass(v).q) : null),
            diagramTitle: 'Genlik yanıtı',
            formulas,
            notes,
          }),
        },
        {
          id: 'design',
          label: 'Tasarım',
          build: () => calculatorPanel({
            fields: [
              { key: 'f0', label: 'İstenen kesim frekansı f0', name: 'f0', value: '1', units: FREQUENCY_UNITS, unit: 'kHz' },
              { key: 'q', label: 'İstenen Q', name: 'Q', value: '0.7071', hint: 'Butterworth 0,7071; Bessel 0,5774' },
              { key: 'c2', label: 'Seçilen C2 (toprak)', name: 'C2', value: '10', units: CAPACITANCE_UNITS, unit: 'nF' },
            ],
            compute(v) {
              const d = sallenKeyDesign(v);
              return {
                results: [
                  { label: 'R1 = R2 = R', value: formatSI(d.r, 'Ω') },
                  { label: 'C1 = 4Q²·C2', value: formatSI(d.c1, 'F') },
                  { label: 'C2', value: formatSI(d.c2, 'F') },
                ],
                warnings: d.r < 1e3 || d.r > 1e6 ? ['R 1 kΩ–1 MΩ aralığı dışında: C2’yi değiştirerek makul bir direnç değeri elde edin.'] : [],
              };
            },
            diagram: (v) => response(v.f0, v.q),
            diagramTitle: 'Genlik yanıtı',
            formulas: [formula(String.raw`R_1=R_2=R:\quad C_1=4Q^2C_2,\qquad R=\frac{1}{4\pi Q f_0 C_2}`, 'R1 = R2 = R:  C1 = 4Q²·C2,  R = 1/(4πQ·f0·C2)')],
            notes: [...notes, 'Hesaplanan değerlere en yakın standart (E12/E24) değerleri seçip Analiz sekmesinde kontrol edin.'],
          }),
        },
      ],
    }));
  },
};
