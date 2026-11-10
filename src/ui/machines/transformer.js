import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { VOLTAGE_UNITS, POWER_UNITS, RESISTANCE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { transformerRatings, reflectImpedance, transformerPerformance } from '../../calc/power.js';
import { svg, figure, s, wire, terminal, label, fmt } from '../schematic.js';
import { lineChart } from '../chart.js';

/** İki sargılı transformatör sembolü */
function transformerSymbol(v, a) {
  const coil = (x, dir) => {
    let d = `M${x} 40`;
    for (let i = 0; i < 4; i += 1) d += ` a 12 12 0 0 ${dir} 0 24`;
    return s('path', { d, class: 'sch-line' });
  };
  return figure(svg([0, 0, 360, 170], 'Transformatör',
    terminal(40, 40), terminal(40, 136), wire([40, 40], [140, 40]), wire([40, 136], [140, 136]),
    coil(140, 0),
    s('line', { x1: 172, y1: 34, x2: 172, y2: 142, class: 'sch-line' }),
    s('line', { x1: 180, y1: 34, x2: 180, y2: 142, class: 'sch-line' }),
    coil(212, 1),
    wire([212, 40], [310, 40]), wire([212, 136], [310, 136]), terminal(310, 40), terminal(310, 136),
    label(60, 94, 'V1', fmt(v.v1, 'V')),
    label(290, 94, 'V2', fmt(v.v2, 'V'), { anchor: 'end' }),
    label(176, 20, `a = N1/N2`, Number.isFinite(a) ? formatNumber(a) : '', { anchor: 'middle' }),
  ));
}

export default {
  id: 'machines/transformer',
  title: 'Transformatör',
  render(container) {
    container.append(calculatorView({
      title: 'Transformatör',
      intro: 'Dönüştürme oranı, anma akımları, empedans yansıtma; verim ve gerilim regülasyonu.',
      modes: [
        {
          id: 'ratio',
          label: 'Oran ve akımlar',
          build: () => calculatorPanel({
            fields: [
              { key: 'v1', label: 'Primer gerilimi V1', name: 'V1', value: '2300', units: VOLTAGE_UNITS, unit: 'V' },
              { key: 'v2', label: 'Sekonder gerilimi V2', name: 'V2', value: '230', units: VOLTAGE_UNITS, unit: 'V' },
              { key: 's', label: 'Anma gücü S (tek faz)', name: 'S', value: '50', units: { VA: 1, kVA: 1e3, MVA: 1e6 }, unit: 'kVA' },
              { key: 'zl', label: 'Sekonderdeki yük empedansı', name: 'ZL', value: '8', units: RESISTANCE_UNITS, unit: 'Ω' },
            ],
            compute(v) {
              const r = transformerRatings(v);
              const z = reflectImpedance({ a: r.a, z: v.zl });
              return {
                results: [
                  { label: 'Dönüştürme oranı a = V1/V2', value: formatNumber(r.a) },
                  { label: 'Primer anma akımı I1', value: formatSI(r.i1, 'A') },
                  { label: 'Sekonder anma akımı I2', value: formatSI(r.i2, 'A') },
                  { label: 'Yükün primerden görünen empedansı', value: formatSI(z.primary, 'Ω') },
                  { label: 'Tür', value: r.a > 1 ? 'düşürücü' : r.a < 1 ? 'yükseltici' : 'yalıtım (1:1)' },
                ],
                raw: r,
              };
            },
            diagram: (v, out) => transformerSymbol(v, out?.raw.a),
            diagramTitle: 'Transformatör',
            formulas: [formula(String.raw`a = \frac{N_1}{N_2} = \frac{V_1}{V_2} = \frac{I_2}{I_1},\qquad Z' = a^2 Z_L`, 'a = N1/N2 = V1/V2 = I2/I1,  Z′ = a²·ZL')],
            notes: ['İdeal transformatör: kayıpsız, mıknatıslanma akımı ihmal. Üç fazlı transformatörde anma akımı I = S/(√3·V_LL) alınır.'],
          }),
        },
        {
          id: 'performance',
          label: 'Verim ve regülasyon',
          build: () => calculatorPanel({
            fields: [
              { key: 's', label: 'Anma gücü S', name: 'S', value: '100', units: { VA: 1, kVA: 1e3, MVA: 1e6 }, unit: 'kVA' },
              { key: 'load', label: 'Yük oranı (%)', name: 'Yük', value: '100', hint: 'Tam yük = %100' },
              { key: 'pf', label: 'Yük güç faktörü cos φ (geri)', name: 'cos φ', value: '0.8', max: 1 },
              { key: 'pfe', label: 'Demir (boşta) kaybı Pfe', name: 'Pfe', value: '500', units: POWER_UNITS, unit: 'W', constraint: 'nonnegative', hint: 'Boşta çalışma deneyinden' },
              { key: 'pcu', label: 'Tam yük bakır kaybı Pcu', name: 'Pcu', value: '1500', units: POWER_UNITS, unit: 'W', constraint: 'nonnegative', hint: 'Kısa devre deneyinden' },
              { key: 'uk', label: 'Kısa devre gerilimi uk (%)', name: 'uk', value: '5', max: 99 },
            ],
            compute(v) {
              const p = transformerPerformance({ s: v.s, load: v.load / 100, pf: v.pf, pfe: v.pfe, pcu: v.pcu, uk: v.uk / 100 });
              return {
                results: [
                  { label: 'Verim η', value: `%${formatNumber(p.efficiency * 100, 4)}` },
                  { label: 'Gerilim regülasyonu (yaklaşık)', value: `%${formatNumber(p.regulation * 100, 3)}` },
                  { label: 'Çıkış gücü', value: formatSI(p.pOut, 'W') },
                  { label: 'Toplam kayıp', value: formatSI(p.losses, 'W') },
                  { label: 'En yüksek verimin yük oranı', value: Number.isFinite(p.maxEffLoad) ? `%${formatNumber(p.maxEffLoad * 100, 3)}` : '—' },
                  { label: 'εr / εx', value: `%${formatNumber(p.er * 100, 3)} / %${formatNumber(p.ex * 100, 3)}` },
                ],
                raw: p,
              };
            },
            diagram: (v, out) => {
              if (!out) return [];
              const pts = [];
              for (let x = 5; x <= 130; x += 2.5) {
                pts.push({ x, y: 100 * transformerPerformance({ s: v.s, load: x / 100, pf: v.pf, pfe: v.pfe, pcu: v.pcu, uk: v.uk / 100 }).efficiency });
              }
              return lineChart({
                title: 'Verim – yük eğrisi',
                points: pts,
                xLabel: 'Yük (%)',
                yLabel: 'Verim (%)',
                xFormat: (x) => `${formatNumber(x, 3)}`,
                yFormat: (y, precise) => formatNumber(y, precise ? 4 : 3),
                marker: { x: v.load, y: out.raw.efficiency * 100 },
                refs: Number.isFinite(out.raw.maxEffLoad) ? [{ x: out.raw.maxEffLoad * 100, label: 'ηmax' }] : [],
                yMinFixed: Math.floor(Math.min(...pts.map((p) => p.y)) - 1),
              });
            },
            diagramTitle: 'Verim eğrisi',
            formulas: [
              formula(String.raw`\eta = \frac{x S\cos\varphi}{x S\cos\varphi + P_{fe} + x^2 P_{cu}},\qquad x_{\eta,\max} = \sqrt{\frac{P_{fe}}{P_{cu}}}`,
                'η = x·S·cosφ / (x·S·cosφ + Pfe + x²·Pcu),  x(ηmax) = √(Pfe/Pcu)'),
              formula(String.raw`\varepsilon_r = \frac{P_{cu}}{S},\quad \varepsilon_x = \sqrt{u_k^2 - \varepsilon_r^2},\quad \text{reg} \approx x\left(\varepsilon_r\cos\varphi + \varepsilon_x\sin\varphi\right)`,
                'εr = Pcu/S,  εx = √(uk² − εr²),  reg ≈ x·(εr·cosφ + εx·sinφ)'),
            ],
            notes: [
              'En yüksek verim, bakır kaybının demir kaybına eşit olduğu yükte oluşur.',
              'Regülasyon formülü yaklaşıktır (ikinci derece terim ihmal edilir); endüktif yük için geçerlidir, kapasitif yükte sin φ negatif alınır.',
              'Demir kaybı yükten bağımsız, bakır kaybı yük akımının karesiyle orantılı kabul edilir.',
            ],
          }),
        },
      ],
    }));
  },
};
