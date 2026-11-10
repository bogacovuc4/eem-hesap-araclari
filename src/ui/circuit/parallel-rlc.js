import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { RESISTANCE_UNITS, CAPACITANCE_UNITS, INDUCTANCE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { parallelRlc } from '../../calc/circuit2.js';
import { svg, figure, twoTerminal, wire, dot, ground, label, fmt } from '../schematic.js';

function diagram(v, out) {
  const top = 50;
  const bottom = 160;
  const branch = (kind, x, name, value) => [
    twoTerminal(kind, [x, top], [x, bottom]), dot(x, top), dot(x, bottom), label(x + 16, 101, name, value),
  ];
  return figure(svg([-30, 10, 500, 180], 'Paralel RLC devresi',
    twoTerminal('ac', [60, top], [60, bottom]),
    wire([60, top], [380, top]),
    wire([60, bottom], [380, bottom]),
    ...branch('resistor', 170, 'R', fmt(v.r, 'Ω')),
    ...branch('inductor', 275, 'L', fmt(v.l, 'H')),
    twoTerminal('capacitor', [380, top], [380, bottom]),
    label(396, 101, 'C', fmt(v.c, 'F')),
    ground(220, bottom),
    label(40, 101, 'f₀', out ? fmt(out.raw.f0, 'Hz') : '', { anchor: 'end', unknown: true }),
  ));
}

export default {
  id: 'circuit/parallel-rlc',
  title: 'Paralel RLC rezonansı',
  render(container) {
    container.append(calculatorView({
      title: 'Paralel RLC rezonansı',
      intro: 'Paralel rezonans devresinin (tank) rezonans frekansı, kalite faktörü ve bant genişliği.',
      modes: [{
        id: 'prlc',
        label: 'Paralel RLC',
        build: () => calculatorPanel({
          fields: [
            { key: 'r', label: 'Direnç R', name: 'R', value: '1', units: RESISTANCE_UNITS, unit: 'kΩ' },
            { key: 'l', label: 'Endüktans L', name: 'L', value: '10', units: INDUCTANCE_UNITS, unit: 'mH' },
            { key: 'c', label: 'Kapasite C', name: 'C', value: '1', units: CAPACITANCE_UNITS, unit: 'µF' },
          ],
          compute(v) {
            const r = parallelRlc(v);
            return {
              results: [
                { label: 'Rezonans frekansı f0', value: formatSI(r.f0, 'Hz') },
                { label: 'Açısal frekans ω0', value: formatSI(r.omega0, 'rad/s') },
                { label: 'Kalite faktörü Q', value: formatNumber(r.q) },
                { label: 'Bant genişliği BW (−3 dB)', value: formatSI(r.bandwidth, 'Hz') },
                { label: 'Rezonansta empedans', value: `${formatSI(r.zRes, 'Ω')} (en büyük)` },
                { label: 'Sönüm oranı ζ', value: formatNumber(r.zeta) },
                { label: 'Karakteristik empedans √(L/C)', value: formatSI(r.characteristic, 'Ω') },
              ],
              warnings: r.q < 0.5 ? ['Q < 0,5: belirgin bir rezonans tepesi yoktur.'] : [],
              raw: r,
            };
          },
          diagram,
          formulas: [formula(String.raw`f_0 = \frac{1}{2\pi\sqrt{LC}},\qquad Q = R\sqrt{\frac{C}{L}} = \frac{R}{\omega_0 L},\qquad \text{BW} = \frac{f_0}{Q}`,
            'f0 = 1/(2π√(LC)),  Q = R·√(C/L) = R/(ω0·L),  BW = f0/Q')],
          notes: [
            'Seri RLC’nin tersine, paralel devrede R büyüdükçe Q artar: R, tankı yükleyen paralel kayıp direncidir.',
            'Rezonansta empedans en büyük ve saf dirençtir (Z = R); kaynaktan çekilen akım en küçüktür.',
            'Bobinin seri iç direnci r varsa yüksek Q için eşdeğer paralel direnç Rp ≈ Q²·r (Q = ω0L/r) alınabilir.',
          ],
        }),
      }],
    }));
  },
};
