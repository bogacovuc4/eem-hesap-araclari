import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { VOLTAGE_UNITS, CURRENT_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { threePhaseFromLine, threePhaseFromImpedance } from '../../calc/power.js';
import { svg, figure, twoTerminal, dot, terminal, label, fmt } from '../schematic.js';
import { complexText } from '../rf/line-input.js';

const L1 = [130, 26];
const L2 = [40, 176];
const L3 = [220, 176];

/** Y ya da Δ bağlı dengeli yük; her kolda aynı Z. */
function loadFigure(connection, zText) {
  const parts = connection === 'Y'
    ? [twoTerminal('resistor', L1, [130, 120]), twoTerminal('resistor', L2, [130, 120]), twoTerminal('resistor', L3, [130, 120]), dot(130, 120), label(146, 72, 'Z', zText), label(138, 138, 'N', '')]
    : [twoTerminal('resistor', L1, L2), twoTerminal('resistor', L2, L3), twoTerminal('resistor', L3, L1), label(130, 200, 'Z (her kol)', zText, { anchor: 'middle' })];
  return figure(svg([-10, 0, 280, 225], connection === 'Y' ? 'Yıldız bağlı dengeli yük' : 'Üçgen bağlı dengeli yük',
    ...parts,
    terminal(...L1), terminal(...L2), terminal(...L3),
    label(L1[0], L1[1] - 10, 'L1', '', { anchor: 'middle' }),
    label(L2[0] - 10, L2[1] + 4, 'L2', '', { anchor: 'end' }),
    label(L3[0] + 10, L3[1] + 4, 'L3', ''),
  ), connection === 'Y' ? 'Yıldız (Y)' : 'Üçgen (Δ)');
}

function impedancePanel(connection) {
  return calculatorPanel({
    fields: [
      { key: 'vll', label: 'Hat (faz–faz) gerilimi', name: 'V_LL', value: '400', units: VOLTAGE_UNITS, unit: 'V' },
      { key: 'r', label: 'Faz başına direnç R (Ω)', name: 'R', value: '10', constraint: 'nonnegative' },
      { key: 'x', label: 'Faz başına reaktans X (Ω)', name: 'X', value: '10', constraint: 'any', hint: 'Endüktif +, kapasitif −' },
    ],
    compute(v) {
      const r = threePhaseFromImpedance({ vll: v.vll, r: v.r, x: v.x, connection });
      return {
        results: [
          { label: 'Hat akımı IL', value: formatSI(r.il, 'A') },
          { label: 'Faz gerilimi', value: formatSI(r.vph, 'V') },
          { label: 'Faz akımı', value: formatSI(r.iph, 'A') },
          { label: 'Aktif güç P', value: formatSI(r.p, 'W') },
          { label: 'Reaktif güç Q', value: formatSI(r.q, 'VAr') },
          { label: 'Görünür güç S', value: formatSI(r.s, 'VA') },
          { label: 'Güç faktörü', value: `${formatNumber(r.pf)} (${r.phaseDeg >= 0 ? 'geri' : 'ileri'})` },
        ],
      };
    },
    diagram: (v) => loadFigure(connection, Number.isFinite(v.r) && Number.isFinite(v.x) ? complexText({ re: v.r, im: v.x }, 'Ω', 3) : ''),
    diagramTitle: 'Yük',
    formulas: [connection === 'Y'
      ? formula(String.raw`V_{faz} = \frac{V_{LL}}{\sqrt3},\quad I_L = I_{faz} = \frac{V_{faz}}{|Z|},\quad P = 3I_{faz}^2R`, 'Vfaz = VLL/√3,  IL = Ifaz = Vfaz/|Z|,  P = 3·Ifaz²·R')
      : formula(String.raw`V_{faz} = V_{LL},\quad I_{faz} = \frac{V_{LL}}{|Z|},\quad I_L = \sqrt3\,I_{faz},\quad P = 3I_{faz}^2R`, 'Vfaz = VLL,  Ifaz = VLL/|Z|,  IL = √3·Ifaz,  P = 3·Ifaz²·R')],
    notes: [
      'Dengeli üç fazlı sistem: üç faz gerilimi eşit genlikte ve 120° aralıklıdır, üç faz empedansı eşittir.',
      'Aynı Z ile üçgen bağlı yük, yıldız bağlıya göre 3 kat güç çeker.',
    ],
  });
}

export default {
  id: 'machines/three-phase',
  title: 'Üç fazlı sistem',
  render(container) {
    container.append(calculatorView({
      title: 'Üç fazlı dengeli sistem',
      intro: 'Yıldız ve üçgen bağlantıda faz/hat gerilim ve akımları, aktif, reaktif ve görünür güç.',
      modes: [
        {
          id: 'line',
          label: 'Hat değerlerinden güç',
          build: () => calculatorPanel({
            fields: [
              { key: 'vll', label: 'Hat (faz–faz) gerilimi', name: 'V_LL', value: '400', units: VOLTAGE_UNITS, unit: 'V' },
              { key: 'il', label: 'Hat akımı IL', name: 'IL', value: '10', units: CURRENT_UNITS, unit: 'A' },
              { key: 'pf', label: 'Güç faktörü cos φ', name: 'cos φ', value: '0.85', max: 1 },
            ],
            compute(v) {
              const y = threePhaseFromLine({ ...v, connection: 'Y' });
              const d = threePhaseFromLine({ ...v, connection: 'D' });
              return {
                results: [
                  { label: 'Aktif güç P', value: formatSI(y.p, 'W') },
                  { label: 'Reaktif güç Q', value: formatSI(y.q, 'VAr') },
                  { label: 'Görünür güç S', value: formatSI(y.s, 'VA') },
                  { label: 'Y bağlantıda faz gerilimi / akımı', value: `${formatSI(y.vph, 'V', 4)} / ${formatSI(y.iph, 'A', 4)}` },
                  { label: 'Δ bağlantıda faz gerilimi / akımı', value: `${formatSI(d.vph, 'V', 4)} / ${formatSI(d.iph, 'A', 4)}` },
                ],
              };
            },
            formulas: [formula(String.raw`S = \sqrt3\,V_{LL} I_L,\qquad P = S\cos\varphi,\qquad Q = S\sin\varphi`, 'S = √3·VLL·IL,  P = S·cos φ,  Q = S·sin φ')],
            notes: ['Güç bağlantı türünden bağımsızdır; yalnızca faz gerilim ve akımları değişir.'],
          }),
        },
        { id: 'wye', label: 'Y bağlı yük', build: () => impedancePanel('Y') },
        { id: 'delta', label: 'Δ bağlı yük', build: () => impedancePanel('D') },
      ],
    }));
  },
};
