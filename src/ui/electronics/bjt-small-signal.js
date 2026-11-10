import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber, CURRENT_UNITS, RESISTANCE_UNITS, VOLTAGE_UNITS } from '../../calc/units.js';
import { bjtSmallSignal } from '../../calc/electronics.js';

const R = (key, label, value, unit, hint, constraint = 'nonnegative') => ({ key, label, name: label.split(' ').pop(), value, units: RESISTANCE_UNITS, unit, hint, constraint });
const inf = (x) => (x === 0 ? Infinity : x);

export default {
  id: 'electronics/bjt-small-signal',
  title: 'BJT küçük sinyal (ortak emetör)',
  render(container) {
    container.append(calculatorView({
      title: 'BJT küçük sinyal modeli ve ortak emetörlü kuvvetlendirici',
      intro: 'Q noktasındaki IC’den gm, rπ, re, ro; ortak emetör katının gerilim kazancı, giriş ve çıkış direnci (hibrit-π).',
      modes: [{
        id: 'ce',
        label: 'Ortak emetör',
        build: () => calculatorPanel({
          fields: [
            { key: 'ic', label: 'Kolektör akımı IC (Q noktası)', name: 'IC', value: '1', units: CURRENT_UNITS, unit: 'mA' },
            { key: 'beta', label: 'Akım kazancı β', name: 'β', value: '100' },
            { key: 'va', label: 'Early gerilimi VA', name: 'VA', value: '100', units: VOLTAGE_UNITS, unit: 'V', constraint: 'nonnegative', hint: '0 = ro sonsuz (ihmal)' },
            R('rc', 'Kolektör direnci RC', '4.7', 'kΩ', '', 'positive'),
            R('rl', 'Yük direnci RL', '10', 'kΩ', '0 = yük yok (açık devre)'),
            R('re', 'Köprülenmemiş emetör direnci RE', '0', 'Ω', 'Kondansatörle köprülenen kısmı yazmayın; tamamen köprülüyse 0'),
            R('rb', 'Baz polarma direnci RB = R1∥R2', '8', 'kΩ', '0 = yok'),
          ],
          compute(v) {
            const r = bjtSmallSignal({ ic: v.ic, beta: v.beta, va: v.va, rc: v.rc, rl: inf(v.rl), re: v.re, rb: inf(v.rb) });
            return {
              results: [
                { label: 'Geçiş iletkenliği gm', value: formatSI(r.gm, 'S') },
                { label: 'rπ = β/gm', value: formatSI(r.rpi, 'Ω') },
                { label: 're = VT/IE', value: formatSI(r.reIntr, 'Ω') },
                { label: 'ro = VA/IC', value: Number.isFinite(r.ro) ? formatSI(r.ro, 'Ω') : '∞' },
                { label: 'Gerilim kazancı Av = vo/vb', value: formatNumber(r.av, 4) },
                { label: 'Kazanç (dB)', value: `${formatNumber(r.avDb, 4)} dB` },
                { label: 'Bazdan görülen direnç', value: formatSI(r.rinBase, 'Ω') },
                { label: 'Giriş direnci Rin = RB ∥ Rin,baz', value: formatSI(r.rin, 'Ω') },
                { label: 'Çıkış direnci Rout = RC ∥ ro', value: formatSI(r.rout, 'Ω') },
              ],
              warnings: v.re > 0 ? [] : ['RE tamamen köprülü: kazanç büyük ama β ve sıcaklığa çok bağımlı. Kararlılık için RE’nin bir kısmını köprülemeyin.'],
            };
          },
          formulas: [
            formula(String.raw`g_m=\frac{I_C}{V_T},\qquad r_\pi=\frac{\beta}{g_m},\qquad r_e=\frac{V_T}{I_E},\qquad r_o=\frac{V_A}{I_C}`, 'gm = IC/VT,  rπ = β/gm,  re = VT/IE,  ro = VA/IC'),
            formula(String.raw`A_v=-\frac{\beta\,(R_C\parallel R_L\parallel r_o)}{r_\pi+(\beta+1)R_E}\ \xrightarrow{R_E=0}\ -g_m(R_C\parallel R_L\parallel r_o)`, 'Av = −β(RC∥RL∥ro)/(rπ + (β+1)RE);  RE = 0 → −gm(RC∥RL∥ro)'),
          ],
          notes: [
            'Orta frekans bandı: kuplaj ve köprüleme kondansatörleri kısa devre, iç kapasiteler açık devre.',
            'RE varken ro’nun etkisi ihmal edilmiştir (ro ≫ RC kabulü). Av, bazdaki gerilime göredir; kaynak direnci Rs varsa toplam kazanç Av·Rin/(Rin+Rs) olur.',
            'VT 300 K için 25,85 mV alınır.',
          ],
        }),
      }],
    }));
  },
};
