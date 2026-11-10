import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber, VOLTAGE_UNITS, FREQUENCY_UNITS, RESISTANCE_UNITS, CAPACITANCE_UNITS } from '../../calc/units.js';
import { rectifier } from '../../calc/electronics.js';

const TYPES = [
  ['half', 'Yarım dalga', 'Sekonder RMS gerilimi'],
  ['center', 'Orta uçlu tam dalga', 'Yarım sargının RMS gerilimi'],
  ['bridge', 'Köprü', 'Sekonder RMS gerilimi'],
];

export default {
  id: 'electronics/rectifier',
  title: 'Doğrultucu ve filtre',
  render(container) {
    container.append(calculatorView({
      title: 'Doğrultucu ve kondansatör filtre',
      intro: 'Yarım dalga, orta uçlu ve köprü doğrultucuda DC çıkış, dalgalanma (ripple) ve diyot ters gerilimi.',
      modes: TYPES.map(([type, label, vLabel]) => ({
        id: type,
        label,
        build: () => calculatorPanel({
          fields: [
            { key: 'vrms', label: vLabel, name: 'Vrms', value: '12', units: VOLTAGE_UNITS, unit: 'V' },
            { key: 'f', label: 'Şebeke frekansı f', name: 'f', value: '50', units: FREQUENCY_UNITS, unit: 'Hz' },
            { key: 'rl', label: 'Yük direnci RL', name: 'RL', value: '100', units: RESISTANCE_UNITS, unit: 'Ω' },
            { key: 'c', label: 'Filtre kondansatörü C', name: 'C', value: '2200', units: CAPACITANCE_UNITS, unit: 'µF', constraint: 'nonnegative', hint: '0 = filtresiz' },
            { key: 'vd', label: 'Diyot iletim gerilimi VD', name: 'VD', value: '0.7', units: VOLTAGE_UNITS, unit: 'V', constraint: 'nonnegative', hint: 'Silisyum 0,7 V; Schottky ≈ 0,3 V; ideal 0' },
          ],
          compute(v) {
            const r = rectifier({ type, vrms: v.vrms, f: v.f, rl: v.rl, c: v.c, vd: v.vd });
            const warnings = [];
            if (r.filtered && r.vrpp > 0.2 * r.vm) warnings.push('Dalgalanma tepe değerin %20’sinden büyük: yaklaşık formül bozulur, C’yi büyütün.');
            return {
              results: [
                { label: 'Çıkış tepe gerilimi Vm', value: formatSI(r.vm, 'V') },
                { label: 'DC çıkış gerilimi Vdc', value: formatSI(r.vdc, 'V') },
                { label: 'DC yük akımı Idc', value: formatSI(r.idc, 'A') },
                { label: 'Dalgalanma Vr(tepe-tepe)', value: r.filtered ? formatSI(r.vrpp, 'V') : '— (filtresiz)' },
                { label: 'Dalgalanma faktörü r', value: `%${formatNumber(r.rippleFactor * 100, 3)}` },
                { label: 'Dalgalanma frekansı', value: formatSI(r.fr, 'Hz') },
                { label: 'Diyot ters tepe gerilimi (PIV)', value: formatSI(r.piv, 'V') },
              ],
              warnings,
            };
          },
          formulas: [
            formula(String.raw`V_m=\sqrt2\,V_{\text{rms}}-n\,V_D,\qquad V_{dc}^{\,\text{filtresiz}}=\frac{V_m}{\pi}\ \text{(yarım)},\ \frac{2V_m}{\pi}\ \text{(tam)}`, 'Vm = √2·Vrms − n·VD;  filtresiz Vdc = Vm/π (yarım), 2Vm/π (tam)'),
            formula(String.raw`V_{r(pp)}\approx\frac{V_{dc}}{f_r R_L C},\qquad V_{dc}=V_m-\frac{V_{r(pp)}}{2},\qquad r=\frac{V_{r(pp)}}{2\sqrt3\,V_{dc}}`, 'Vr(pp) ≈ Vdc/(fr·RL·C),  Vdc = Vm − Vr/2,  r = Vr(pp)/(2√3·Vdc)'),
          ],
          notes: [
            'n: iletimdeki seri diyot sayısı (köprüde 2, diğerlerinde 1). fr: yarım dalgada f, tam dalgada 2f.',
            'Kondansatörlü formül, dalgalanmanın küçük olduğu (RC ≫ 1/fr) testere dişi yaklaşımıdır; trafo direnci ihmal edilir.',
            'PIV: köprüde ≈ Vsm − VD, orta uçluda ≈ 2Vsm − VD, kondansatörlü yarım dalgada ≈ 2Vsm (Vsm = √2·Vrms). Diyotu en az %20 pay bırakarak seçin.',
          ],
        }),
      })),
    }));
  },
};
