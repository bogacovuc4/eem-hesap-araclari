import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber, CURRENT_UNITS } from '../../calc/units.js';
import { solenoidInductance, toroidInductance, coaxialInductance, inductorEnergy } from '../../calc/em.js';
import { SMALL_LENGTH, MU_FIELD } from './units.js';

const I_FIELD = { key: 'i', label: 'Akım I (enerji için)', name: 'I', value: '1', units: CURRENT_UNITS, unit: 'A', constraint: 'nonnegative' };
const energy = (l, i) => ({ label: 'Depolanan enerji ½LI²', value: formatSI(inductorEnergy(l, i), 'J') });

export default {
  id: 'em/inductance',
  title: 'Endüktans (geometri)',
  render(container) {
    container.append(calculatorView({
      title: 'Geometriden endüktans',
      intro: 'Solenoid, toroid ve koaksiyel hattın öz endüktansı ve depolanan enerji.',
      modes: [
        {
          id: 'solenoid',
          label: 'Solenoid',
          build: () => calculatorPanel({
            fields: [
              { key: 'n', label: 'Sarım sayısı N', name: 'N', value: '100' },
              { key: 'd', label: 'Bobin çapı d', name: 'd', value: '1', units: SMALL_LENGTH, unit: 'cm' },
              { key: 'len', label: 'Bobin uzunluğu ℓ', name: 'ℓ', value: '10', units: SMALL_LENGTH, unit: 'cm' },
              MU_FIELD,
              I_FIELD,
            ],
            compute(v) {
              const r = solenoidInductance({ n: v.n, diameter: v.d, length: v.len, muR: v.mur });
              return {
                results: [
                  { label: 'Endüktans L', value: formatSI(r.l, 'H') },
                  { label: 'Kesit alanı A', value: formatSI(r.area * 1e6, 'mm²') },
                  { label: 'ℓ / d oranı', value: formatNumber(r.ratio, 3) },
                  energy(r.l, v.i),
                ],
                warnings: r.ratio < 5 ? ['ℓ/d < 5: kısa bobinde formül endüktansı fazla verir (Nagaoka düzeltmesi gerekir; ℓ/d = 1 için gerçek değer yaklaşık %70’idir).'] : [],
              };
            },
            formulas: [formula(String.raw`L=\frac{\mu_0\mu_r N^2A}{\ell},\qquad A=\frac{\pi d^2}{4}`, 'L = μ0·μr·N²·A / ℓ,  A = π·d²/4')],
            notes: ['Uzun, tek katlı ve sık sarılmış solenoid varsayılır.'],
          }),
        },
        {
          id: 'toroid',
          label: 'Toroid',
          build: () => calculatorPanel({
            fields: [
              { key: 'n', label: 'Sarım sayısı N', name: 'N', value: '50' },
              { key: 'ra', label: 'İç yarıçap a', name: 'a', value: '10', units: SMALL_LENGTH, unit: 'mm' },
              { key: 'rb', label: 'Dış yarıçap b', name: 'b', value: '20', units: SMALL_LENGTH, unit: 'mm' },
              { key: 'h', label: 'Çekirdek yüksekliği h', name: 'h', value: '10', units: SMALL_LENGTH, unit: 'mm' },
              MU_FIELD,
              I_FIELD,
            ],
            compute(v) {
              const r = toroidInductance({ n: v.n, a: v.ra, b: v.rb, h: v.h, muR: v.mur });
              return { results: [{ label: 'Endüktans L', value: formatSI(r.l, 'H') }, energy(r.l, v.i)] };
            },
            formulas: [formula(String.raw`L=\frac{\mu N^2 h}{2\pi}\ln\frac{b}{a}`, 'L = μ·N²·h·ln(b/a) / (2π)')],
            notes: ['Dikdörtgen kesitli toroid; sarımlar çekirdeği düzgün sarar. Ticari çekirdeklerde üreticinin A_L değeri (L = A_L·N²) daha doğrudur.'],
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
              MU_FIELD,
              I_FIELD,
            ],
            compute(v) {
              const r = coaxialInductance({ a: v.ra, b: v.rb, length: v.len, muR: v.mur });
              return { results: [{ label: 'Birim uzunluk endüktansı L′', value: formatSI(r.perLength, 'H/m') }, { label: 'Toplam L', value: formatSI(r.l, 'H') }, energy(r.l, v.i)] };
            },
            formulas: [formula(String.raw`L'=\frac{\mu}{2\pi}\ln\frac{b}{a}`, "L′ = μ/(2π)·ln(b/a)")],
            notes: ['Dış endüktanstır (yüksek frekans, akım yüzeyde). Düşük frekansta iç iletkenin iç endüktansı μ/(8π) H/m eklenir.'],
          }),
        },
      ],
    }));
  },
};
