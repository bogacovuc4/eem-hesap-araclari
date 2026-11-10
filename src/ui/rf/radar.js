import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { FREQUENCY_UNITS, DISTANCE_UNITS, POWER_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { radarReceivedPower, radarMaxRange } from '../../calc/rf2.js';
import { svg, figure, s, label, wire } from '../schematic.js';

function radarDiagram(rangeText) {
  return figure(svg([0, 0, 440, 140], 'Radar ve hedef',
    // Radar anteni (çanak)
    s('path', { d: 'M60 40 q 30 35 0 70', class: 'sch-line' }),
    wire([62, 75], [80, 75]),
    s('line', { x1: 40, y1: 75, x2: 62, y2: 75, class: 'sch-line' }),
    // Giden ve dönen dalga
    s('line', { x1: 90, y1: 68, x2: 340, y2: 68, class: 'sch-line', 'stroke-dasharray': '6 5' }),
    s('polygon', { points: '340,63 350,68 340,73', class: 'sch-fill' }),
    s('line', { x1: 350, y1: 84, x2: 100, y2: 84, class: 'sch-line', 'stroke-dasharray': '2 4' }),
    s('polygon', { points: '100,79 90,84 100,89', class: 'sch-fill' }),
    // Hedef
    s('polygon', { points: '370,60 400,76 370,92 380,76', class: 'sch-line sch-body' }),
    label(65, 128, 'Radar (Pt, G)', '', { anchor: 'middle' }),
    label(385, 120, 'Hedef (σ)', '', { anchor: 'middle' }),
    label(220, 52, 'R', rangeText, { anchor: 'middle' }),
  ));
}

const common = [
  { key: 'pt', label: 'Tepe verici gücü Pt', name: 'Pt', value: '1', units: POWER_UNITS, unit: 'kW' },
  { key: 'g', label: 'Anten kazancı G (dBi)', name: 'G', value: '30', constraint: 'any', hint: 'Aynı anten gönderir ve alır (tek istasyonlu radar)' },
  { key: 'f', label: 'Frekans f', name: 'f', value: '10', units: FREQUENCY_UNITS, unit: 'GHz' },
  { key: 'rcs', label: 'Radar kesit alanı σ (m²)', name: 'σ', value: '1', hint: 'Küçük İHA ≈ 0,01 · insan ≈ 1 · otomobil ≈ 100 m²' },
  { key: 'loss', label: 'Sistem kayıpları L (dB)', name: 'L', value: '0', constraint: 'nonnegative' },
];

const formulas = () => [
  formula(String.raw`P_r = \frac{P_t\,G^2\,\lambda^2\,\sigma}{(4\pi)^3\,R^4\,L},\qquad R_{\max} = \left[\frac{P_t\,G^2\,\lambda^2\,\sigma}{(4\pi)^3\,P_{\min}\,L}\right]^{1/4}`,
    'Pr = Pt·G²·λ²·σ / ((4π)³·R⁴·L),  Rmax = [Pt·G²·λ²·σ / ((4π)³·Pmin·L)]^(1/4)'),
];

const notes = [
  'Tek istasyonlu (monostatik) radar, serbest uzay ve tek darbe (darbe birikimi yok) varsayılır.',
  'Alınan güç menzilin dördüncü kuvvetiyle düşer: menzili iki katına çıkarmak için 16 kat (12 dB) fazla güç gerekir.',
  'Radar kesit alanı σ hedefin açısına, frekansa ve polarizasyona güçlü biçimde bağlıdır; verilen değerler kaba ölçeklerdir.',
];

export default {
  id: 'rf/radar',
  title: 'Radar menzil denklemi',
  render(container) {
    container.append(calculatorView({
      title: 'Radar menzil denklemi',
      intro: 'Hedeften dönen güç ya da alıcı duyarlılığına göre en büyük tespit menzili.',
      modes: [
        {
          id: 'power',
          label: 'Alınan güç',
          build: () => calculatorPanel({
            fields: [...common, { key: 'r', label: 'Menzil R', name: 'R', value: '10', units: DISTANCE_UNITS, unit: 'km' }],
            compute(v) {
              const r = radarReceivedPower({ pt: v.pt, gainDbi: v.g, f: v.f, rcs: v.rcs, range: v.r, lossDb: v.loss });
              return {
                results: [
                  { label: 'Alınan güç Pr', value: `${formatNumber(r.prDbm)} dBm` },
                  { label: 'Alınan güç (W)', value: formatSI(r.pr, 'W') },
                  { label: 'Dalga boyu λ', value: formatSI(r.lambda, 'm') },
                  { label: 'Gidiş-dönüş süresi', value: formatSI((2 * v.r) / 299792458, 's') },
                ],
              };
            },
            diagram: (v) => radarDiagram(Number.isFinite(v.r) ? formatSI(v.r, 'm', 3) : ''),
            diagramTitle: 'Geometri',
            formulas: formulas(),
            notes,
          }),
        },
        {
          id: 'range',
          label: 'En büyük menzil',
          build: () => calculatorPanel({
            fields: [...common, { key: 'pmin', label: 'Alıcının en küçük algılanabilir gücü (dBm)', name: 'Pmin', value: '-100', constraint: 'any', hint: 'Gürültü sayfasındaki “Alıcı duyarlılığı” değerini kullanabilirsiniz' }],
            compute(v) {
              const r = radarMaxRange({ pt: v.pt, gainDbi: v.g, f: v.f, rcs: v.rcs, pminDbm: v.pmin, lossDb: v.loss });
              return {
                results: [
                  { label: 'En büyük menzil Rmax', value: formatSI(r.range, 'm') },
                  { label: 'Gidiş-dönüş süresi', value: formatSI((2 * r.range) / 299792458, 's') },
                  { label: 'Dalga boyu λ', value: formatSI(r.lambda, 'm') },
                ],
                raw: r,
              };
            },
            diagram: (v, out) => radarDiagram(out ? formatSI(out.raw.range, 'm', 3) : '?'),
            diagramTitle: 'Geometri',
            formulas: formulas(),
            notes,
          }),
        },
      ],
    }));
  },
};
