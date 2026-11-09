import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { RESISTANCE_UNITS, VOLTAGE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { voltageDivider, dividerR2, standardValueAtLeast } from '../../calc/circuit.js';
import { dividerSchematic } from './schematics.js';

const notes = [
  'Yüksüz bölücü: çıkışa bağlanan yükün direnci R2’den çok büyük (≈ 10 kat ve üstü) olmalıdır; aksi hâlde Vout düşer.',
  'Bölücü bir güç kaynağı değildir; yük akımı gereken yerlerde regülatör kullanın.',
];

export default {
  id: 'circuit/divider',
  title: 'Gerilim bölücü',
  render(container) {
    container.append(calculatorView({
      title: 'Gerilim bölücü',
      intro: 'İki dirençli bölücünün çıkış gerilimi ya da istenen çıkış için R2.',
      modes: [
        {
          id: 'vout',
          label: 'Vout hesapla',
          build: () => calculatorPanel({
            fields: [
              { key: 'vin', label: 'Giriş gerilimi Vin', name: 'Vin', value: '12', units: VOLTAGE_UNITS, unit: 'V', constraint: 'any' },
              { key: 'r1', label: 'Üst direnç R1', name: 'R1', value: '10', units: RESISTANCE_UNITS, unit: 'kΩ' },
              { key: 'r2', label: 'Alt direnç R2', name: 'R2', value: '10', units: RESISTANCE_UNITS, unit: 'kΩ' },
            ],
            compute(v) {
              const d = voltageDivider(v);
              return {
                results: [
                  { label: 'Çıkış gerilimi Vout', value: formatSI(d.vout, 'V') },
                  { label: 'Oran Vout/Vin', value: formatNumber(d.ratio) },
                  { label: 'Akım I', value: formatSI(d.current, 'A') },
                  { label: 'R1 gücü', value: formatSI(d.p1, 'W') },
                  { label: 'R2 gücü', value: formatSI(d.p2, 'W') },
                ],
                raw: { vout: d.vout },
              };
            },
            diagram: (v, out) => dividerSchematic({ ...v, vout: out?.raw.vout }),
            formulas: [formula(String.raw`V_{\text{out}}=V_{\text{in}}\,\frac{R_2}{R_1+R_2},\qquad I=\frac{V_{\text{in}}}{R_1+R_2}`, 'Vout = Vin · R2/(R1 + R2),  I = Vin/(R1 + R2)')],
            notes,
          }),
        },
        {
          id: 'r2',
          label: 'R2 bul',
          build: () => calculatorPanel({
            fields: [
              { key: 'vin', label: 'Giriş gerilimi Vin', name: 'Vin', value: '5', units: VOLTAGE_UNITS, unit: 'V' },
              { key: 'vout', label: 'İstenen çıkış Vout', name: 'Vout', value: '3.3', units: VOLTAGE_UNITS, unit: 'V' },
              { key: 'r1', label: 'Üst direnç R1', name: 'R1', value: '10', units: RESISTANCE_UNITS, unit: 'kΩ' },
            ],
            compute(v) {
              const r2 = dividerR2(v);
              const e24 = standardValueAtLeast(r2, 'E24');
              return {
                results: [
                  { label: 'Gereken R2', value: formatSI(r2, 'Ω') },
                  { label: 'E24 (bir üst) değer', value: formatSI(e24, 'Ω', 3) },
                  { label: 'E24 ile Vout', value: formatSI(voltageDivider({ vin: v.vin, r1: v.r1, r2: e24 }).vout, 'V') },
                ],
                raw: { r2 },
              };
            },
            diagram: (v, out) => dividerSchematic({ ...v, r2: out?.raw.r2 }),
            formulas: [formula(String.raw`R_2=R_1\,\frac{V_{\text{out}}}{V_{\text{in}}-V_{\text{out}}}`, 'R2 = R1 · Vout/(Vin − Vout)')],
            notes,
          }),
        },
      ],
    }));
  },
};
