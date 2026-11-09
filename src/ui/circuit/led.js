import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { VOLTAGE_UNITS, CURRENT_UNITS, formatSI } from '../../calc/units.js';
import { ledResistor } from '../../calc/circuit.js';

export default {
  id: 'circuit/led',
  title: 'LED seri direnci',
  render(container) {
    container.append(calculatorView({
      title: 'LED seri direnci',
      intro: 'Besleme, LED ileri gerilimi ve istenen akımdan seri direnç.',
      modes: [{
        id: 'led',
        label: 'LED',
        build: () => calculatorPanel({
          fields: [
            { key: 'vs', label: 'Besleme gerilimi Vs', name: 'Vs', value: '5', units: VOLTAGE_UNITS, unit: 'V' },
            { key: 'vf', label: 'LED ileri gerilimi Vf', name: 'Vf', value: '2', units: VOLTAGE_UNITS, unit: 'V', hint: 'Kırmızı ≈ 1,8–2,2 V · yeşil/mavi/beyaz ≈ 2,8–3,4 V (veri sayfasına bakın)' },
            { key: 'current', label: 'LED akımı I', name: 'I', value: '20', units: CURRENT_UNITS, unit: 'mA' },
          ],
          compute(v) {
            const led = ledResistor({ ...v, series: 'E12' });
            const e24 = ledResistor({ ...v, series: 'E24' });
            const warnings = [];
            if (led.standardPower > 0.25 * 0.5) {
              warnings.push(`Direnç gücü ${formatSI(led.standardPower, 'W')}: 1/4 W direnç için %50 güvenlik payı aşılıyor, daha yüksek güçlü direnç seçin.`);
            }
            return {
              results: [
                { label: 'Hesaplanan R', value: formatSI(led.r, 'Ω') },
                { label: 'E12 (bir üst) değer', value: formatSI(led.rStandard, 'Ω', 3) },
                { label: 'E12 ile akım', value: formatSI(led.actualCurrent, 'A') },
                { label: 'E12 direnç gücü', value: formatSI(led.standardPower, 'W') },
                { label: 'E24 (bir üst) değer', value: formatSI(e24.rStandard, 'Ω', 3) },
                { label: 'E24 ile akım', value: formatSI(e24.actualCurrent, 'A') },
                { label: 'LED gücü (E12)', value: formatSI(led.ledPower, 'W') },
              ],
              warnings,
            };
          },
          formulas: [formula(String.raw`R=\frac{V_s-V_f}{I},\qquad P_R=I^2R`, 'R = (Vs − Vf)/I,  P_R = I²·R')],
          notes: [
            'Vf sabit kabul edilir; gerçekte akım ve sıcaklıkla biraz değişir.',
            'Standart değer, akımın hedefi aşmaması için bir üst E serisi değerinden seçilir.',
            'Güç uyarısı 1/4 W direnç ve %50 güvenlik payı varsayar.',
          ],
        }),
      }],
    }));
  },
};
