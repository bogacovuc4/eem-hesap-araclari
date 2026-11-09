import { calculatorView, calculatorPanel, verifyNote } from '../form.js';
import { formula } from '../formula.js';
import { LENGTH_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { spiralBand } from '../../calc/rf.js';

export default {
  id: 'rf/spiral',
  title: 'Arşimet spiral anten',
  render(container) {
    container.append(calculatorView({
      title: 'Arşimet spiral anten',
      intro: 'İç ve dış yarıçaptan yaklaşık çalışma bandı tahmini.',
      modes: [{
        id: 'band',
        label: 'Bant',
        build: () => calculatorPanel({
          fields: [
            { key: 'rInner', label: 'İç yarıçap r_iç', name: 'İç yarıçap', value: '5', units: LENGTH_UNITS, unit: 'mm' },
            { key: 'rOuter', label: 'Dış yarıçap r_dış', name: 'Dış yarıçap', value: '75', units: LENGTH_UNITS, unit: 'mm' },
            {
              key: 'er', label: 'Alt tabaka εr', name: 'εr', value: '1', min: 1,
              hint: 'Alt tabaka yoksa (havada) 1 girin.',
            },
          ],
          compute({ rInner, rOuter, er }) {
            const { fLow, fHigh, eeff, ratio } = spiralBand({ rInner, rOuter, er });
            return {
              results: [
                { label: 'Alt frekans f_alt', value: formatSI(fLow, 'Hz') },
                { label: 'Üst frekans f_üst', value: formatSI(fHigh, 'Hz') },
                { label: 'Bant oranı f_üst / f_alt', value: `${formatNumber(ratio, 3)} : 1` },
                { label: 'Kullanılan εeff', value: formatNumber(eeff) },
              ],
              warnings: ['Bu sonuç kaba bir tahmindir; tasarımı benzetimle (ör. CST, HFSS, openEMS) doğrulayın.'],
            };
          },
          formulas: [
            formula(String.raw`f_{\text{alt}}\approx\frac{c}{2\pi\,r_{\text{dış}}\sqrt{\varepsilon_{\text{eff}}}},\qquad f_{\text{üst}}\approx\frac{c}{2\pi\,r_{\text{iç}}\sqrt{\varepsilon_{\text{eff}}}},\qquad \varepsilon_{\text{eff}}\approx\frac{\varepsilon_r+1}{2}`,
              'f_alt ≈ c / (2π·r_dış·√εeff),  f_üst ≈ c / (2π·r_iç·√εeff),  εeff ≈ (εr + 1)/2'),
          ],
          notes: [
            'Aktif bölge kuralı: spiral, çevresi yaklaşık bir dalga boyu (2πr ≈ λ) olan halka bölgesinden ışıma yapar.',
            verifyNote('εeff ≈ (εr + 1)/2 yaklaşımı ince/kalın alt tabaka ayrımı yapmaz; gerçek değer alt tabaka kalınlığına bağlıdır.'),
            verifyNote('Pratikte f_alt genellikle bu tahminden biraz yüksek çıkar (spiral ucundaki yansıma ve kesme etkisi); f_üst ise besleme bölgesinin boyutuyla sınırlanır.'),
            'Kaviteli (arkası kapalı) spirallerde kavite derinliği alt bandı ayrıca etkiler; bu hesap kaviteyi içermez.',
          ],
        }),
      }],
    }));
  },
};
