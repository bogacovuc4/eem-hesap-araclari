import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI } from '../../calc/units.js';
import { pointCharge } from '../../calc/em.js';
import { CHARGE_UNITS, SMALL_LENGTH, EPS_FIELD } from './units.js';

const LEN = { ...SMALL_LENGTH, km: 1e3 };

export default {
  id: 'em/point-charge',
  title: 'Noktasal yük ve Coulomb',
  render(container) {
    container.append(calculatorView({
      title: 'Noktasal yük: alan, potansiyel ve Coulomb kuvveti',
      intro: 'Bir noktasal yükün r uzaklıktaki elektrik alanı ve potansiyeli; ikinci yükle aradaki kuvvet.',
      modes: [{
        id: 'field',
        label: 'Alan',
        build: () => calculatorPanel({
          fields: [
            { key: 'q', label: 'Yük q₁', name: 'q₁', value: '1', units: CHARGE_UNITS, unit: 'nC', constraint: 'any' },
            { key: 'q2', label: 'İkinci yük q₂', name: 'q₂', value: '1', units: CHARGE_UNITS, unit: 'nC', constraint: 'any', hint: 'Kuvvet için; işaret itme/çekmeyi belirler' },
            { key: 'r', label: 'Uzaklık r', name: 'r', value: '10', units: LEN, unit: 'cm' },
            EPS_FIELD,
          ],
          compute(v) {
            const r = pointCharge({ q: v.q, q2: v.q2, r: v.r, epsR: v.er });
            return {
              results: [
                { label: 'Elektrik alan |E|', value: formatSI(Math.abs(r.e), 'V/m') },
                { label: 'Alan yönü', value: r.e >= 0 ? 'yükten dışarı (radyal)' : 'yüke doğru (radyal)' },
                { label: 'Potansiyel V (sonsuza göre)', value: formatSI(r.v, 'V') },
                { label: 'Kuvvet |F|', value: formatSI(Math.abs(r.force), 'N') },
                { label: 'Kuvvetin türü', value: r.force > 0 ? 'itme (aynı işaretli)' : r.force < 0 ? 'çekme (zıt işaretli)' : '—' },
                { label: 'Elektrik akı yoğunluğu D', value: formatSI(Math.abs(v.q) / (4 * Math.PI * v.r ** 2), 'C/m²') },
              ],
            };
          },
          formulas: [
            formula(String.raw`E=\frac{q}{4\pi\varepsilon r^2},\qquad V=\frac{q}{4\pi\varepsilon r},\qquad F=\frac{q_1q_2}{4\pi\varepsilon r^2}`, 'E = q/(4πεr²),  V = q/(4πεr),  F = q1·q2/(4πεr²)'),
            formula(String.raw`\varepsilon=\varepsilon_0\varepsilon_r,\qquad \frac{1}{4\pi\varepsilon_0}\approx 8{,}988\times10^{9}\ \mathrm{N\,m^2/C^2},\qquad D=\varepsilon E`, 'ε = ε0·εr,  1/(4πε0) ≈ 8,988×10⁹ N·m²/C²,  D = εE'),
          ],
          notes: [
            'Yükler noktasal ve durgun kabul edilir; ortam doğrusal, homojen ve sonsuzdur.',
            'Potansiyelin referansı sonsuzdaki noktadır (V(∞) = 0).',
            'Birden çok yük için süperpozisyon uygulanır: alanlar vektörel, potansiyeller cebirsel toplanır.',
          ],
        }),
      }],
    }));
  },
};
