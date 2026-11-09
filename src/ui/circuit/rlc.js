import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { RESISTANCE_UNITS, CAPACITANCE_UNITS, INDUCTANCE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { seriesRlc } from '../../calc/circuit.js';
import { rlcSchematic } from './schematics.js';

export default {
  id: 'circuit/rlc',
  title: 'Seri RLC rezonansı',
  render(container) {
    container.append(calculatorView({
      title: 'Seri RLC rezonansı',
      intro: 'Rezonans frekansı, kalite faktörü ve bant genişliği.',
      modes: [{
        id: 'rlc',
        label: 'Seri RLC',
        build: () => calculatorPanel({
          fields: [
            { key: 'r', label: 'Direnç R', name: 'R', value: '10', units: RESISTANCE_UNITS, unit: 'Ω' },
            { key: 'l', label: 'Endüktans L', name: 'L', value: '10', units: INDUCTANCE_UNITS, unit: 'mH' },
            { key: 'c', label: 'Kapasite C', name: 'C', value: '1', units: CAPACITANCE_UNITS, unit: 'µF' },
          ],
          compute(v) {
            const s = seriesRlc(v);
            const warnings = [];
            if (s.q < 0.5) warnings.push('Q < 0,5: devre aşırı sönümlü; belirgin bir rezonans tepesi yoktur ve BW = f0/Q yorumu anlamını yitirir.');
            return {
              results: [
                { label: 'Rezonans frekansı f0', value: formatSI(s.f0, 'Hz') },
                { label: 'Açısal frekans ω0', value: formatSI(s.omega0, 'rad/s') },
                { label: 'Kalite faktörü Q', value: formatNumber(s.q) },
                { label: 'Bant genişliği BW (−3 dB)', value: formatSI(s.bandwidth, 'Hz') },
                { label: 'Sönüm oranı ζ', value: formatNumber(s.zeta) },
                { label: 'Karakteristik empedans √(L/C)', value: formatSI(s.characteristicImpedance, 'Ω') },
              ],
              warnings,
              raw: { f0: s.f0 },
            };
          },
          diagram: (v, out) => rlcSchematic({ ...v, f0: out?.raw.f0 }),
          formulas: [formula(String.raw`f_0=\frac{1}{2\pi\sqrt{LC}},\qquad Q=\frac{1}{R}\sqrt{\frac{L}{C}}=\frac{\omega_0L}{R},\qquad \text{BW}=\frac{f_0}{Q},\qquad \zeta=\frac{1}{2Q}`,
            'f0 = 1/(2π·√(LC)),  Q = (1/R)·√(L/C) = ω0·L/R,  BW = f0/Q,  ζ = 1/(2Q)')],
          notes: [
            'İdeal bileşenler; R, bobin iç direnci ve kaynak direnci dahil toplam seri dirençtir.',
            'Rezonansta empedans saf dirençtir (Z = R) ve akım en büyüktür.',
          ],
        }),
      }],
    }));
  },
};
