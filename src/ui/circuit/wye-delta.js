import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { RESISTANCE_UNITS, formatSI } from '../../calc/units.js';
import { deltaToWye, wyeToDelta } from '../../calc/circuit2.js';
import { svg, figure, twoTerminal, dot, terminal, label, s, fmt } from '../schematic.js';

const A = [120, 30];
const B = [40, 170];
const C = [200, 170];

function deltaFigure(d) {
  return figure(svg([0, 0, 260, 215], 'Üçgen (Δ) bağlantı',
    twoTerminal('resistor', A, B), twoTerminal('resistor', B, C), twoTerminal('resistor', C, A),
    terminal(...A), terminal(...B), terminal(...C),
    label(A[0], A[1] - 10, 'a', '', { anchor: 'middle' }),
    label(B[0] - 10, B[1] + 4, 'b', '', { anchor: 'end' }),
    label(C[0] + 10, C[1] + 4, 'c', ''),
    label(62, 92, 'Rab', fmt(d.rab, 'Ω'), { anchor: 'end' }),
    label(178, 92, 'Rca', fmt(d.rca, 'Ω')),
    label(120, 196, 'Rbc', fmt(d.rbc, 'Ω'), { anchor: 'middle' }),
  ), 'Üçgen (Δ)');
}

function wyeFigure(y) {
  const N = [120, 120];
  return figure(svg([0, 0, 260, 215], 'Yıldız (Y) bağlantı',
    twoTerminal('resistor', A, N), twoTerminal('resistor', B, N), twoTerminal('resistor', C, N),
    dot(...N), terminal(...A), terminal(...B), terminal(...C),
    label(A[0], A[1] - 10, 'a', '', { anchor: 'middle' }),
    label(B[0] - 10, B[1] + 4, 'b', '', { anchor: 'end' }),
    label(C[0] + 10, C[1] + 4, 'c', ''),
    label(136, 64, 'Ra', fmt(y.ra, 'Ω')),
    label(60, 116, 'Rb', fmt(y.rb, 'Ω'), { anchor: 'end' }),
    label(180, 116, 'Rc', fmt(y.rc, 'Ω')),
    s('text', { x: 120, y: 208, class: 'sch-text', 'text-anchor': 'middle' }, ''),
  ), 'Yıldız (Y)');
}

const notes = [
  'Dönüşüm, a, b, c uçlarından bakıldığında iki devrenin aynı davranmasını sağlar; iç düğüm (Y merkezi) dışarıdan görünmez.',
  'Dengeli devrede (üç direnç eşit) R_Y = R_Δ / 3 ve R_Δ = 3·R_Y olur.',
  'Aynı formüller sinüzoidal sürekli durumda karmaşık empedanslar için de geçerlidir (bu hesaplayıcı yalnızca direnç kullanır).',
];

const field = (key, label, value) => ({ key, label, name: label, value, units: RESISTANCE_UNITS, unit: 'Ω' });

export default {
  id: 'circuit/wye-delta',
  title: 'Yıldız ↔ üçgen (Y–Δ)',
  render(container) {
    container.append(calculatorView({
      title: 'Yıldız ↔ üçgen (Y–Δ) dönüşümü',
      intro: 'Üç uçlu direnç ağlarının birbirine eşdeğer yıldız ve üçgen biçimleri.',
      modes: [
        {
          id: 'd2y',
          label: 'Δ → Y',
          build: () => calculatorPanel({
            fields: [field('rab', 'Rab', '30'), field('rbc', 'Rbc', '30'), field('rca', 'Rca', '30')],
            compute(v) {
              const r = deltaToWye(v);
              return { results: [{ label: 'Ra', value: formatSI(r.ra, 'Ω') }, { label: 'Rb', value: formatSI(r.rb, 'Ω') }, { label: 'Rc', value: formatSI(r.rc, 'Ω') }], raw: r };
            },
            diagram: (v, out) => [deltaFigure(v), wyeFigure(out?.raw ?? {})],
            diagramTitle: 'Dönüşüm',
            formulas: [formula(String.raw`R_a = \frac{R_{ab}R_{ca}}{R_{ab}+R_{bc}+R_{ca}},\quad R_b = \frac{R_{ab}R_{bc}}{R_{ab}+R_{bc}+R_{ca}},\quad R_c = \frac{R_{bc}R_{ca}}{R_{ab}+R_{bc}+R_{ca}}`,
              'Ra = Rab·Rca/ΣR,  Rb = Rab·Rbc/ΣR,  Rc = Rbc·Rca/ΣR')],
            notes,
          }),
        },
        {
          id: 'y2d',
          label: 'Y → Δ',
          build: () => calculatorPanel({
            fields: [field('ra', 'Ra', '10'), field('rb', 'Rb', '20'), field('rc', 'Rc', '30')],
            compute(v) {
              const r = wyeToDelta(v);
              return { results: [{ label: 'Rab', value: formatSI(r.rab, 'Ω') }, { label: 'Rbc', value: formatSI(r.rbc, 'Ω') }, { label: 'Rca', value: formatSI(r.rca, 'Ω') }], raw: r };
            },
            diagram: (v, out) => [wyeFigure(v), deltaFigure(out?.raw ?? {})],
            diagramTitle: 'Dönüşüm',
            formulas: [formula(String.raw`R_{ab} = \frac{N}{R_c},\quad R_{bc} = \frac{N}{R_a},\quad R_{ca} = \frac{N}{R_b},\qquad N = R_aR_b + R_bR_c + R_cR_a`,
              'Rab = N/Rc,  Rbc = N/Ra,  Rca = N/Rb,  N = Ra·Rb + Rb·Rc + Rc·Ra')],
            notes,
          }),
        },
      ],
    }));
  },
};
