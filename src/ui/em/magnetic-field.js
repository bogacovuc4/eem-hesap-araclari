import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, CURRENT_UNITS } from '../../calc/units.js';
import { magneticField } from '../../calc/em.js';
import { SMALL_LENGTH, MU_FIELD } from './units.js';

const I_FIELD = { key: 'i', label: 'Akım I', name: 'I', value: '1', units: CURRENT_UNITS, unit: 'A', constraint: 'any' };
const N_FIELD = (value) => ({ key: 'n', label: 'Sarım sayısı N', name: 'N', value });

function out(r) {
  return [
    { label: 'Manyetik akı yoğunluğu B', value: formatSI(Math.abs(r.b), 'T') },
    { label: 'B (gauss)', value: formatSI(Math.abs(r.b) * 1e4, 'G') },
    { label: 'Alan şiddeti H', value: formatSI(Math.abs(r.h), 'A/m') },
  ];
}

const mode = (id, label, fields, tex, plain, notes) => ({
  id,
  label,
  build: () => calculatorPanel({
    fields: [...fields, MU_FIELD],
    compute: (v) => ({ results: out(magneticField({ shape: id, i: v.i, r: v.r ?? null, n: v.n ?? 1, length: v.len ?? null, muR: v.mur })) }),
    formulas: [formula(tex, plain)],
    notes: [...notes, 'Karşılaştırma: Dünya’nın manyetik alanı yaklaşık 25–65 µT’dır.'],
  }),
});

export default {
  id: 'em/magnetic-field',
  title: 'Manyetik alan (Biot–Savart, Amper)',
  render(container) {
    container.append(calculatorView({
      title: 'Akımın oluşturduğu manyetik alan',
      intro: 'Düz tel, halka, solenoid ve toroid için B ve H (Biot–Savart ve Amper yasası).',
      modes: [
        mode('wire', 'Düz tel', [I_FIELD, { key: 'r', label: 'Telden uzaklık r', name: 'r', value: '1', units: SMALL_LENGTH, unit: 'cm' }],
          String.raw`B=\frac{\mu I}{2\pi r}`, 'B = μ·I / (2π·r)',
          ['Sonsuz uzun, ince düz tel. Alan çizgileri teli saran çemberlerdir (sağ el kuralı).']),
        mode('loop', 'Halka', [I_FIELD, N_FIELD('1'), { key: 'r', label: 'Halka yarıçapı R', name: 'R', value: '5', units: SMALL_LENGTH, unit: 'cm' }],
          String.raw`B_{merkez}=\frac{\mu N I}{2R}`, 'B(merkez) = μ·N·I / (2R)',
          ['Değer halkanın tam merkezi içindir; eksen üzerinde merkezden uzaklaştıkça azalır.']),
        mode('solenoid', 'Solenoid', [I_FIELD, N_FIELD('500'), { key: 'len', label: 'Solenoid uzunluğu ℓ', name: 'ℓ', value: '10', units: SMALL_LENGTH, unit: 'cm' }],
          String.raw`B=\mu\frac{N}{\ell}I=\mu nI`, 'B = μ·N·I / ℓ',
          ['İdeal uzun solenoid (ℓ ≫ çap): iç alan düzgün, dış alan ≈ 0. Uçlarda alan yaklaşık yarıya iner.']),
        mode('toroid', 'Toroid', [I_FIELD, N_FIELD('200'), { key: 'r', label: 'Ortalama yarıçap r', name: 'r', value: '3', units: SMALL_LENGTH, unit: 'cm' }],
          String.raw`B=\frac{\mu N I}{2\pi r}`, 'B = μ·N·I / (2π·r)',
          ['Alan yalnızca çekirdeğin içindedir ve yarıçapla değişir; ince toroidde ortalama yarıçap kullanılabilir.']),
      ],
    }));
  },
};
