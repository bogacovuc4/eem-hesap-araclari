import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { RESISTANCE_UNITS, CAPACITANCE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { timer555Astable, timer555Monostable } from '../../calc/circuit2.js';
import { svg, figure, s, label } from '../schematic.js';

/** Çıkış dalga şekli: iki periyot, tH ve tL oranlı. */
function waveform(r) {
  const x0 = 30;
  const width = 380;
  const hi = 40;
  const lo = 110;
  const period = width / 2;
  const th = period * r.duty;
  let d = `M${x0},${lo}`;
  for (let i = 0; i < 2; i += 1) {
    const xs = x0 + i * period;
    d += ` V${hi} H${xs + th} V${lo} H${xs + period}`;
  }
  return figure(svg([0, 0, 440, 160], '555 astable çıkış dalga şekli',
    s('path', { d, class: 'wave-line' }),
    s('line', { x1: x0, y1: lo + 14, x2: x0 + th, y2: lo + 14, class: 'dim-line' }),
    s('line', { x1: x0 + th, y1: lo + 14, x2: x0 + period, y2: lo + 14, class: 'dim-line' }),
    label(x0 + th / 2, 14, 'tH', formatSI(r.tHigh, 's', 3), { anchor: 'middle' }),
    label(x0 + th + (period - th) / 2, lo + 30, 'tL', formatSI(r.tLow, 's', 3), { anchor: 'middle' }),
    label(x0 + period * 1.5, 14, 'T', formatSI(r.period, 's', 3), { anchor: 'middle' }),
  ), `Görev oranı %${formatNumber(r.duty * 100, 3)} · f = ${formatSI(r.f, 'Hz', 3)}`);
}

export default {
  id: 'circuit/timer555',
  title: '555 zamanlayıcı',
  render(container) {
    container.append(calculatorView({
      title: '555 zamanlayıcı',
      intro: 'Astable (osilatör) modda frekans ve görev oranı, monostable modda darbe süresi.',
      modes: [
        {
          id: 'astable',
          label: 'Astable',
          build: () => calculatorPanel({
            fields: [
              { key: 'r1', label: 'R1 (VCC – deşarj)', name: 'R1', value: '1', units: RESISTANCE_UNITS, unit: 'kΩ' },
              { key: 'r2', label: 'R2 (deşarj – eşik)', name: 'R2', value: '10', units: RESISTANCE_UNITS, unit: 'kΩ' },
              { key: 'c', label: 'Zamanlama kondansatörü C', name: 'C', value: '10', units: CAPACITANCE_UNITS, unit: 'µF' },
            ],
            compute(v) {
              const r = timer555Astable(v);
              const warnings = [];
              if (v.r1 < 1e3) warnings.push('R1 < 1 kΩ: deşarj transistöründen geçen akım yükselir; veri sayfaları genellikle R1 ≥ 1 kΩ önerir.');
              return {
                results: [
                  { label: 'Frekans f', value: formatSI(r.f, 'Hz') },
                  { label: 'Periyot T', value: formatSI(r.period, 's') },
                  { label: 'Yüksek süre tH', value: formatSI(r.tHigh, 's') },
                  { label: 'Düşük süre tL', value: formatSI(r.tLow, 's') },
                  { label: 'Görev oranı', value: `%${formatNumber(r.duty * 100, 4)}` },
                ],
                warnings,
                raw: r,
              };
            },
            diagram: (v, out) => (out ? waveform(out.raw) : []),
            diagramTitle: 'Çıkış dalga şekli',
            formulas: [formula(String.raw`t_H = \ln 2\,(R_1 + R_2)\,C,\qquad t_L = \ln 2\,R_2\,C,\qquad f = \frac{1}{t_H + t_L} \approx \frac{1.44}{(R_1 + 2R_2)\,C}`,
              'tH = ln2·(R1 + R2)·C,  tL = ln2·R2·C,  f ≈ 1,44 / ((R1 + 2R2)·C)')],
            notes: [
              'Standart bağlantı: R1 VCC ile DIS (7) arasında, R2 DIS ile THR/TRIG (6, 2) arasında.',
              'Bu bağlantıda görev oranı her zaman %50’nin üzerindedir; %50’nin altı için R2’ye paralel diyot kullanılır.',
              'Hesap ideal eşik gerilimlerini (VCC/3, 2VCC/3) varsayar; kondansatör toleransı (genellikle ±%10–20) frekansı doğrudan etkiler.',
            ],
          }),
        },
        {
          id: 'mono',
          label: 'Monostable',
          build: () => calculatorPanel({
            fields: [
              { key: 'r', label: 'Direnç R', name: 'R', value: '10', units: RESISTANCE_UNITS, unit: 'kΩ' },
              { key: 'c', label: 'Kondansatör C', name: 'C', value: '100', units: CAPACITANCE_UNITS, unit: 'µF' },
            ],
            compute(v) {
              const r = timer555Monostable(v);
              return { results: [{ label: 'Darbe süresi t', value: formatSI(r.width, 's') }] };
            },
            formulas: [formula(String.raw`t = \ln 3\,RC \approx 1.1\,RC`, 't = ln3·R·C ≈ 1,1·R·C')],
            notes: ['Tetikleme darbesi (TRIG, pin 2) çıkış darbesinden kısa olmalıdır.', 'Büyük elektrolitik kondansatörlerde kaçak akım süreyi uzatabilir.'],
          }),
        },
      ],
    }));
  },
};
