import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, VOLTAGE_UNITS, CURRENT_UNITS, RESISTANCE_UNITS, POWER_UNITS } from '../../calc/units.js';
import { ohmsLaw } from '../../calc/basics.js';

const MW = { mW: 1e-3, ...POWER_UNITS };
const FIELDS = {
  v: { key: 'v', label: 'Gerilim V', name: 'V', value: '12', units: VOLTAGE_UNITS, unit: 'V', constraint: 'any' },
  i: { key: 'i', label: 'Akım I', name: 'I', value: '20', units: CURRENT_UNITS, unit: 'mA', constraint: 'any' },
  r: { key: 'r', label: 'Direnç R', name: 'R', value: '600', units: RESISTANCE_UNITS, unit: 'Ω' },
  p: { key: 'p', label: 'Güç P', name: 'P', value: '240', units: MW, unit: 'mW', constraint: 'nonnegative' },
};
const NAMES = { v: 'V', i: 'I', r: 'R', p: 'P' };
const PAIRS = [['v', 'i'], ['v', 'r'], ['i', 'r'], ['p', 'v'], ['p', 'i'], ['p', 'r']];

const ROWS = [
  ['v', 'Gerilim V', 'V'],
  ['i', 'Akım I', 'A'],
  ['r', 'Direnç R', 'Ω'],
  ['p', 'Güç P', 'W'],
];

export default {
  id: 'circuit/ohm',
  title: 'Ohm yasası ve güç',
  render(container) {
    container.append(calculatorView({
      title: 'Ohm yasası ve güç',
      intro: 'V, I, R ve P’den bilinen iki tanesini seçin; diğer ikisi hesaplanır.',
      modes: PAIRS.map(([a, b]) => ({
        id: `${a}${b}`,
        label: `${NAMES[a]} ve ${NAMES[b]}`,
        build: () => calculatorPanel({
          fields: [FIELDS[a], FIELDS[b]],
          compute(v) {
            const out = ohmsLaw({ [a]: v[a], [b]: v[b] });
            return {
              results: ROWS.filter(([k]) => k !== a && k !== b).concat(ROWS.filter(([k]) => k === a || k === b))
                .map(([k, label, unit]) => ({ label: k === a || k === b ? `${label} (girdi)` : label, value: formatSI(out[k], unit) })),
              warnings: out.r < 0 ? ['R negatif çıktı: V ve I işaretlerini (yön kabullerini) kontrol edin.'] : [],
            };
          },
          formulas: [formula(String.raw`V=IR,\qquad P=VI=I^2R=\frac{V^2}{R}`, 'V = I·R,  P = V·I = I²·R = V²/R')],
          notes: ['Doğrusal (omik) direnç ve DC ya da AC’de RMS değerler için geçerlidir.', 'Direncin güç değeri, harcanan gücün en az 2 katı seçilir (ısınma payı).'],
        }),
      })),
    }));
  },
};
