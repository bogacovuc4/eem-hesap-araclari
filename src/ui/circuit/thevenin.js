import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { RESISTANCE_UNITS, VOLTAGE_UNITS, CURRENT_UNITS, formatSI } from '../../calc/units.js';
import { theveninToNorton, nortonToThevenin } from '../../calc/circuit2.js';
import { svg, figure, twoTerminal, wire, terminal, dot, label, s, fmt } from '../schematic.js';

/** Akım kaynağı sembolü (daire + ok), a üst uç. */
function currentSource(x, y1, y2) {
  const cy = (y1 + y2) / 2;
  return s('g', {},
    wire([x, y1], [x, cy - 14]), wire([x, cy + 14], [x, y2]),
    s('circle', { cx: x, cy, r: 14, class: 'sch-line' }),
    s('line', { x1: x, y1: cy + 8, x2: x, y2: cy - 6, class: 'sch-line' }),
    s('polygon', { points: `${x - 4},${cy - 4} ${x + 4},${cy - 4} ${x},${cy - 10}`, class: 'sch-fill' }));
}

function equivalents({ vth, rth, iN }) {
  return figure(svg([-30, 0, 550, 190], 'Thevenin ve Norton eşdeğer devreleri',
    // Thevenin
    twoTerminal('source', [40, 40], [40, 150]),
    twoTerminal('resistor', [40, 40], [170, 40]),
    wire([170, 40], [200, 40]), wire([40, 150], [200, 150]),
    terminal(200, 40), terminal(200, 150),
    label(22, 96, 'Vth', fmt(vth, 'V'), { anchor: 'end' }),
    label(105, 18, 'Rth', fmt(rth, 'Ω'), { anchor: 'middle' }),
    label(120, 182, 'Thevenin', '', { anchor: 'middle' }),
    s('text', { x: 255, y: 100, class: 'sch-text', 'text-anchor': 'middle', 'font-size': 20 }, '⇔'),
    // Norton
    currentSource(330, 40, 150),
    wire([330, 40], [470, 40]), wire([330, 150], [470, 150]),
    twoTerminal('resistor', [420, 40], [420, 150]),
    dot(420, 40), dot(420, 150),
    terminal(470, 40), terminal(470, 150),
    label(310, 96, 'In', fmt(iN, 'A'), { anchor: 'end' }),
    label(436, 96, 'Rn', fmt(rth, 'Ω')),
    label(400, 182, 'Norton', '', { anchor: 'middle' }),
  ));
}

function loadRows(r) {
  return [
    { label: 'Yük akımı IL', value: formatSI(r.il, 'A') },
    { label: 'Yük gerilimi VL', value: formatSI(r.vl, 'V') },
    { label: 'Yük gücü PL', value: formatSI(r.pl, 'W') },
    { label: 'En büyük güç (RL = Rth)', value: formatSI(r.pmax, 'W') },
  ];
}

const rlField = { key: 'rl', label: 'Yük direnci RL', name: 'RL', value: '4', units: RESISTANCE_UNITS, unit: 'Ω', constraint: 'nonnegative', hint: 'RL = Rth iken yüke en büyük güç aktarılır' };

const notes = [
  'Doğrusal devreler için geçerlidir; iki eşdeğer devre a–b uçlarından bakıldığında aynı davranır.',
  'En büyük güç aktarımında verim %50’dir: kaynağın iç direncinde de aynı güç harcanır.',
];

export default {
  id: 'circuit/thevenin',
  title: 'Thevenin ↔ Norton',
  render(container) {
    container.append(calculatorView({
      title: 'Thevenin ↔ Norton dönüşümü',
      intro: 'Eşdeğer devreler arası dönüşüm ve bağlanan yükteki akım, gerilim ve güç.',
      modes: [
        {
          id: 'th2no',
          label: 'Thevenin → Norton',
          build: () => calculatorPanel({
            fields: [
              { key: 'vth', label: 'Thevenin gerilimi Vth', name: 'Vth', value: '12', units: VOLTAGE_UNITS, unit: 'V', constraint: 'any' },
              { key: 'rth', label: 'Thevenin direnci Rth', name: 'Rth', value: '4', units: RESISTANCE_UNITS, unit: 'Ω' },
              rlField,
            ],
            compute(v) {
              const r = theveninToNorton(v);
              return {
                results: [{ label: 'Norton akımı In', value: formatSI(r.in, 'A') }, { label: 'Norton direnci Rn', value: formatSI(r.rn, 'Ω') }, ...loadRows(r)],
                raw: r,
              };
            },
            diagram: (v, out) => equivalents({ vth: v.vth, rth: v.rth, iN: out?.raw.in }),
            diagramTitle: 'Eşdeğer devreler',
            formulas: [formula(String.raw`I_N = \frac{V_{th}}{R_{th}},\qquad R_N = R_{th},\qquad P_{\max} = \frac{V_{th}^2}{4R_{th}}`, 'In = Vth/Rth,  Rn = Rth,  Pmax = Vth²/(4·Rth)')],
            notes,
          }),
        },
        {
          id: 'no2th',
          label: 'Norton → Thevenin',
          build: () => calculatorPanel({
            fields: [
              { key: 'in', label: 'Norton akımı In', name: 'In', value: '3', units: CURRENT_UNITS, unit: 'A', constraint: 'any' },
              { key: 'rn', label: 'Norton direnci Rn', name: 'Rn', value: '4', units: RESISTANCE_UNITS, unit: 'Ω' },
              rlField,
            ],
            compute(v) {
              const r = nortonToThevenin(v);
              return {
                results: [{ label: 'Thevenin gerilimi Vth', value: formatSI(r.vth, 'V') }, { label: 'Thevenin direnci Rth', value: formatSI(r.rth, 'Ω') }, ...loadRows(r)],
                raw: r,
              };
            },
            diagram: (v, out) => equivalents({ vth: out?.raw.vth, rth: v.rn, iN: v.in }),
            diagramTitle: 'Eşdeğer devreler',
            formulas: [formula(String.raw`V_{th} = I_N R_N,\qquad R_{th} = R_N`, 'Vth = In·Rn,  Rth = Rn')],
            notes,
          }),
        },
      ],
    }));
  },
};
