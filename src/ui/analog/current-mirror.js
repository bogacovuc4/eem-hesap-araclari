import { calculatorView, calculatorPanel, verifyNote } from '../form.js';
import { formula } from '../formula.js';
import { VOLTAGE_UNITS, CURRENT_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { currentMirror, mosfet } from '../../calc/analog.js';
import { svg, figure, wire, ground, dot, label, s, fmt } from '../schematic.js';
import { lineChart } from '../chart.js';
import { nmos } from './symbols.js';

function schematic(v, r) {
  const y = 150;
  const m1g = 150; // M1 kapısı (aynalanmış, savak/kaynak solda: 120)
  const m2g = 190; // M2 kapısı (savak/kaynak sağda: 220)
  const d1 = m1g - 30;
  const d2 = m2g + 30;
  return figure(svg([0, -6, 330, 250], 'Basit NMOS akım aynası',
    nmos(m1g, y, { mirror: true }),
    nmos(m2g, y),
    wire([m1g, y], [m2g, y]),
    wire([d1, y - 30], [d1, y - 50], [m1g, y - 50], [m1g, y]),
    dot(d1, y - 50), dot(m1g, y),
    wire([d1, y - 50], [d1, 40]),
    // Referans akım kaynağı
    s('circle', { cx: d1, cy: 24, r: 14, class: 'sch-line', fill: 'none' }),
    wire([d1, 31], [d1, 17]),
    s('polygon', { points: `${d1},${15} ${d1 - 4},${23} ${d1 + 4},${23}`, class: 'sch-fill' }),
    wire([d1, 10], [d1, 0]),
    wire([d2, y - 30], [d2, 40]),
    s('polygon', { points: `${d2},${70} ${d2 - 5},${60} ${d2 + 5},${60}`, class: 'sch-fill' }),
    wire([d1, y + 30], [d1, y + 50], [d2, y + 50], [d2, y + 30]),
    ground((d1 + d2) / 2, y + 50),
    label(d1 - 22, 28, 'Iref', fmt(v.iref, 'A'), { anchor: 'end' }),
    label(d2 + 12, 60, 'Iout', r ? fmt(r.iout, 'A') : '', { unknown: true }),
    label(d2 + 12, 30, 'Vout', fmt(v.vout, 'V')),
    label(d1 - 14, y + 4, 'M1', Number.isFinite(v.wl1) ? `W/L ${formatNumber(v.wl1, 3)}` : '', { anchor: 'end' }),
    label(d2 + 12, y + 4, 'M2', Number.isFinite(v.wl2) ? `W/L ${formatNumber(v.wl2, 3)}` : ''),
    label(m1g + 10, y - 34, 'VGS', r ? fmt(r.vgs, 'V') : ''),
  ), 'M1 diyot bağlı: Iref kapı gerilimini belirler, M2 aynı VGS ile akımı kopyalar.');
}

function curve(v, r) {
  const vmax = Math.max(2 * v.vout, 4 * r.vov, 1);
  const pts = [];
  for (let i = 0; i <= 200; i += 1) {
    const vd = (vmax * i) / 200;
    pts.push({ x: vd, y: mosfet({ k: v.k * 1e-6, wl: v.wl2, vgs: r.vgs, vth: v.vth, vds: vd, lambda: v.lambda }).id });
  }
  return lineChart({
    title: 'Çıkış akımı – çıkış gerilimi',
    points: pts,
    reference: pts.map((p) => ({ x: p.x, y: r.idealIout })),
    labels: ['Iout', 'ideal Iref·(W/L)₂/(W/L)₁'],
    xLabel: 'Vout (V)',
    yLabel: 'Iout (A)',
    xFormat: (x) => formatSI(x, 'V', 2),
    yFormat: (y, precise) => formatSI(y, 'A', precise ? 4 : 2),
    marker: { x: v.vout, y: r.iout },
    refs: [{ x: r.vov, label: 'VOV (en küçük Vout)' }],
  });
}

export default {
  id: 'analog/current-mirror',
  title: 'Akım aynası',
  render(container) {
    container.append(calculatorView({
      title: 'Akım aynası (basit NMOS)',
      intro: 'Referans akımın kopyalanması: çıkış akımı, kanal boyu modülasyonundan gelen hata, çıkış direnci ve en küçük çıkış gerilimi.',
      modes: [{
        id: 'simple',
        label: 'İki transistörlü',
        build: () => calculatorPanel({
          fields: [
            { key: 'iref', label: 'Referans akımı Iref', name: 'Iref', value: '100', units: CURRENT_UNITS, unit: 'µA' },
            { key: 'wl1', label: '(W/L)₁ — referans', name: '(W/L)₁', value: '10' },
            { key: 'wl2', label: '(W/L)₂ — çıkış', name: '(W/L)₂', value: '20', hint: 'Oran akım kazancını belirler (ör. 2 → 2·Iref)' },
            { key: 'vout', label: 'Çıkış gerilimi Vout (M2 VDS)', name: 'Vout', value: '1.2', units: VOLTAGE_UNITS, unit: 'V', constraint: 'nonnegative' },
            { key: 'k', label: 'μnCox (µA/V²)', name: 'μCox', value: '200' },
            { key: 'vth', label: 'VTH', name: 'VTH', value: '0.45', units: VOLTAGE_UNITS, unit: 'V', constraint: 'nonnegative' },
            { key: 'lambda', label: 'λ (1/V)', name: 'λ', value: '0.1', constraint: 'nonnegative' },
          ],
          compute(v) {
            const r = currentMirror({ ...v, k: v.k * 1e-6 });
            const warnings = [];
            if (r.region !== 'saturation') warnings.push(`Vout < VOV (${formatSI(r.vov, 'V', 3)}): M2 doymadan çıktı, ayna akımı kopyalayamıyor.`);
            if (Math.abs(r.error) > 0.05 && r.region === 'saturation') warnings.push('λ kaynaklı hata %5’ten büyük: Vout’u M1’in VGS’ine yaklaştırın ya da kaskod ayna kullanın.');
            return {
              results: [
                { label: 'Çıkış akımı Iout', value: formatSI(r.iout, 'A') },
                { label: 'İdeal Iout (oran × Iref)', value: formatSI(r.idealIout, 'A') },
                { label: 'Kopyalama hatası', value: `%${formatNumber(r.error * 100, 3)}` },
                { label: 'VGS / VOV', value: `${formatSI(r.vgs, 'V', 4)} / ${formatSI(r.vov, 'V', 4)}` },
                { label: 'Çıkış direnci Rout = ro₂', value: Number.isFinite(r.rout) ? formatSI(r.rout, 'Ω') : '∞ (λ = 0)' },
                { label: 'En küçük çıkış gerilimi', value: formatSI(r.compliance, 'V') },
                { label: 'M2 bölgesi', value: r.region === 'saturation' ? 'doyma' : r.region === 'triode' ? 'doğrusal' : 'kesim' },
              ],
              warnings,
              raw: r,
            };
          },
          diagram: (v, out) => (out ? [schematic(v, out.raw), curve(v, out.raw)] : schematic(v, null)),
          diagramTitle: 'Devre ve çıkış eğrisi',
          formulas: [
            formula(String.raw`I_{out} = I_{ref}\,\frac{(W/L)_2}{(W/L)_1}\cdot\frac{1+\lambda V_{out}}{1+\lambda V_{GS}},\qquad R_{out} = r_{o2} \approx \frac{1}{\lambda I_{out}}`,
              'Iout = Iref·[(W/L)₂/(W/L)₁]·(1 + λVout)/(1 + λVGS),  Rout ≈ 1/(λ·Iout)'),
          ],
          notes: [
            'Vout = VGS olduğunda iki transistörün VDS’i eşittir ve kopyalama tam olur (eşleşme hataları hariç).',
            'Çıkış direncini artırmak için kaskod akım aynası kullanılır: Rout ≈ gm·ro², ama en küçük çıkış gerilimi VGS + VOV’a çıkar.',
            'Gerçek devrede VTH ve μCox eşleşmezliği (mismatch) ek hata getirir; büyük alanlı ve ortak merkezli yerleşim bunu azaltır.',
            verifyNote('Kare yasası modeli ve örnek süreç değerleri kullanılmıştır; benzetimle doğrulayın.'),
          ],
        }),
      }],
    }));
  },
};
