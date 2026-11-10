import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { VOLTAGE_UNITS, CURRENT_UNITS, POWER_UNITS, FREQUENCY_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { powerTriangle, pfCorrection } from '../../calc/circuit2.js';
import { svg, figure, s, label } from '../schematic.js';

/**
 * Güç üçgeni(leri): P yatay, Q dikey (yukarı endüktif), S hipotenüs.
 * after verilirse düzeltilmiş üçgen de kesikli çizilir.
 */
function triangle({ p, q, after = null }) {
  const W = 300;
  const H = 170;
  const maxQ = Math.max(Math.abs(q), after ? Math.abs(after) : 0, p * 0.15);
  const k = Math.min(250 / p, 130 / maxQ);
  const x0 = 40;
  const y0 = 160;
  const px = x0 + p * k;
  const qy = y0 - q * k;
  const parts = [
    s('line', { x1: x0, y1: y0, x2: px, y2: y0, class: 'tri-p' }),
    s('line', { x1: px, y1: y0, x2: px, y2: qy, class: 'tri-q' }),
    s('line', { x1: x0, y1: y0, x2: px, y2: qy, class: 'tri-s' }),
    label((x0 + px) / 2, y0 + 18, 'P', '', { anchor: 'middle' }),
    label(px + 12, after !== null ? qy + 4 : (y0 + qy) / 2, after !== null ? 'Q₁' : 'Q', ''),
    label((x0 + px) / 2 - 14, (y0 + qy) / 2 - 6, after !== null ? 'S₁' : 'S', '', { anchor: 'end' }),
  ];
  if (after !== null) {
    const qy2 = y0 - after * k;
    parts.push(
      s('line', { x1: x0, y1: y0, x2: px, y2: qy2, class: 'tri-s tri-after' }),
      s('line', { x1: px + 4, y1: qy, x2: px + 4, y2: qy2, class: 'tri-qc' }),
      label(px + 12, qy2 + 4, 'Q₂', ''),
      label(px + 12, (qy + qy2) / 2 + 4, 'Qc', ''),
    );
  }
  return figure(svg([0, Math.min(0, qy - 20), W + 40, H + 30 - Math.min(0, qy - 20)], 'Güç üçgeni', ...parts),
    after !== null ? 'Düz çizgi: düzeltme öncesi, kesikli: sonrası. Qc kondansatörün sağladığı reaktif güç.' : 'P aktif, Q reaktif, S görünür güç');
}

function correctionPanel(phases) {
  const vLabel = phases === 1 ? 'Şebeke gerilimi (faz–nötr, etkin)' : 'Şebeke gerilimi (faz–faz, etkin)';
  return calculatorPanel({
    fields: [
      { key: 'p', label: 'Yükün aktif gücü P', name: 'P', value: '10', units: POWER_UNITS, unit: 'kW' },
      { key: 'pf1', label: 'Mevcut güç faktörü cos φ₁', name: 'cos φ₁', value: '0.7', max: 1 },
      { key: 'pf2', label: 'Hedef güç faktörü cos φ₂', name: 'cos φ₂', value: '0.95', max: 1 },
      { key: 'v', label: vLabel, name: 'V', value: phases === 1 ? '230' : '400', units: VOLTAGE_UNITS, unit: 'V' },
      { key: 'f', label: 'Şebeke frekansı', name: 'f', value: '50', units: FREQUENCY_UNITS, unit: 'Hz' },
    ],
    compute(v) {
      const r = pfCorrection({ p: v.p, pf1: v.pf1, pf2: v.pf2, vrms: v.v, f: v.f, phases });
      return {
        results: [
          { label: 'Gereken kompanzasyon Qc', value: formatSI(r.qc, 'VAr') },
          { label: phases === 1 ? 'Kondansatör C' : 'Faz başına C (üçgen bağlı)', value: formatSI(r.capacitance, 'F') },
          { label: 'Reaktif güç Q₁ → Q₂', value: `${formatSI(r.q1, 'VAr', 3)} → ${formatSI(r.q2, 'VAr', 3)}` },
          { label: 'Görünür güç S₁ → S₂', value: `${formatSI(r.s1, 'VA', 3)} → ${formatSI(r.s2, 'VA', 3)}` },
          { label: 'Hat akımı I₁ → I₂', value: `${formatSI(r.i1, 'A', 3)} → ${formatSI(r.i2, 'A', 3)}` },
          { label: 'Akımdaki azalma', value: `%${formatNumber((1 - r.i2 / r.i1) * 100, 3)}` },
        ],
        warnings: v.pf2 > 0.99 ? ['Hedef PF 1’e çok yakın: yük azaldığında aşırı kompanzasyon (kapasitif PF) oluşabilir.'] : [],
        raw: r,
      };
    },
    diagram: (v, out) => (out ? triangle({ p: v.p, q: out.raw.q1, after: out.raw.q2 }) : []),
    diagramTitle: 'Güç üçgeni',
    formulas: [
      formula(String.raw`Q_c = P\left(\tan\varphi_1 - \tan\varphi_2\right),\qquad ${phases === 1 ? String.raw`C = \frac{Q_c}{\omega V^2}` : String.raw`C_{\text{faz}} = \frac{Q_c}{3\,\omega\,V_{LL}^2}`}`,
        phases === 1 ? 'Qc = P·(tan φ1 − tan φ2),  C = Qc/(ω·V²)' : 'Qc = P·(tan φ1 − tan φ2),  C_faz = Qc/(3·ω·V_LL²)'),
    ],
    notes: [
      'Endüktif (geri güç faktörlü) yük ve sinüzoidal şebeke varsayılır; harmonikler dikkate alınmaz.',
      phases === 3 ? 'Kondansatörler üçgen (Δ) bağlı kabul edilir: her kondansatör faz–faz gerilimini görür. Yıldız bağlantıda faz başına C üç katıdır.' : 'Kondansatör yüke paralel bağlanır.',
      'Kondansatörlerin gerilim değeri şebekenin tepe değerinden ve olası aşırı gerilimlerden yüksek seçilmelidir.',
    ],
  });
}

export default {
  id: 'circuit/ac-power',
  title: 'AC güç ve PF düzeltme',
  render(container) {
    container.append(calculatorView({
      title: 'AC güç ve güç faktörü düzeltmesi',
      intro: 'Güç üçgeni ve endüktif yükün güç faktörünü yükseltmek için gereken kondansatör.',
      modes: [
        {
          id: 'triangle',
          label: 'Güç üçgeni',
          build: () => calculatorPanel({
            fields: [
              { key: 'v', label: 'Gerilim (etkin)', name: 'V', value: '230', units: VOLTAGE_UNITS, unit: 'V' },
              { key: 'i', label: 'Akım (etkin)', name: 'I', value: '10', units: CURRENT_UNITS, unit: 'A' },
              { key: 'pf', label: 'Güç faktörü cos φ (geri)', name: 'cos φ', value: '0.8', max: 1 },
            ],
            compute(v) {
              const r = powerTriangle({ vrms: v.v, irms: v.i, pf: v.pf });
              return {
                results: [
                  { label: 'Görünür güç S', value: formatSI(r.s, 'VA') },
                  { label: 'Aktif güç P', value: formatSI(r.p, 'W') },
                  { label: 'Reaktif güç Q', value: formatSI(r.q, 'VAr') },
                  { label: 'Faz açısı φ', value: `${formatNumber(r.phi, 4)}°` },
                ],
                raw: r,
              };
            },
            diagram: (v, out) => (out ? triangle({ p: out.raw.p, q: out.raw.q }) : []),
            diagramTitle: 'Güç üçgeni',
            formulas: [formula(String.raw`S = VI,\qquad P = S\cos\varphi,\qquad Q = S\sin\varphi,\qquad S^2 = P^2 + Q^2`, 'S = V·I,  P = S·cos φ,  Q = S·sin φ,  S² = P² + Q²')],
            notes: ['Geri (endüktif) güç faktörü varsayılır; kapasitif yükte Q negatiftir.', 'Üç fazlı dengeli sistemde S = √3·V_LL·I alınır.'],
          }),
        },
        { id: 'pf1', label: 'PF düzeltme (tek faz)', build: () => correctionPanel(1) },
        { id: 'pf3', label: 'PF düzeltme (üç faz)', build: () => correctionPanel(3) },
      ],
    }));
  },
};
