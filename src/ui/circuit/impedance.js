import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import {
  RESISTANCE_UNITS, CAPACITANCE_UNITS, INDUCTANCE_UNITS, FREQUENCY_UNITS, VOLTAGE_UNITS, formatSI, formatNumber,
} from '../../calc/units.js';
import { impedance } from '../../calc/circuit2.js';
import { complexText } from '../rf/line-input.js';
import { svg, figure, twoTerminal, wire, dot, terminal, label, fmt } from '../schematic.js';

const ELEMENTS = [
  { key: 'r', kind: 'resistor', name: 'R', unit: 'Ω' },
  { key: 'l', kind: 'inductor', name: 'L', unit: 'H' },
  { key: 'c', kind: 'capacitor', name: 'C', unit: 'F' },
];

/** Değeri 0 olmayan elemanları seri zincir ya da paralel kollar olarak çizer. */
function diagram(connection, v, out) {
  const parts = ELEMENTS.filter((e) => Number.isFinite(v[e.key]) && v[e.key] > 0);
  const zText = out ? complexText(out.raw.z, 'Ω', 3) : '?';
  if (connection === 'series') {
    const step = 100;
    const x0 = 60;
    const width = x0 + parts.length * step + 60;
    return figure(svg([0, 10, Math.max(width, 300), 110], 'Seri empedans',
      terminal(30, 60), wire([30, 60], [x0, 60]),
      ...parts.flatMap((e, i) => [
        twoTerminal(e.kind, [x0 + i * step, 60], [x0 + (i + 1) * step, 60]),
        label(x0 + i * step + step / 2, 28, e.name, fmt(v[e.key], e.unit), { anchor: 'middle' }),
      ]),
      wire([x0 + parts.length * step, 60], [x0 + parts.length * step + 30, 60]),
      terminal(x0 + parts.length * step + 30, 60),
      label(30, 98, 'Z', zText),
    ));
  }
  const top = 40;
  const bottom = 140;
  const step = 100;
  return figure(svg([0, 0, Math.max(90 + parts.length * step, 300), 190], 'Paralel empedans',
    terminal(30, top), terminal(30, bottom),
    wire([30, top], [70 + (parts.length - 1) * step, top]),
    wire([30, bottom], [70 + (parts.length - 1) * step, bottom]),
    ...parts.flatMap((e, i) => {
      const x = 70 + i * step;
      return [twoTerminal(e.kind, [x, top], [x, bottom]), dot(x, top), dot(x, bottom), label(x + 16, 86, e.name, fmt(v[e.key], e.unit))];
    }),
    label(30, 168, 'Z', zText),
  ));
}

function panel(connection) {
  const zeroHint = connection === 'series' ? '0 = bu eleman yok (kısa devre)' : '0 = bu eleman yok (açık devre)';
  return calculatorPanel({
    fields: [
      { key: 'r', label: 'Direnç R', name: 'R', value: '100', units: RESISTANCE_UNITS, unit: 'Ω', constraint: 'nonnegative', hint: zeroHint },
      { key: 'l', label: 'Endüktans L', name: 'L', value: '10', units: INDUCTANCE_UNITS, unit: 'mH', constraint: 'nonnegative' },
      { key: 'c', label: 'Kapasite C', name: 'C', value: '1', units: CAPACITANCE_UNITS, unit: 'µF', constraint: 'nonnegative' },
      { key: 'f', label: 'Frekans f', name: 'f', value: '1', units: FREQUENCY_UNITS, unit: 'kHz' },
      { key: 'v', label: 'Uygulanan gerilim (etkin)', name: 'V', value: '10', units: VOLTAGE_UNITS, unit: 'V' },
    ],
    compute(v) {
      const r = impedance({ connection, r: v.r, l: v.l, c: v.c, f: v.f, vrms: v.v });
      const character = Math.abs(r.phase) < 0.05 ? 'rezistif (rezonansta)' : r.phase > 0 ? 'endüktif (akım geride)' : 'kapasitif (akım ileride)';
      return {
        results: [
          { label: 'Empedans Z', value: complexText(r.z) },
          { label: '|Z| ∠ φ', value: `${formatSI(r.mag, 'Ω')} ∠ ${formatNumber(r.phase, 4)}°` },
          { label: 'Karakter', value: character },
          { label: 'Endüktif reaktans XL', value: v.l > 0 ? formatSI(r.xl, 'Ω') : '—' },
          { label: 'Kapasitif reaktans XC', value: v.c > 0 ? formatSI(r.xc, 'Ω') : '—' },
          { label: 'Güç faktörü cos φ', value: formatNumber(r.pf) },
          { label: 'Akım (etkin)', value: formatSI(r.irms, 'A') },
          { label: 'Aktif güç P', value: formatSI(r.p, 'W') },
          { label: 'Reaktif güç Q', value: formatSI(r.q, 'VAr') },
          { label: 'Görünür güç S', value: formatSI(r.s, 'VA') },
        ],
        raw: r,
      };
    },
    diagram: (v, out) => diagram(connection, v, out),
    formulas: [connection === 'series'
      ? formula(String.raw`Z = R + j\left(\omega L - \frac{1}{\omega C}\right),\qquad X_L = \omega L,\ \ X_C = \frac{1}{\omega C},\ \ \omega = 2\pi f`,
        'Z = R + j(ωL − 1/(ωC)),  XL = ωL,  XC = 1/(ωC)')
      : formula(String.raw`Y = \frac{1}{Z} = \frac{1}{R} + j\left(\omega C - \frac{1}{\omega L}\right)`, 'Y = 1/Z = 1/R + j(ωC − 1/(ωL))')],
    notes: [
      'İdeal bileşenler ve sinüzoidal sürekli durum varsayılır.',
      'Faz açısı pozitifse devre endüktiftir (gerilim akımın önünde), negatifse kapasitiftir.',
      'Güçler, verilen etkin gerilim için hesaplanır: P = I²·Re{Z}, Q = I²·Im{Z}, S = V·I.',
    ],
  });
}

export default {
  id: 'circuit/impedance',
  title: 'Empedans (|Z| ve faz)',
  render(container) {
    container.append(calculatorView({
      title: 'Empedans hesabı',
      intro: 'Seri ya da paralel R, L, C bağlantısının belirli frekanstaki empedansı, faz açısı, akımı ve güçleri.',
      modes: [
        { id: 'series', label: 'Seri', build: () => panel('series') },
        { id: 'parallel', label: 'Paralel', build: () => panel('parallel') },
      ],
    }));
  },
};
