import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatNumber } from '../../calc/units.js';
import { fromPolar, toPolar, complexOp } from '../../calc/basics.js';

const rect = (z) => `${formatNumber(z.re, 5)} ${z.im < 0 ? '−' : '+'} j${formatNumber(Math.abs(z.im), 5)}`;
const polar = (z) => { const p = toPolar(z); return `${formatNumber(p.mag, 5)} ∠ ${formatNumber(p.deg, 5)}°`; };
const both = (z) => `${rect(z)}  =  ${polar(z)}`;
const any = (key, label, value) => ({ key, label, name: label, value, constraint: 'any' });

function opsPanel(kind) {
  const isPolar = kind === 'polar';
  const fields = isPolar
    ? [any('am', 'A genliği |A|', '10'), any('ad', 'A açısı (°)', '30'), any('bm', 'B genliği |B|', '5'), any('bd', 'B açısı (°)', '-45')]
    : [any('ar', 'A gerçel kısım', '3'), any('ai', 'A sanal kısım', '4'), any('br', 'B gerçel kısım', '1'), any('bi', 'B sanal kısım', '-2')];
  return calculatorPanel({
    fields,
    compute(v) {
      const a = isPolar ? fromPolar(v.am, v.ad) : { re: v.ar, im: v.ai };
      const b = isPolar ? fromPolar(v.bm, v.bd) : { re: v.br, im: v.bi };
      const safe = (op) => { try { return both(complexOp(a, b, op)); } catch { return '— (sıfıra bölme)'; } };
      return {
        results: [
          { label: 'A', value: both(a) },
          { label: 'B', value: both(b) },
          { label: 'A + B', value: both(complexOp(a, b, 'add')) },
          { label: 'A − B', value: both(complexOp(a, b, 'sub')) },
          { label: 'A × B', value: both(complexOp(a, b, 'mul')) },
          { label: 'A ÷ B', value: safe('div') },
          { label: 'A ∥ B = AB/(A+B)', value: safe('par') },
          { label: 'A* (eşlenik)', value: both({ re: a.re, im: -a.im }) },
          { label: '1/A', value: (() => { try { return both(complexOp({ re: 1, im: 0 }, a, 'div')); } catch { return '—'; } })() },
        ],
      };
    },
    formulas: [
      formula(String.raw`A=a+jb=|A|\angle\theta,\quad |A|=\sqrt{a^2+b^2},\quad \theta=\operatorname{atan2}(b,a)`, 'A = a + jb = |A|∠θ,  |A| = √(a²+b²),  θ = atan2(b, a)'),
      formula(String.raw`AB=|A||B|\angle(\theta_A+\theta_B),\qquad \frac{A}{B}=\frac{|A|}{|B|}\angle(\theta_A-\theta_B)`, 'A·B = |A||B|∠(θA+θB),  A/B = |A|/|B| ∠(θA−θB)'),
    ],
    notes: [
      'Toplama/çıkarma dikdörtgen biçimde, çarpma/bölme kutupsal biçimde kolaydır; sonuçlar iki biçimde de verilir.',
      'A ∥ B, iki empedansın paralel eşdeğeridir. Açılar −180°…180° aralığında verilir.',
      'Fazörler genelde RMS değerle yazılır: v(t) = √2·|V|·cos(ωt + θ).',
    ],
  });
}

export default {
  id: 'circuit/phasor',
  title: 'Fazör / karmaşık sayı',
  render(container) {
    container.append(calculatorView({
      title: 'Fazör ve karmaşık sayı hesaplayıcı',
      intro: 'Dikdörtgen ↔ kutupsal dönüşüm, dört işlem, paralel bağlama ve eşlenik.',
      modes: [
        {
          id: 'convert',
          label: 'Dönüşüm',
          build: () => calculatorPanel({
            fields: [any('re', 'Gerçel kısım a', '3'), any('im', 'Sanal kısım b', '4')],
            compute(v) {
              const p = toPolar({ re: v.re, im: v.im });
              return {
                results: [
                  { label: 'Kutupsal', value: polar({ re: v.re, im: v.im }) },
                  { label: 'Genlik |z|', value: formatNumber(p.mag, 6) },
                  { label: 'Açı θ (derece)', value: `${formatNumber(p.deg, 6)}°` },
                  { label: 'Açı θ (radyan)', value: `${formatNumber((p.deg * Math.PI) / 180, 6)} rad` },
                ],
              };
            },
            formulas: [formula(String.raw`|z|=\sqrt{a^2+b^2},\qquad \theta=\operatorname{atan2}(b,a)`, '|z| = √(a²+b²),  θ = atan2(b, a)')],
            notes: ['atan2 açıyı doğru çeyrekte verir (ör. −1 − j1 → −135°).'],
          }),
        },
        {
          id: 'toRect',
          label: 'Kutupsal → dikdörtgen',
          build: () => calculatorPanel({
            fields: [any('m', 'Genlik |z|', '10'), any('d', 'Açı θ (°)', '36.87')],
            compute(v) {
              const z = fromPolar(v.m, v.d);
              return { results: [{ label: 'Dikdörtgen', value: rect(z) }, { label: 'Gerçel a = |z|cos θ', value: formatNumber(z.re, 6) }, { label: 'Sanal b = |z|sin θ', value: formatNumber(z.im, 6) }] };
            },
            formulas: [formula(String.raw`a=|z|\cos\theta,\qquad b=|z|\sin\theta`, 'a = |z|·cos θ,  b = |z|·sin θ')],
          }),
        },
        { id: 'ops', label: 'İşlemler (a + jb)', build: () => opsPanel('rect') },
        { id: 'opsPolar', label: 'İşlemler (|z|∠θ)', build: () => opsPanel('polar') },
      ],
    }));
  },
};
