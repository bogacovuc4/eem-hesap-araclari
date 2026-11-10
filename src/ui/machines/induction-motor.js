import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber, FREQUENCY_UNITS, POWER_UNITS } from '../../calc/units.js';
import { inductionMotor } from '../../calc/power.js';

export default {
  id: 'machines/induction-motor',
  title: 'Asenkron motor',
  render(container) {
    container.append(calculatorView({
      title: 'Asenkron (indüksiyon) motor',
      intro: 'Senkron hız, kayma, rotor frekansı, mil momenti ve verim.',
      modes: [{
        id: 'motor',
        label: 'Motor',
        build: () => calculatorPanel({
          fields: [
            { key: 'f', label: 'Şebeke frekansı f', name: 'f', value: '50', units: FREQUENCY_UNITS, unit: 'Hz' },
            { key: 'poles', label: 'Kutup sayısı p', name: 'p', value: '4', hint: '2, 4, 6, 8… (kutup çifti değil, toplam kutup)' },
            { key: 'nr', label: 'Rotor hızı nr (d/dk)', name: 'nr', value: '1440', constraint: 'nonnegative' },
            { key: 'pout', label: 'Mil (çıkış) gücü Pout', name: 'Pout', value: '7.5', units: POWER_UNITS, unit: 'kW' },
            { key: 'pin', label: 'Elektriksel giriş gücü Pin', name: 'Pin', value: '8.5', units: POWER_UNITS, unit: 'kW' },
          ],
          compute(v) {
            const r = inductionMotor({ f: v.f, poles: v.poles, nr: v.nr, pout: v.pout, pin: v.pin });
            const warnings = [];
            if (r.efficiency > 1) warnings.push('Çıkış gücü giriş gücünden büyük olamaz; değerleri kontrol edin.');
            if (r.slip > 0.1) warnings.push('Kayma %10’un üstünde: anma yükünde tipik kayma %1–6’dır (kalkış ya da aşırı yük?).');
            return {
              results: [
                { label: 'Senkron hız ns', value: `${formatNumber(r.ns, 6)} d/dk` },
                { label: 'Kayma s', value: `%${formatNumber(r.slip * 100, 4)}` },
                { label: 'Rotor akımı frekansı fr = s·f', value: formatSI(r.fr, 'Hz') },
                { label: 'Rotor açısal hızı ωr', value: formatSI(r.wr, 'rad/s') },
                { label: 'Mil momenti T', value: formatSI(r.torque, 'N·m') },
                { label: 'Verim η', value: `%${formatNumber(r.efficiency * 100, 4)}` },
                { label: 'Toplam kayıp Pin − Pout', value: formatSI(v.pin - v.pout, 'W') },
                { label: 'Hava aralığı gücü Pag ≈ Pout/(1−s)', value: formatSI(r.pag, 'W') },
                { label: 'Rotor bakır kaybı ≈ s·Pag', value: formatSI(r.pcuRotor, 'W') },
              ],
              warnings,
            };
          },
          formulas: [
            formula(String.raw`n_s=\frac{120f}{p},\qquad s=\frac{n_s-n_r}{n_s},\qquad f_r=sf`, 'ns = 120·f/p,  s = (ns − nr)/ns,  fr = s·f'),
            formula(String.raw`T=\frac{P_{out}}{\omega_r},\quad \omega_r=\frac{2\pi n_r}{60},\qquad P_{cu,r}=sP_{ag}`, 'T = Pout/ωr,  ωr = 2π·nr/60,  Pcu,r = s·Pag'),
          ],
          notes: [
            'Hava aralığı gücü ve rotor bakır kaybı, sürtünme ve vantilasyon kayıpları ihmal edilerek (Pmek ≈ Pout) yaklaşık bulunur.',
            'Kutup sayısı p toplam kutuptur; bazı kitaplar kutup çifti (p/2) kullanır: ns = 60f/(kutup çifti).',
          ],
        }),
      }],
    }));
  },
};
