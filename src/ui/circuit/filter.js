import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { RESISTANCE_UNITS, CAPACITANCE_UNITS, INDUCTANCE_UNITS, formatSI } from '../../calc/units.js';
import { rcCutoff, rlCutoff } from '../../calc/circuit.js';
import { rcSchematics, rlSchematics } from './schematics.js';

const results = ({ fc, tau, omega }) => [
  { label: 'Kesim frekansı fc (−3 dB)', value: formatSI(fc, 'Hz') },
  { label: 'Açısal kesim ωc', value: formatSI(omega, 'rad/s') },
  { label: 'Zaman sabiti τ', value: formatSI(tau, 's') },
];

const commonNotes = [
  'Birinci derece filtre: geçiş bandı dışında eğim 20 dB/dekad. Kesim frekansı alçak ve yüksek geçiren bağlantı için aynıdır.',
  'Kaynak empedansı sıfır, yük empedansı sonsuz varsayılır; aksi hâlde etkin R değişir.',
];

export default {
  id: 'circuit/filter',
  title: 'RC / RL filtre',
  render(container) {
    container.append(calculatorView({
      title: 'RC / RL filtre kesim frekansı',
      intro: 'Birinci derece alçak/yüksek geçiren filtrelerin −3 dB kesim frekansı.',
      modes: [
        {
          id: 'rc',
          label: 'RC',
          build: () => calculatorPanel({
            fields: [
              { key: 'r', label: 'Direnç R', name: 'R', value: '1', units: RESISTANCE_UNITS, unit: 'kΩ' },
              { key: 'c', label: 'Kapasite C', name: 'C', value: '1', units: CAPACITANCE_UNITS, unit: 'µF' },
            ],
            compute: (v) => ({ results: results(rcCutoff(v)) }),
            diagram: (v) => rcSchematics(v),
            formulas: [formula(String.raw`f_c=\frac{1}{2\pi RC},\qquad \tau=RC`, 'fc = 1/(2π·R·C),  τ = R·C')],
            notes: ['Alçak geçiren: çıkış C üzerinden. Yüksek geçiren: çıkış R üzerinden.', ...commonNotes],
          }),
        },
        {
          id: 'rl',
          label: 'RL',
          build: () => calculatorPanel({
            fields: [
              { key: 'r', label: 'Direnç R', name: 'R', value: '1', units: RESISTANCE_UNITS, unit: 'kΩ' },
              { key: 'l', label: 'Endüktans L', name: 'L', value: '10', units: INDUCTANCE_UNITS, unit: 'mH' },
            ],
            compute: (v) => ({ results: results(rlCutoff(v)) }),
            diagram: (v) => rlSchematics(v),
            formulas: [formula(String.raw`f_c=\frac{R}{2\pi L},\qquad \tau=\frac{L}{R}`, 'fc = R/(2π·L),  τ = L/R')],
            notes: ['Alçak geçiren: çıkış R üzerinden. Yüksek geçiren: çıkış L üzerinden.', 'Bobinin iç direnci ihmal edilir (gerekirse R’ye ekleyin).', ...commonNotes],
          }),
        },
      ],
    }));
  },
};
