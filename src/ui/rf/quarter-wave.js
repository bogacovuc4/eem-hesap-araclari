import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { FREQUENCY_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { quarterWaveTransformer } from '../../calc/rf2.js';
import { svg, figure, fmt } from '../schematic.js';
import { lineSection, load, inputPort } from './txline-draw.js';

function diagram(v, out) {
  return figure(svg([0, 0, 470, 190], 'Çeyrek dalga empedans dönüştürücü',
    inputPort(20, 70, 40),
    lineSection(40, 180, 70, { title: 'Hat Z0', value: fmt(v.z0, 'Ω') }),
    lineSection(180, 330, 70, { title: 'Z1 · λ/4', value: out ? `${fmt(out.raw.z1, 'Ω')} · ${fmt(out.raw.length, 'm')}` : '?' }),
    load(330, 70, 'ZL', fmt(v.zl, 'Ω')),
  ));
}

export default {
  id: 'rf/quarter-wave',
  title: 'Çeyrek dalga dönüştürücü',
  render(container) {
    container.append(calculatorView({
      title: 'Çeyrek dalga empedans dönüştürücü',
      intro: 'Gerçek bir yükü hatta uyumlamak için gereken ara hat empedansı, uzunluğu ve bant genişliği.',
      modes: [{
        id: 'design',
        label: 'Tasarım',
        build: () => calculatorPanel({
          fields: [
            { key: 'z0', label: 'Hat empedansı Z0 (Ω)', name: 'Z0', value: '50' },
            { key: 'zl', label: 'Yük direnci RL (Ω)', name: 'RL', value: '100', hint: 'Yük gerçek (dirençsel) olmalıdır; karmaşık yükler önce bir hat parçasıyla gerçel yapılır.' },
            { key: 'f', label: 'Merkez frekans f0', name: 'f0', value: '3', units: FREQUENCY_UNITS, unit: 'GHz' },
            { key: 'eeff', label: 'Etkin dielektrik sabiti εeff', name: 'εeff', value: '1', min: 1, hint: 'Koaksiyelde εr, mikroşeritte εeff (bkz. Mikroşerit hat)' },
            { key: 'vswr', label: 'Kabul edilebilir en büyük VSWR', name: 'VSWR', value: '1.5', min: 1.001 },
          ],
          compute(v) {
            const gammaMax = (v.vswr - 1) / (v.vswr + 1);
            const r = quarterWaveTransformer({ z0: v.z0, zl: v.zl, f: v.f, eeff: v.eeff, gammaMax });
            const mismatchVswr = (1 + Math.abs(r.gammaLoad)) / (1 - Math.abs(r.gammaLoad));
            const bw = Number.isFinite(r.bandwidth)
              ? `%${formatNumber(r.bandwidth * 100, 3)} (${formatSI(r.bandwidth * v.f, 'Hz', 3)})`
              : 'Uyumsuzluk zaten sınırın altında';
            return {
              results: [
                { label: 'Dönüştürücü empedansı Z1', value: formatSI(r.z1, 'Ω') },
                { label: 'Fiziksel uzunluk (λg/4)', value: formatSI(r.length, 'm') },
                { label: 'Hattaki dalga boyu λg', value: formatSI(r.lambdaG, 'm') },
                { label: `VSWR ≤ ${formatNumber(v.vswr, 3)} bant genişliği`, value: bw },
                { label: 'Dönüştürücüsüz VSWR', value: `${formatNumber(mismatchVswr)} : 1` },
              ],
              warnings: v.zl / v.z0 > 10 || v.z0 / v.zl > 10
                ? ['Empedans oranı 10’dan büyük: tek kademeli dönüştürücünün bandı dardır; çok kademeli (binom/Chebyshev) dönüştürücü düşünün.']
                : [],
              raw: r,
            };
          },
          diagram,
          formulas: [
            formula(String.raw`Z_1 = \sqrt{Z_0 Z_L},\qquad \ell = \frac{\lambda_g}{4} = \frac{c}{4 f_0 \sqrt{\varepsilon_{\text{eff}}}}`, 'Z1 = √(Z0·ZL),  ℓ = λg/4 = c / (4·f0·√εeff)'),
            formula(String.raw`\frac{\Delta f}{f_0} = 2 - \frac{4}{\pi}\cos^{-1}\!\left[\frac{\Gamma_m}{\sqrt{1-\Gamma_m^2}}\,\frac{2\sqrt{Z_0 Z_L}}{|Z_L - Z_0|}\right],\qquad \Gamma_m = \frac{\text{VSWR}-1}{\text{VSWR}+1}`,
              'Δf/f0 = 2 − (4/π)·arccos[ Γm/√(1−Γm²) · 2√(Z0·ZL)/|ZL − Z0| ]'),
          ],
          notes: [
            'Pozar, Microwave Engineering, Böl. 2.5 ve 5.4. Örnek 5.5 ile test edilmiştir (Z0 = 50 Ω, ZL = 10 Ω, VSWR 1,5 → Z1 = 22,36 Ω, bant %29).',
            'Bant genişliği formülü TEM hat (dispersiyonsuz) içindir; kayıpsız hat ve gerçek yük varsayılır.',
            'Dönüştürücü yalnızca f0’da (ve tek katlarında) tam uyum sağlar.',
          ],
        }),
      }],
    }));
  },
};
