import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber, VOLTAGE_UNITS } from '../../calc/units.js';
import { waveformStats } from '../../calc/circuit3.js';
import { svg, figure, s } from '../schematic.js';

const SHAPES = [
  ['sine', 'Sinüs', String.raw`V_{\text{rms}}=\frac{V_p}{\sqrt2},\quad |V|_{\text{ort}}=\frac{2V_p}{\pi}`, 'Vrms = Vp/√2,  |V|ort = 2Vp/π'],
  ['half', 'Yarım dalga', String.raw`V_{\text{rms}}=\frac{V_p}{2},\quad V_{dc}=\frac{V_p}{\pi}`, 'Vrms = Vp/2,  Vdc = Vp/π'],
  ['full', 'Tam dalga', String.raw`V_{\text{rms}}=\frac{V_p}{\sqrt2},\quad V_{dc}=\frac{2V_p}{\pi}`, 'Vrms = Vp/√2,  Vdc = 2Vp/π'],
  ['square', 'Kare', String.raw`V_{\text{rms}}=V_p,\quad |V|_{\text{ort}}=V_p`, 'Vrms = Vp,  |V|ort = Vp'],
  ['triangle', 'Üçgen / testere', String.raw`V_{\text{rms}}=\frac{V_p}{\sqrt3},\quad |V|_{\text{ort}}=\frac{V_p}{2}`, 'Vrms = Vp/√3,  |V|ort = Vp/2'],
  ['pulse', 'Darbe (PWM)', String.raw`V_{\text{rms}}=V_p\sqrt{D},\quad V_{dc}=V_pD`, 'Vrms = Vp·√D,  Vdc = Vp·D'],
];

function wave(shape, duty) {
  const N = 200;
  const f = {
    sine: (t) => Math.sin(2 * Math.PI * t),
    half: (t) => Math.max(0, Math.sin(2 * Math.PI * t)),
    full: (t) => Math.abs(Math.sin(2 * Math.PI * t)),
    square: (t) => ((t % 1) < 0.5 ? 1 : -1),
    triangle: (t) => { const u = (t + 0.25) % 1; return u < 0.5 ? 4 * u - 1 : 3 - 4 * u; },
    pulse: (t) => ((t % 1) < duty ? 1 : 0),
  }[shape];
  const pts = Array.from({ length: N + 1 }, (_, i) => { const t = (2 * i) / N; return [20 + i * 2, 70 - 50 * f(t)]; });
  return figure(svg([0, 0, 440, 140], 'Dalga şekli (iki periyot)',
    s('line', { class: 'sch-axis', x1: 20, y1: 70, x2: 425, y2: 70 }),
    s('polyline', { class: 'sch-line sch-wave', points: pts.map((p) => p.join(',')).join(' '), fill: 'none' })), 'İki periyot');
}

export default {
  id: 'circuit/waveform',
  title: 'RMS ve ortalama değer',
  render(container) {
    container.append(calculatorView({
      title: 'Dalga şekli: RMS, ortalama, tepe ve biçim faktörü',
      intro: 'Sinüs, doğrultulmuş sinüs, kare, üçgen ve darbe dalgalarının etkin (RMS) ve ortalama değerleri.',
      modes: SHAPES.map(([shape, label, tex, plain]) => ({
        id: shape,
        label,
        build: () => calculatorPanel({
          fields: [
            { key: 'vp', label: 'Tepe değer Vp', name: 'Vp', value: '10', units: VOLTAGE_UNITS, unit: 'V' },
            ...(shape === 'pulse' ? [{ key: 'd', label: 'Görev oranı D (%)', name: 'D', value: '25', min: 0.01, max: 100 }] : []),
          ],
          compute(v) {
            const r = waveformStats({ shape, vp: v.vp, duty: (v.d ?? 50) / 100 });
            return {
              results: [
                { label: 'Etkin değer Vrms', value: formatSI(r.rms, 'V') },
                { label: 'Ortalama (DC) değer', value: formatSI(r.avg, 'V') },
                { label: 'Mutlak ortalama |V|ort', value: formatSI(r.absAvg, 'V') },
                { label: 'Tepeden tepeye Vpp', value: formatSI(r.vpp, 'V') },
                { label: 'AC bileşenin RMS’i', value: formatSI(r.acRms, 'V') },
                { label: 'Tepe faktörü Vp/Vrms', value: formatNumber(r.crest, 4) },
                { label: 'Biçim faktörü Vrms/|V|ort', value: formatNumber(r.form, 4) },
                { label: 'Dalgalanma faktörü Vac,rms/Vdc', value: r.ripple === null ? '— (DC yok)' : formatNumber(r.ripple, 4) },
                { label: '1 Ω’da ortalama güç Vrms²/R', value: formatSI(r.rms ** 2, 'W') },
              ],
            };
          },
          diagram: (v) => wave(shape, (v.d ?? 50) / 100),
          diagramTitle: 'Dalga şekli',
          formulas: [
            formula(String.raw`V_{\text{rms}}=\sqrt{\frac1T\int_0^T v^2(t)\,dt},\qquad V_{\text{ort}}=\frac1T\int_0^T v(t)\,dt`, 'Vrms = √((1/T)∫v²dt),  Vort = (1/T)∫v dt'),
            formula(tex, plain),
          ],
          notes: [
            'Ortalama değeri sıfır olan dalgalarda biçim faktörü mutlak (doğrultulmuş) ortalamayla hesaplanır.',
            'Ucuz ölçü aletleri |V|ort’u ölçüp 1,111 ile çarpar: sinüs dışı dalgada yanlış RMS gösterir (“true RMS” olmayan multimetre).',
          ],
        }),
      })),
    }));
  },
};
