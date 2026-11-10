import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { RESISTANCE_UNITS, VOLTAGE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { wheatstoneBalance, wheatstoneOutput } from '../../calc/circuit2.js';
import { svg, figure, twoTerminal, wire, dot, ground, label, s, fmt } from '../schematic.js';

/** Elmas biçimli köprü: üst düğüm Vs, alt düğüm toprak, sol/sağ orta düğümler arasında Vout. */
function bridge(v, rxValue, voutText) {
  const top = [220, 30];
  const left = [130, 110];
  const right = [310, 110];
  const bottom = [220, 190];
  return figure(svg([-30, 0, 470, 240], 'Wheatstone köprüsü',
    twoTerminal('source', [50, 30], [50, 190]),
    wire([50, 30], top), wire([50, 190], bottom),
    twoTerminal('resistor', top, left),
    twoTerminal('resistor', left, bottom),
    twoTerminal('resistor', top, right),
    twoTerminal('resistor', right, bottom),
    dot(...top), dot(...left), dot(...right), dot(...bottom),
    ground(220, 190),
    s('line', { x1: left[0], y1: left[1], x2: right[0], y2: right[1], class: 'sch-line', 'stroke-dasharray': '4 4' }),
    label(220, 104, 'Vout', voutText, { anchor: 'middle' }),
    label(30, 106, 'Vs', fmt(v.vs, 'V'), { anchor: 'end' }),
    label(150, 58, 'R1', fmt(v.r1, 'Ω'), { anchor: 'end' }),
    label(150, 172, 'R2', fmt(v.r2, 'Ω'), { anchor: 'end' }),
    label(290, 58, 'R3', fmt(v.r3, 'Ω')),
    label(290, 172, 'Rx', rxValue, { unknown: true }),
  ));
}

const notes = [
  'Sol kol: R1 (üst) – R2 (alt); sağ kol: R3 (üst) – Rx (alt). Vout = V(sol orta) − V(sağ orta).',
  'Ölçüm cihazının (voltmetre) iç direnci sonsuz kabul edilir; galvanometreli köprüde denge noktası aynıdır.',
  'Küçük değişimlerde (ΔR ≪ R) çıkış yaklaşık doğrusaldır; gerinim ölçerlerde bu yüzden çeyrek/yarım/tam köprü kullanılır.',
];

export default {
  id: 'circuit/wheatstone',
  title: 'Wheatstone köprüsü',
  render(container) {
    container.append(calculatorView({
      title: 'Wheatstone köprüsü',
      intro: 'Dengedeki köprüden bilinmeyen direnç ya da dengesiz köprünün çıkış gerilimi.',
      modes: [
        {
          id: 'balance',
          label: 'Denge: Rx bul',
          build: () => calculatorPanel({
            fields: [
              { key: 'r1', label: 'R1', name: 'R1', value: '1', units: RESISTANCE_UNITS, unit: 'kΩ' },
              { key: 'r2', label: 'R2', name: 'R2', value: '2.2', units: RESISTANCE_UNITS, unit: 'kΩ' },
              { key: 'r3', label: 'R3 (ayarlı direnç)', name: 'R3', value: '470', units: RESISTANCE_UNITS, unit: 'Ω' },
            ],
            compute(v) {
              const r = wheatstoneBalance(v);
              return { results: [{ label: 'Bilinmeyen direnç Rx', value: formatSI(r.rx, 'Ω') }, { label: 'Oran R2/R1', value: formatNumber(v.r2 / v.r1) }], raw: r };
            },
            diagram: (v, out) => bridge({ ...v, vs: NaN }, out ? fmt(out.raw.rx, 'Ω') : '', '0 V (denge)'),
            diagramTitle: 'Köprü',
            formulas: [formula(String.raw`\frac{R_2}{R_1} = \frac{R_x}{R_3}\ \Rightarrow\ R_x = R_3\,\frac{R_2}{R_1}`, 'R2/R1 = Rx/R3  →  Rx = R3·R2/R1')],
            notes,
          }),
        },
        {
          id: 'output',
          label: 'Dengesiz: Vout',
          build: () => calculatorPanel({
            fields: [
              { key: 'vs', label: 'Besleme Vs', name: 'Vs', value: '10', units: VOLTAGE_UNITS, unit: 'V', constraint: 'any' },
              { key: 'r1', label: 'R1', name: 'R1', value: '1', units: RESISTANCE_UNITS, unit: 'kΩ' },
              { key: 'r2', label: 'R2', name: 'R2', value: '1', units: RESISTANCE_UNITS, unit: 'kΩ' },
              { key: 'r3', label: 'R3', name: 'R3', value: '1', units: RESISTANCE_UNITS, unit: 'kΩ' },
              { key: 'rx', label: 'Rx', name: 'Rx', value: '1.1', units: RESISTANCE_UNITS, unit: 'kΩ' },
            ],
            compute(v) {
              const r = wheatstoneOutput(v);
              return {
                results: [
                  { label: 'Çıkış gerilimi Vout', value: formatSI(r.vout, 'V') },
                  { label: 'Sol orta düğüm', value: formatSI(r.left, 'V') },
                  { label: 'Sağ orta düğüm', value: formatSI(r.right, 'V') },
                  { label: 'Durum', value: r.balanced ? 'dengede' : 'dengesiz' },
                ],
                raw: r,
              };
            },
            diagram: (v, out) => bridge(v, fmt(v.rx, 'Ω'), out ? fmt(out.raw.vout, 'V') : '?'),
            diagramTitle: 'Köprü',
            formulas: [formula(String.raw`V_{out} = V_s\left(\frac{R_2}{R_1 + R_2} - \frac{R_x}{R_3 + R_x}\right)`, 'Vout = Vs·(R2/(R1 + R2) − Rx/(R3 + Rx))')],
            notes,
          }),
        },
      ],
    }));
  },
};
