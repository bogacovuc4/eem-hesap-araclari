import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, VOLTAGE_UNITS } from '../../calc/units.js';
import { parallelPlateCapacitance, coaxialCapacitance, sphericalCapacitance } from '../../calc/em.js';
import { SMALL_LENGTH, AREA_UNITS, EPS_FIELD } from './units.js';

const V_FIELD = { key: 'v', label: 'Uygulanan gerilim V', name: 'V', value: '10', units: VOLTAGE_UNITS, unit: 'V', constraint: 'nonnegative' };

function common(r) {
  return [
    { label: 'Kapasitans C', value: formatSI(r.c, 'F') },
    { label: 'Yük Q = CV', value: formatSI(r.q, 'C') },
    { label: 'Depolanan enerji ½CV²', value: formatSI(r.energy, 'J') },
  ];
}

const NOTES = [
  'Kenar (saçak) alanları ihmal edilir; levha boyutları aralığa göre büyük olmalıdır.',
  'Dielektrik doğrusal ve kayıpsız kabul edilir.',
];

export default {
  id: 'em/capacitance',
  title: 'Kapasitans (geometri)',
  render(container) {
    container.append(calculatorView({
      title: 'Geometriden kapasitans',
      intro: 'Paralel levha, koaksiyel ve küresel kondansatörlerin kapasitansı, yükü ve enerjisi.',
      modes: [
        {
          id: 'plate',
          label: 'Paralel levha',
          build: () => calculatorPanel({
            fields: [
              { key: 'a', label: 'Levha alanı A', name: 'A', value: '100', units: AREA_UNITS, unit: 'cm²' },
              { key: 'd', label: 'Levha aralığı d', name: 'd', value: '1', units: SMALL_LENGTH, unit: 'mm' },
              EPS_FIELD,
              V_FIELD,
            ],
            compute(v) {
              const r = parallelPlateCapacitance({ area: v.a, d: v.d, epsR: v.er, v: v.v });
              return { results: [...common(r), { label: 'Alan şiddeti E = V/d', value: formatSI(r.e, 'V/m') }] };
            },
            formulas: [formula(String.raw`C=\frac{\varepsilon_0\varepsilon_r A}{d},\qquad E=\frac{V}{d},\qquad W=\tfrac12CV^2`, 'C = ε0·εr·A/d,  E = V/d,  W = ½·C·V²')],
            notes: NOTES,
          }),
        },
        {
          id: 'coax',
          label: 'Koaksiyel',
          build: () => calculatorPanel({
            fields: [
              { key: 'ra', label: 'İç iletken yarıçapı a', name: 'a', value: '0.5', units: SMALL_LENGTH, unit: 'mm' },
              { key: 'rb', label: 'Dış iletken iç yarıçapı b', name: 'b', value: '1.75', units: SMALL_LENGTH, unit: 'mm' },
              { key: 'len', label: 'Uzunluk ℓ', name: 'ℓ', value: '1', units: { ...SMALL_LENGTH, km: 1e3 }, unit: 'm' },
              EPS_FIELD,
              V_FIELD,
            ],
            compute(v) {
              const r = coaxialCapacitance({ a: v.ra, b: v.rb, length: v.len, epsR: v.er, v: v.v });
              return { results: [{ label: 'Birim uzunluk kapasitansı C′', value: formatSI(r.perLength, 'F/m') }, ...common(r)] };
            },
            formulas: [formula(String.raw`C=\frac{2\pi\varepsilon_0\varepsilon_r\,\ell}{\ln(b/a)}`, 'C = 2π·ε0·εr·ℓ / ln(b/a)')],
            notes: ['Yarıçaplar çap değil yarıçaptır. Hattın karakteristik empedansı için RF → Koaksiyel hat sayfasına bakın.', ...NOTES],
          }),
        },
        {
          id: 'sphere',
          label: 'Küresel',
          build: () => calculatorPanel({
            fields: [
              { key: 'ra', label: 'İç küre yarıçapı a', name: 'a', value: '1', units: SMALL_LENGTH, unit: 'cm' },
              { key: 'rb', label: 'Dış küre yarıçapı b', name: 'b', value: '2', units: SMALL_LENGTH, unit: 'cm', constraint: 'nonnegative', hint: '0 girerseniz yalıtılmış tek küre (b → ∞)' },
              EPS_FIELD,
              V_FIELD,
            ],
            compute(v) {
              const r = sphericalCapacitance({ a: v.ra, b: v.rb === 0 ? Infinity : v.rb, epsR: v.er, v: v.v });
              return { results: common(r) };
            },
            formulas: [formula(String.raw`C=\frac{4\pi\varepsilon\,ab}{b-a},\qquad C_{b\to\infty}=4\pi\varepsilon a`, 'C = 4πε·ab/(b−a);  tek küre: C = 4πεa')],
            notes: NOTES.slice(1),
          }),
        },
      ],
    }));
  },
};
