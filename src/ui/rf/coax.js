import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { LENGTH_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { coaxAnalysis, coaxRatioForZ0 } from '../../calc/rf2.js';
import { C0 } from '../../calc/constants.js';
import { svg, figure, label, s, fmt } from '../schematic.js';

/** Kesit: dış iletken halkası, dielektrik, iç iletken (oranlar ölçekli). */
function crossSection(outer, inner) {
  const ok = Number.isFinite(outer) && Number.isFinite(inner) && outer > inner && inner > 0;
  const R = 70;
  const r = ok ? Math.max(3, (R * inner) / outer) : 20;
  const cx = 120;
  const cy = 100;
  return figure(svg([0, 0, 360, 200], 'Koaksiyel hat kesiti',
    s('circle', { cx, cy, r: R + 8, class: 'coax-shield' }),
    s('circle', { cx, cy, r: R, class: 'coax-dielectric' }),
    s('circle', { cx, cy, r, class: 'coax-center' }),
    s('line', { x1: cx - R, y1: cy + R + 18, x2: cx + R, y2: cy + R + 18, class: 'dim-line' }),
    s('line', { x1: cx - r, y1: cy, x2: cx + r, y2: cy, class: 'dim-line coax-inner-dim' }),
    label(240, 70, 'D', ok ? fmt(outer, 'm') : ''),
    label(240, 120, 'd', ok ? fmt(inner, 'm') : ''),
    label(240, 170, 'D/d', ok ? formatNumber(outer / inner, 4) : '?'),
  ), 'Ölçekli kesit · D: dış iletkenin iç çapı, d: iç iletken çapı');
}

function results(r, er) {
  return [
    { label: 'Karakteristik empedans Z0', value: formatSI(r.z0, 'Ω') },
    { label: 'Birim uzunluk kapasitesi C′', value: `${formatSI(r.c, 'F')}/m` },
    { label: 'Birim uzunluk endüktansı L′', value: `${formatSI(r.l, 'H')}/m` },
    { label: 'Hız faktörü VF = 1/√εr', value: formatNumber(r.velocityFactor) },
    { label: 'Gecikme', value: `${formatSI(Math.sqrt(er) / C0, 's')}/m` },
    { label: 'TE11 kesim frekansı (yaklaşık)', value: formatSI(r.te11, 'Hz') },
  ];
}

const erField = { key: 'er', label: 'Dielektrik sabiti εr', name: 'εr', value: '2.25', min: 1, hint: 'Hava 1 · PTFE 2,1 · katı PE 2,25 · köpük PE ≈ 1,5' };

const formulas = () => [
  formula(String.raw`Z_0 = \frac{\eta_0}{2\pi\sqrt{\varepsilon_r}}\ln\frac{D}{d} \approx \frac{60}{\sqrt{\varepsilon_r}}\ln\frac{D}{d},\qquad C' = \frac{2\pi\varepsilon}{\ln(D/d)},\qquad L' = \frac{\mu_0}{2\pi}\ln\frac{D}{d}`,
    'Z0 = η0/(2π√εr)·ln(D/d) ≈ (60/√εr)·ln(D/d),  C′ = 2πε/ln(D/d),  L′ = (μ0/2π)·ln(D/d)'),
  formula(String.raw`f_{c,\text{TE}_{11}} \approx \frac{c}{\pi\,\frac{D+d}{2}\,\sqrt{\varepsilon_r}}`, 'fc(TE11) ≈ c / (π·(D+d)/2·√εr)'),
];

const notes = [
  'Kayıpsız TEM hat; iletkenler ideal, dielektrik homojen kabul edilir.',
  'TE11 kesim frekansı λc ≈ π(a + b) yaklaşımıyla verilir (a, b yarıçaplar); hat bunun altında tek modlu kullanılmalıdır.',
  '50 Ω yaygın bir uzlaşmadır: en düşük kayıp D/d ≈ 3,6 (≈ 77 Ω hava), en yüksek güç D/d ≈ 1,65 (≈ 30 Ω hava) civarındadır.',
];

export default {
  id: 'rf/coax',
  title: 'Koaksiyel hat',
  render(container) {
    container.append(calculatorView({
      title: 'Koaksiyel hat',
      intro: 'Çaplardan karakteristik empedans ve hat parametreleri ya da hedef empedans için dış çap.',
      modes: [
        {
          id: 'analysis',
          label: 'Analiz: D, d → Z0',
          build: () => calculatorPanel({
            fields: [
              { key: 'outer', label: 'Dış iletkenin iç çapı D', name: 'D', value: '3.5', units: LENGTH_UNITS, unit: 'mm' },
              { key: 'inner', label: 'İç iletken çapı d', name: 'd', value: '1', units: LENGTH_UNITS, unit: 'mm' },
              erField,
            ],
            compute: (v) => {
              const r = coaxAnalysis({ outer: v.outer, inner: v.inner, er: v.er });
              return { results: [...results(r, v.er), { label: 'D/d', value: formatNumber(r.ratio) }], raw: r };
            },
            diagram: (v) => crossSection(v.outer, v.inner),
            diagramTitle: 'Kesit',
            formulas: formulas(),
            notes,
          }),
        },
        {
          id: 'synthesis',
          label: 'Sentez: Z0 → D',
          build: () => calculatorPanel({
            fields: [
              { key: 'z0', label: 'Hedef empedans Z0 (Ω)', name: 'Z0', value: '50' },
              { key: 'inner', label: 'İç iletken çapı d', name: 'd', value: '1', units: LENGTH_UNITS, unit: 'mm' },
              erField,
            ],
            compute: (v) => {
              const ratio = coaxRatioForZ0({ z0: v.z0, er: v.er });
              const outer = ratio * v.inner;
              const r = coaxAnalysis({ outer, inner: v.inner, er: v.er });
              return {
                results: [
                  { label: 'Gereken dış çap D', value: formatSI(outer, 'm') },
                  { label: 'D/d', value: formatNumber(ratio) },
                  ...results(r, v.er).slice(1),
                ],
                raw: { ...r, outer },
              };
            },
            diagram: (v, out) => crossSection(out?.raw.outer ?? NaN, v.inner),
            diagramTitle: 'Kesit',
            formulas: [...formulas(), formula(String.raw`\frac{D}{d} = \exp\!\left(\frac{2\pi\sqrt{\varepsilon_r}\,Z_0}{\eta_0}\right)`, 'D/d = exp(2π·√εr·Z0 / η0)')],
            notes,
          }),
        },
      ],
    }));
  },
};
