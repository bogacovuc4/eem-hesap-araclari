import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber, VOLTAGE_UNITS, CURRENT_UNITS } from '../../calc/units.js';
import { dcMotor } from '../../calc/power.js';

export default {
  id: 'machines/dc-motor',
  title: 'DC motor',
  render(container) {
    container.append(calculatorView({
      title: 'DC motor (serbest uyarmalı / şönt)',
      intro: 'Zıt EMK, KΦ, moment ve güçler; akı sabitken yeni yük akımındaki hız.',
      modes: [{
        id: 'dc',
        label: 'Motor',
        build: () => calculatorPanel({
          fields: [
            { key: 'v', label: 'Endüvi gerilimi V', name: 'V', value: '220', units: VOLTAGE_UNITS, unit: 'V' },
            { key: 'ra', label: 'Endüvi direnci Ra (Ω)', name: 'Ra', value: '0.5', constraint: 'nonnegative' },
            { key: 'ia', label: 'Endüvi akımı Ia', name: 'Ia', value: '20', units: CURRENT_UNITS, unit: 'A', constraint: 'nonnegative' },
            { key: 'n', label: 'Bu yükteki hız n (d/dk)', name: 'n', value: '1500' },
            { key: 'ia2', label: 'Yeni yük akımı Ia2', name: 'Ia2', value: '40', units: CURRENT_UNITS, unit: 'A', constraint: 'nonnegative' },
          ],
          compute(v) {
            const r = dcMotor(v);
            return {
              results: [
                { label: 'Zıt EMK Ea = V − IaRa', value: formatSI(r.ea, 'V') },
                { label: 'KΦ = Ea/ω', value: `${formatNumber(r.kphi, 5)} V·s/rad` },
                { label: 'Elektromanyetik moment T = KΦ·Ia', value: formatSI(r.torque, 'N·m') },
                { label: 'Geliştirilen güç Ea·Ia', value: formatSI(r.pdev, 'W') },
                { label: 'Endüvi giriş gücü V·Ia', value: formatSI(r.pin, 'W') },
                { label: 'Endüvi bakır kaybı Ia²Ra', value: formatSI(r.pcu, 'W') },
                { label: 'Boşta hız n0 ≈ V/KΦ', value: `${formatNumber(r.n0, 5)} d/dk` },
                { label: 'Hız regülasyonu (n0 − n)/n', value: `%${formatNumber(r.regulation * 100, 4)}` },
                { label: 'Yeni yükte hız n2', value: `${formatNumber(r.n2, 5)} d/dk` },
                { label: 'Yeni yükte moment', value: formatSI(r.t2, 'N·m') },
              ],
              warnings: r.n2 !== null && r.n2 <= 0 ? ['Yeni yük akımında zıt EMK sıfır ya da negatif: motor durur (kilitli rotor).'] : [],
            };
          },
          formulas: [
            formula(String.raw`E_a=V-I_aR_a=K\Phi\,\omega,\qquad T=K\Phi\,I_a,\qquad P_{\text{gel}}=E_aI_a=T\omega`, 'Ea = V − Ia·Ra = KΦ·ω,  T = KΦ·Ia,  Pgel = Ea·Ia = T·ω'),
            formula(String.raw`n=\frac{V-I_aR_a}{K\Phi}\cdot\frac{60}{2\pi}`, 'n = (V − Ia·Ra)/KΦ · 60/(2π)'),
          ],
          notes: [
            'Akı (uyarma akımı) sabit, endüvi reaksiyonu ve fırça düşümü ihmal edilir. Seri motorda akı yükle değiştiği için bu formüller geçerli değildir.',
            'Mil gücü, geliştirilen güçten sürtünme, vantilasyon ve demir kayıpları çıkarılarak bulunur.',
          ],
        }),
      }],
    }));
  },
};
