import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber } from '../../calc/units.js';
import { airDensity } from '../../calc/wind.js';

export default {
  id: 'wind/density',
  title: 'Hava yoğunluğu',
  render(container) {
    container.append(calculatorView({
      title: 'Hava yoğunluğu',
      intro: 'Yükseklik ve yerel sıcaklıktan kuru hava yoğunluğu.',
      modes: [{
        id: 'density',
        label: 'Yoğunluk',
        build: () => calculatorPanel({
          fields: [
            { key: 'altitude', label: 'Deniz seviyesinden yükseklik (m)', name: 'Yükseklik', value: '1000', constraint: 'any', min: -500, max: 11000 },
            { key: 'temperatureC', label: 'Hava sıcaklığı (°C)', name: 'Sıcaklık', value: '15', constraint: 'any', min: -273.14 },
          ],
          compute(v) {
            const d = airDensity(v);
            return {
              results: [
                { label: 'Hava yoğunluğu ρ', value: `${formatNumber(d.rho)} kg/m³` },
                { label: 'Standarda oranı ρ/1,225', value: formatNumber(d.ratioToStandard) },
                { label: 'Basınç p (ISA)', value: formatSI(d.pressure, 'Pa') },
                { label: 'Bu yükseklikte ISA sıcaklığı', value: `${formatNumber(d.isaTemperatureC, 3)} °C` },
                { label: 'ISA sıcaklığıyla ρ', value: `${formatNumber(d.isaRho)} kg/m³` },
              ],
            };
          },
          formulas: [
            formula(String.raw`p=p_0\left(1-\frac{L\,h}{T_0}\right)^{\frac{g_0 M}{R^{*} L}},\qquad p_0=101\,325\ \text{Pa},\ T_0=288.15\ \text{K},\ L=0.0065\ \text{K/m}`,
              'p = p0·(1 − L·h/T0)^(g0·M/(R*·L)),  p0 = 101 325 Pa, T0 = 288,15 K, L = 0,0065 K/m (üs ≈ 5,256)'),
            formula(String.raw`\rho=\frac{p}{R_d\,T},\qquad R_d=\frac{R^{*}}{M}\approx 287.05\ \text{J/(kg·K)},\quad T=\vartheta+273.15`,
              'ρ = p/(R_d·T),  R_d ≈ 287,05 J/(kg·K),  T = ϑ(°C) + 273,15'),
          ],
          notes: [
            'Basınç Uluslararası Standart Atmosfer (ISA) modeliyle yükseklikten hesaplanır; gerçek basınç hava durumuna göre birkaç % değişir. Ölçülmüş basınç varsa ρ = p/(R_d·T) doğrudan kullanılmalıdır.',
            'Sıcaklık, basınçtan bağımsız olarak yerel değerden alınır. Model 0–11 km troposfer için geçerlidir.',
            'Kuru hava varsayılır. Nemli hava biraz daha hafiftir (sıcak ve çok nemli havada ≈ %1–2 daha düşük ρ).',
          ],
        }),
      }],
    }));
  },
};
