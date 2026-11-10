import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { RESISTANCE_UNITS, VOLTAGE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { bjtDividerBias } from '../../calc/electronics.js';
import { svg, figure, twoTerminal, wire, ground, dot, label, s, fmt } from '../schematic.js';
import { lineChart } from '../chart.js';

const REGION = { active: 'aktif (kuvvetlendirici)', saturation: 'doyma', cutoff: 'kesim' };

/** NPN transistör sembolü: taban (bx, by), kollektör üstte, emetör altta (oklu). */
function npn(bx, by) {
  const x = bx + 14;
  return s('g', {},
    s('circle', { cx: x + 14, cy: by, r: 26, class: 'sch-line' }),
    wire([bx, by], [x, by]),
    s('line', { x1: x, y1: by - 16, x2: x, y2: by + 16, class: 'sch-line', 'stroke-width': 3 }),
    wire([x, by - 8], [x + 26, by - 26]), wire([x + 26, by - 26], [x + 26, by - 40]),
    wire([x, by + 8], [x + 26, by + 26]), wire([x + 26, by + 26], [x + 26, by + 40]),
    s('polygon', { points: `${x + 26},${by + 26} ${x + 15},${by + 23} ${x + 20},${by + 16}`, class: 'sch-fill' }));
}

function schematic(v, r) {
  const top = 30;
  const gnd = 250;
  const bx = 120;
  const by = 140;
  const cx = bx + 40; // kollektör/emetör hattının x'i
  return figure(svg([-40, -16, 420, 296], 'Gerilim bölücülü BJT polarma devresi',
    wire([60, top], [cx, top]),
    label(60, top - 26, 'VCC', fmt(v.vcc, 'V'), { anchor: 'middle' }),
    twoTerminal('resistor', [60, top], [60, by]),
    twoTerminal('resistor', [60, by], [60, gnd]),
    wire([60, by], [bx, by]), dot(60, by),
    npn(bx, by),
    twoTerminal('resistor', [cx, top], [cx, by - 40]),
    twoTerminal('resistor', [cx, by + 40], [cx, gnd]),
    ground(60, gnd), ground(cx, gnd), dot(cx, top),
    label(44, 84, 'R1', fmt(v.r1, 'Ω'), { anchor: 'end' }),
    label(44, 196, 'R2', fmt(v.r2, 'Ω'), { anchor: 'end' }),
    label(cx + 16, 58, 'RC', fmt(v.rc, 'Ω')),
    label(cx + 16, 214, 'RE', fmt(v.re, 'Ω')),
    label(cx + 44, by - 34, 'VC', r ? fmt(r.vc, 'V') : ''),
    label(cx + 44, by + 30, 'VE', r ? fmt(r.ve, 'V') : ''),
    label(bx - 4, by - 34, 'VB', r ? fmt(r.vb, 'V') : '', { anchor: 'end' }),
    label(cx + 44, by - 2, 'IC', r ? fmt(r.ic, 'A') : '', { unknown: true }),
  ));
}

function loadLine(v, r) {
  const icMax = r.loadLineIc0;
  return lineChart({
    title: 'DC yük doğrusu ve Q noktası',
    points: [{ x: 0, y: icMax }, { x: v.vcc, y: 0 }],
    xLabel: 'VCE (V)',
    yLabel: 'IC (A)',
    xFormat: (x) => formatSI(x, 'V', 2),
    yFormat: (y, precise) => formatSI(y, 'A', precise ? 4 : 2),
    marker: { x: r.vce, y: r.ic },
    refs: [{ x: r.vce, label: 'Q' }],
  });
}

export default {
  id: 'electronics/bjt-bias',
  title: 'BJT polarma (gerilim bölücü)',
  render(container) {
    container.append(calculatorView({
      title: 'BJT polarma — gerilim bölücülü devre',
      intro: 'NPN transistörün çalışma noktası (Q): taban, kollektör ve emetör akım/gerilimleri, çalışma bölgesi ve DC yük doğrusu.',
      modes: [{
        id: 'divider',
        label: 'Gerilim bölücü',
        build: () => calculatorPanel({
          fields: [
            { key: 'vcc', label: 'Besleme VCC', name: 'VCC', value: '22', units: VOLTAGE_UNITS, unit: 'V' },
            { key: 'r1', label: 'R1 (VCC – taban)', name: 'R1', value: '39', units: RESISTANCE_UNITS, unit: 'kΩ' },
            { key: 'r2', label: 'R2 (taban – toprak)', name: 'R2', value: '3.9', units: RESISTANCE_UNITS, unit: 'kΩ' },
            { key: 'rc', label: 'Kollektör direnci RC', name: 'RC', value: '10', units: RESISTANCE_UNITS, unit: 'kΩ', constraint: 'nonnegative' },
            { key: 're', label: 'Emetör direnci RE', name: 'RE', value: '1.5', units: RESISTANCE_UNITS, unit: 'kΩ', constraint: 'nonnegative' },
            { key: 'beta', label: 'Akım kazancı β (hFE)', name: 'β', value: '140' },
            { key: 'vbe', label: 'VBE (V)', name: 'VBE', value: '0.7', constraint: 'nonnegative', hint: 'Silisyum ≈ 0,7 V · germanyum ≈ 0,3 V' },
          ],
          compute(v) {
            const r = bjtDividerBias(v);
            const warnings = [];
            if (r.region === 'saturation') warnings.push('Transistör doymada: β ilişkisi geçerli değil, akımı RC + RE sınırlıyor. Kuvvetlendirici için R1’i büyütün ya da R2’yi küçültün.');
            if (r.region === 'cutoff') warnings.push('Transistör kesimde: VTH ≤ VBE, taban akımı yok.');
            if (r.region === 'active' && (r.vce < 0.1 * v.vcc || r.vce > 0.9 * v.vcc)) warnings.push('Q noktası yük doğrusunun ucuna yakın: büyük işaretlerde kırpılma olur. Doğrusal kuvvetlendirme için VCE ≈ VCC/2 civarı hedeflenir.');
            if (r.region === 'active' && !r.approxValid) warnings.push('β·RE < 10·R2: yaklaşık yöntem (IB ihmal) bu devrede hatalı sonuç verir; burada tam (Thevenin) analiz kullanıldı.');
            return {
              results: [
                { label: 'Kollektör akımı IC', value: formatSI(r.ic, 'A') },
                { label: 'VCE', value: formatSI(r.vce, 'V') },
                { label: 'Çalışma bölgesi', value: REGION[r.region] },
                { label: 'Taban akımı IB', value: formatSI(r.ib, 'A') },
                { label: 'Emetör akımı IE', value: formatSI(r.ie, 'A') },
                { label: 'VB / VE / VC', value: `${formatSI(r.vb, 'V', 3)} / ${formatSI(r.ve, 'V', 3)} / ${formatSI(r.vc, 'V', 3)}` },
                { label: 'Thevenin VTH / RTH', value: `${formatSI(r.vth, 'V', 3)} / ${formatSI(r.rth, 'Ω', 3)}` },
                { label: 'IC doyma (yük doğrusu)', value: formatSI(r.icSat, 'A') },
                { label: 'Transistör gücü VCE·IC', value: r.power !== undefined ? formatSI(r.power, 'W') : '—' },
              ],
              warnings,
              raw: r,
            };
          },
          diagram: (v, out) => (out ? [schematic(v, out.raw), loadLine(v, out.raw)] : schematic(v, null)),
          diagramTitle: 'Devre ve yük doğrusu',
          formulas: [
            formula(String.raw`V_{TH} = V_{CC}\frac{R_2}{R_1+R_2},\quad R_{TH} = R_1 \parallel R_2,\quad I_B = \frac{V_{TH} - V_{BE}}{R_{TH} + (\beta+1)R_E}`,
              'VTH = VCC·R2/(R1+R2),  RTH = R1∥R2,  IB = (VTH − VBE)/(RTH + (β+1)·RE)'),
            formula(String.raw`I_C = \beta I_B,\qquad V_{CE} = V_{CC} - I_C R_C - I_E R_E`, 'IC = β·IB,  VCE = VCC − IC·RC − IE·RE'),
          ],
          notes: [
            'Boylestad, Electronic Devices and Circuit Theory, Böl. 4 (Örnek 4.7 ile test edildi). Tam analiz Thevenin eşdeğeriyle yapılır.',
            'β sıcaklık ve transistörden transistöre geniş ölçüde değişir; iyi bir polarma IC’nin β’ya duyarsız olmasını sağlar (β·RE ≫ RTH).',
            'Doyma eşiği VCE(sat) = 0,2 V alınmıştır. PNP transistör için gerilim ve akım yönleri terstir.',
          ],
        }),
      }],
    }));
  },
};
