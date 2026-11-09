import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import {
  RESISTANCE_UNITS, CAPACITANCE_UNITS, INDUCTANCE_UNITS, VOLTAGE_UNITS, TIME_UNITS, formatSI, formatNumber,
} from '../../calc/units.js';
import { rcTransient, rlTransient } from '../../calc/circuit.js';
import { svg, figure, twoTerminal, wire, ground, label, fmt, s } from '../schematic.js';
import { lineChart } from '../chart.js';

/** t = 0'da kapanan anahtarlı basamak devresi: kaynak – anahtar – R – (C ya da L) */
function stepSchematic({ kind, r, x, vs }) {
  const isC = kind === 'C';
  return figure(svg([0, 10, 380, 190], `RC ya da RL basamak yanıtı devresi`,
    twoTerminal('source', [60, 60], [60, 170]),
    wire([60, 60], [110, 60]),
    // Anahtar (t = 0'da kapanır)
    s('circle', { cx: 112, cy: 60, r: 2.5, class: 'sch-fill' }),
    s('line', { x1: 112, y1: 60, x2: 140, y2: 46, class: 'sch-line' }),
    s('circle', { cx: 144, cy: 60, r: 2.5, class: 'sch-fill' }),
    s('path', { d: 'M118 40 q 12 -8 22 4', class: 'sch-line' }),
    s('polygon', { points: '140,44 136,38 143,39', class: 'sch-fill' }),
    label(128, 28, 't = 0', '', { anchor: 'middle' }),
    twoTerminal('resistor', [144, 60], [270, 60]),
    twoTerminal(isC ? 'capacitor' : 'inductor', [270, 60], [270, 170]),
    wire([60, 170], [270, 170]),
    ground(165, 170),
    label(40, 111, 'Vs', fmt(vs, 'V'), { anchor: 'end' }),
    label(207, 30, 'R', fmt(r, 'Ω'), { anchor: 'middle' }),
    label(288, 111, isC ? 'C' : 'L', fmt(x, isC ? 'F' : 'H')),
  ));
}

const SAMPLES = 160;

function curve({ tau, tEnd, valueAt }) {
  return Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const t = (tEnd * i) / SAMPLES;
    return { x: t, y: valueAt(t) };
  });
}

function timeFmt(v) {
  return formatSI(v, 's', 3);
}

const timeField = { key: 't', label: 'Zaman t', name: 't', value: '1', units: TIME_UNITS, unit: 'ms', constraint: 'nonnegative' };

const commonNotes = [
  'Anahtar t = 0 anında kapanır ve kaynak ideal bir gerilim basamağı uygular (kaynak iç direnci R’ye dahil edilmelidir).',
  '1τ’da son değere giden yolun %63,2’si, 5τ’da %99,3’ü tamamlanır. %10 → %90 yükselme süresi τ·ln 9 ≈ 2,2τ’dur.',
  'Grafiğin üzerine gelerek herhangi bir andaki değeri okuyabilirsiniz; işaretli nokta girilen t anıdır.',
];

export default {
  id: 'circuit/transient',
  title: 'RC / RL geçici yanıt',
  render(container) {
    container.append(calculatorView({
      title: 'RC / RL geçici yanıt',
      intro: 'Basamak girişte kondansatör gerilimi ya da bobin akımının zamanla değişimi.',
      modes: [
        {
          id: 'rc',
          label: 'RC (kondansatör gerilimi)',
          build: () => calculatorPanel({
            fields: [
              { key: 'r', label: 'Direnç R', name: 'R', value: '1', units: RESISTANCE_UNITS, unit: 'kΩ' },
              { key: 'c', label: 'Kapasite C', name: 'C', value: '1', units: CAPACITANCE_UNITS, unit: 'µF' },
              { key: 'vs', label: 'Kaynak gerilimi Vs', name: 'Vs', value: '5', units: VOLTAGE_UNITS, unit: 'V', constraint: 'any' },
              { key: 'v0', label: 'Başlangıç gerilimi vC(0)', name: 'vC(0)', value: '0', units: VOLTAGE_UNITS, unit: 'V', constraint: 'any', hint: 'Deşarj için Vs = 0 ve vC(0) > 0 girin.' },
              timeField,
            ],
            compute(v) {
              const r = rcTransient(v);
              return {
                results: [
                  { label: 'Zaman sabiti τ = RC', value: timeFmt(r.tau) },
                  { label: 'vC(t)', value: formatSI(r.vc, 'V') },
                  { label: 'Akım i(t)', value: formatSI(r.i, 'A') },
                  { label: 'Direnç gerilimi vR(t)', value: formatSI(r.vr, 'V') },
                  { label: 'Tamamlanan yol', value: `%${formatNumber(r.progress * 100, 4)}` },
                  { label: 't / τ', value: formatNumber(v.t / r.tau, 3) },
                  { label: 'Yükselme süresi (%10→%90)', value: timeFmt(r.riseTime) },
                  { label: '5τ (≈ %99,3)', value: timeFmt(r.settle5tau) },
                ],
                raw: r,
              };
            },
            diagram: (v, out) => {
              const sch = stepSchematic({ kind: 'C', r: v.r, x: v.c, vs: v.vs });
              if (!out) return sch;
              const { tau } = out.raw;
              const tEnd = Math.max(5 * tau, v.t * 1.1);
              const pts = curve({ tau, tEnd, valueAt: (t) => rcTransient({ ...v, t }).vc });
              return [sch, lineChart({
                title: 'Kondansatör gerilimi vC(t)',
                points: pts,
                xLabel: 'Zaman (s)',
                yLabel: 'vC (V)',
                xFormat: (x) => formatSI(x, 's', 2),
                yFormat: (y, precise) => formatSI(y, 'V', precise ? 4 : 2),
                marker: { x: v.t, y: out.raw.vc },
                refs: [{ x: tau, label: 'τ' }, { x: 5 * tau, label: '5τ' }],
                tableHeaders: ['t', 't/τ', 'vC'],
                tableRows: [0, 0.5, 1, 2, 3, 4, 5].map((m) => [timeFmt(m * tau), formatNumber(m, 2), formatSI(rcTransient({ ...v, t: m * tau }).vc, 'V')]),
              })];
            },
            diagramTitle: 'Devre ve yanıt',
            formulas: [formula(String.raw`v_C(t) = V_s + \left(v_C(0) - V_s\right)e^{-t/\tau},\qquad \tau = RC,\qquad i(t) = \frac{V_s - v_C(t)}{R}`,
              'vC(t) = Vs + (vC(0) − Vs)·e^(−t/τ),  τ = RC,  i(t) = (Vs − vC)/R')],
            notes: commonNotes,
          }),
        },
        {
          id: 'rl',
          label: 'RL (bobin akımı)',
          build: () => calculatorPanel({
            fields: [
              { key: 'r', label: 'Direnç R', name: 'R', value: '10', units: RESISTANCE_UNITS, unit: 'Ω' },
              { key: 'l', label: 'Endüktans L', name: 'L', value: '100', units: INDUCTANCE_UNITS, unit: 'mH' },
              { key: 'vs', label: 'Kaynak gerilimi Vs', name: 'Vs', value: '12', units: VOLTAGE_UNITS, unit: 'V', constraint: 'any' },
              { key: 'i0', label: 'Başlangıç akımı iL(0) (A)', name: 'iL(0)', value: '0', constraint: 'any' },
              { ...timeField, value: '10' },
            ],
            compute(v) {
              const r = rlTransient(v);
              return {
                results: [
                  { label: 'Zaman sabiti τ = L/R', value: timeFmt(r.tau) },
                  { label: 'iL(t)', value: formatSI(r.il, 'A') },
                  { label: 'Son değer Vs/R', value: formatSI(r.iFinal, 'A') },
                  { label: 'Bobin gerilimi vL(t)', value: formatSI(r.vl, 'V') },
                  { label: 'Tamamlanan yol', value: `%${formatNumber(r.progress * 100, 4)}` },
                  { label: 't / τ', value: formatNumber(v.t / r.tau, 3) },
                  { label: 'Yükselme süresi (%10→%90)', value: timeFmt(r.riseTime) },
                  { label: '5τ (≈ %99,3)', value: timeFmt(r.settle5tau) },
                ],
                raw: r,
              };
            },
            diagram: (v, out) => {
              const sch = stepSchematic({ kind: 'L', r: v.r, x: v.l, vs: v.vs });
              if (!out) return sch;
              const { tau } = out.raw;
              const tEnd = Math.max(5 * tau, v.t * 1.1);
              const pts = curve({ tau, tEnd, valueAt: (t) => rlTransient({ ...v, t }).il });
              return [sch, lineChart({
                title: 'Bobin akımı iL(t)',
                points: pts,
                xLabel: 'Zaman (s)',
                yLabel: 'iL (A)',
                xFormat: (x) => formatSI(x, 's', 2),
                yFormat: (y, precise) => formatSI(y, 'A', precise ? 4 : 2),
                marker: { x: v.t, y: out.raw.il },
                refs: [{ x: tau, label: 'τ' }, { x: 5 * tau, label: '5τ' }],
                tableHeaders: ['t', 't/τ', 'iL'],
                tableRows: [0, 0.5, 1, 2, 3, 4, 5].map((m) => [timeFmt(m * tau), formatNumber(m, 2), formatSI(rlTransient({ ...v, t: m * tau }).il, 'A')]),
              })];
            },
            diagramTitle: 'Devre ve yanıt',
            formulas: [formula(String.raw`i_L(t) = \frac{V_s}{R} + \left(i_L(0) - \frac{V_s}{R}\right)e^{-t/\tau},\qquad \tau = \frac{L}{R},\qquad v_L(t) = V_s - R\,i_L(t)`,
              'iL(t) = Vs/R + (iL(0) − Vs/R)·e^(−t/τ),  τ = L/R,  vL = Vs − R·iL')],
            notes: [...commonNotes, 'Bobinin iç direnci R’ye eklenmelidir.'],
          }),
        },
      ],
    }));
  },
};
