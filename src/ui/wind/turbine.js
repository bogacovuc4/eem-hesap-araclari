import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { LENGTH_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { turbinePower, BETZ_LIMIT } from '../../calc/wind.js';

export default {
  id: 'wind/turbine',
  title: 'Türbin gücü',
  render(container) {
    container.append(calculatorView({
      title: 'Rüzgâr türbini gücü',
      intro: 'Rotor çapı, rüzgâr hızı ve güç katsayısından mekanik güç.',
      modes: [{
        id: 'power',
        label: 'Güç',
        build: () => calculatorPanel({
          fields: [
            { key: 'diameter', label: 'Rotor çapı D', name: 'Rotor çapı', value: '100', units: LENGTH_UNITS, unit: 'm' },
            { key: 'v', label: 'Rüzgâr hızı v (m/s)', name: 'Rüzgâr hızı', value: '10', constraint: 'nonnegative' },
            { key: 'rho', label: 'Hava yoğunluğu ρ (kg/m³)', name: 'ρ', value: '1.225', hint: 'Deniz seviyesi, 15 °C: 1,225. Yerel değer için “Hava yoğunluğu” hesaplayıcısını kullanın.' },
            { key: 'cp', label: 'Güç katsayısı Cp', name: 'Cp', value: '0.4', max: 1, hint: 'Modern büyük türbinler ≈ 0,40–0,50' },
          ],
          compute(v) {
            const t = turbinePower(v);
            const warnings = t.exceedsBetz
              ? [`Cp = ${formatNumber(v.cp, 3)} Betz sınırını (16/27 ≈ ${formatNumber(BETZ_LIMIT, 3)}) aşıyor: hiçbir türbin bu verime ulaşamaz.`]
              : [];
            return {
              results: [
                { label: 'Türbin gücü P', value: formatSI(t.power, 'W') },
                { label: 'Rüzgârdaki toplam güç (Cp = 1)', value: formatSI(t.available, 'W') },
                { label: 'Betz sınırında güç', value: formatSI(t.betzPower, 'W') },
                { label: 'Süpürülen alan A', value: `${formatNumber(t.area)} m²` },
                { label: 'Güç yoğunluğu P/A', value: `${formatSI(t.powerDensity, 'W')}/m²` },
              ],
              warnings,
            };
          },
          formulas: [formula(String.raw`P=\tfrac{1}{2}\,\rho\,A\,v^3\,C_p,\qquad A=\frac{\pi D^2}{4},\qquad C_{p,\max}=\frac{16}{27}\approx 0.593`,
            'P = ½·ρ·A·v³·Cp,  A = π·D²/4,  Cp,max = 16/27 ≈ 0,593 (Betz)')],
          notes: [
            'Betz sınırı (16/27 ≈ 0,593), ideal bir rotorun rüzgâr gücünden çekebileceği en yüksek orandır.',
            'Sonuç rotor milindeki mekanik güçtür; dişli kutusu ve jeneratör verimleri dahil değildir.',
            'Gerçek türbinlerde Cp hıza bağlıdır; nominal hızın üstünde güç sınırlanır (pitch kontrolü). Bu hesap güç eğrisini içermez.',
          ],
        }),
      }],
    }));
  },
};
