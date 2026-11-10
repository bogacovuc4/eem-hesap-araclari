import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { FREQUENCY_UNITS, LENGTH_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { lineInputImpedance } from '../../calc/rf2.js';
import { C0 } from '../../calc/constants.js';
import { svg, figure, fmt } from '../schematic.js';
import { lineSection, load, inputPort } from './txline-draw.js';

/** a + jb biçiminde karmaşık empedans */
export function complexText(z, unit = 'Ω', digits = 4) {
  const sign = z.im < 0 ? '−' : '+';
  return `${formatNumber(z.re, digits)} ${sign} j${formatNumber(Math.abs(z.im), digits)} ${unit}`.trim();
}

function results(r) {
  return [
    { label: 'Giriş empedansı Zin', value: complexText(r.zin) },
    { label: '|Zin| ∠ faz', value: `${formatSI(r.zinMag, 'Ω')} ∠ ${formatNumber(r.zinPhase, 4)}°` },
    { label: 'Yük yansıma katsayısı ΓL', value: `${formatNumber(r.gammaLMag)} ∠ ${formatNumber(r.gammaLPhase, 4)}°` },
    { label: 'VSWR', value: Number.isFinite(r.vswr) ? `${formatNumber(r.vswr)} : 1` : '∞' },
    { label: 'Geri dönüş kaybı', value: Number.isFinite(r.returnLoss) ? `${formatNumber(r.returnLoss)} dB` : '∞ dB' },
    { label: 'Girişte Γ', value: complexText(r.gammaIn, '') },
  ];
}

function diagram(v, out, lengthText) {
  const zl = Number.isFinite(v.rl) && Number.isFinite(v.xl) ? complexText({ re: v.rl, im: v.xl }, 'Ω', 3) : '';
  return figure(svg([0, 0, 470, 190], 'Yükle sonlanan iletim hattı',
    inputPort(20, 70, 60, 'Zin', out ? complexText(out.raw.zin, 'Ω', 3) : '?'),
    lineSection(60, 320, 70, { title: `Z0 = ${fmt(v.z0, 'Ω') || '?'}`, value: lengthText }),
    load(320, 70, 'ZL', zl),
  ));
}

const loadFields = [
  { key: 'z0', label: 'Hat empedansı Z0 (Ω)', name: 'Z0', value: '50' },
  { key: 'rl', label: 'Yük direnci RL (Ω)', name: 'RL', value: '30', constraint: 'nonnegative', hint: 'Kısa devre için RL = 0 ve XL = 0' },
  { key: 'xl', label: 'Yük reaktansı XL (Ω)', name: 'XL', value: '-20', constraint: 'any', hint: 'Endüktif +, kapasitif −' },
];

const notes = [
  'Kayıpsız hat varsayılır (α = 0). Açık devre yük girilemez; yerine çok büyük RL (ör. 1e9 Ω) kullanabilirsiniz.',
  'Uzunluk λ/2’nin katlarında Zin = ZL olur; λ/4’te Zin = Z0²/ZL (çeyrek dalga dönüşümü).',
  'Kısa devre hatta l < λ/4 endüktif, λ/4 < l < λ/2 kapasitif reaktans görülür (stub tasarımı).',
];

const formulas = () => [
  formula(String.raw`Z_{in} = Z_0\,\frac{Z_L + jZ_0\tan\beta\ell}{Z_0 + jZ_L\tan\beta\ell},\qquad \beta\ell = 2\pi\frac{\ell}{\lambda_g},\qquad \Gamma_L = \frac{Z_L - Z_0}{Z_L + Z_0}`,
    'Zin = Z0·(ZL + jZ0·tan βℓ)/(Z0 + jZL·tan βℓ),  βℓ = 2π·ℓ/λg,  ΓL = (ZL − Z0)/(ZL + Z0)'),
];

export default {
  id: 'rf/line-input',
  title: 'Hat giriş empedansı',
  render(container) {
    container.append(calculatorView({
      title: 'Hat üzerinde giriş empedansı',
      intro: 'Karmaşık yükle sonlanan kayıpsız hattın girişinden görülen empedans ve yansıma.',
      modes: [
        {
          id: 'electrical',
          label: 'Elektriksel uzunluk',
          build: () => calculatorPanel({
            fields: [
              ...loadFields,
              { key: 'lw', label: 'Hat uzunluğu ℓ/λg', name: 'ℓ/λ', value: '0.3', constraint: 'nonnegative', hint: '0,25 = λ/4 = 90° · 0,5 = λ/2 = 180°' },
            ],
            compute(v) {
              const r = lineInputImpedance({ z0: v.z0, rl: v.rl, xl: v.xl, electrical: v.lw });
              return { results: [...results(r), { label: 'Elektriksel uzunluk βℓ', value: `${formatNumber(v.lw * 360, 4)}°` }], raw: r };
            },
            diagram: (v, out) => diagram(v, out, Number.isFinite(v.lw) ? `ℓ = ${formatNumber(v.lw, 3)} λ` : ''),
            diagramTitle: 'Hat',
            formulas: formulas(),
            notes,
          }),
        },
        {
          id: 'physical',
          label: 'Fiziksel uzunluk',
          build: () => calculatorPanel({
            fields: [
              ...loadFields,
              { key: 'len', label: 'Hat uzunluğu ℓ', name: 'ℓ', value: '30', units: LENGTH_UNITS, unit: 'mm', constraint: 'nonnegative' },
              { key: 'f', label: 'Frekans f', name: 'f', value: '3', units: FREQUENCY_UNITS, unit: 'GHz' },
              { key: 'eeff', label: 'Etkin dielektrik sabiti εeff', name: 'εeff', value: '1', min: 1, hint: 'Hız faktörü VF ise εeff = 1/VF²' },
            ],
            compute(v) {
              const lambdaG = C0 / (v.f * Math.sqrt(v.eeff));
              const electrical = v.len / lambdaG;
              const r = lineInputImpedance({ z0: v.z0, rl: v.rl, xl: v.xl, electrical });
              return {
                results: [
                  ...results(r),
                  { label: 'ℓ/λg', value: formatNumber(electrical, 4) },
                  { label: 'Elektriksel uzunluk βℓ', value: `${formatNumber(electrical * 360, 4)}°` },
                  { label: 'Hattaki dalga boyu λg', value: formatSI(lambdaG, 'm') },
                ],
                raw: r,
              };
            },
            diagram: (v, out) => diagram(v, out, Number.isFinite(v.len) ? `ℓ = ${formatSI(v.len, 'm', 3)}` : ''),
            diagramTitle: 'Hat',
            formulas: formulas(),
            notes,
          }),
        },
      ],
    }));
  },
};
