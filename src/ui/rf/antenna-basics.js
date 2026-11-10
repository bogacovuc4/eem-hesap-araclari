import { calculatorView, calculatorPanel, verifyNote } from '../form.js';
import { formula } from '../formula.js';
import { FREQUENCY_UNITS, LENGTH_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { antennaBasics, gainFromAperture } from '../../calc/rf2.js';

const freqField = { key: 'f', label: 'Frekans f', name: 'f', value: '10', units: FREQUENCY_UNITS, unit: 'GHz' };

export default {
  id: 'rf/antenna-basics',
  title: 'Anten temel büyüklükleri',
  render(container) {
    container.append(calculatorView({
      title: 'Anten temel büyüklükleri',
      intro: 'Kazanç ↔ etkin açıklık, dBi ↔ dBd, uzak alan sınırı ve yarım dalga dipol uzunluğu.',
      modes: [
        {
          id: 'gain',
          label: 'Kazançtan',
          build: () => calculatorPanel({
            fields: [
              freqField,
              { key: 'g', label: 'Kazanç G (dBi)', name: 'G', value: '20', constraint: 'any' },
              { key: 'd', label: 'Antenin en büyük boyutu D', name: 'D', value: '30', units: LENGTH_UNITS, unit: 'cm', hint: 'Çanakta çap, yama dizisinde köşegen' },
            ],
            compute(v) {
              const r = antennaBasics({ f: v.f, gainDbi: v.g, size: v.d });
              return {
                results: [
                  { label: 'Dalga boyu λ', value: formatSI(r.lambda, 'm') },
                  { label: 'Kazanç (doğrusal)', value: formatNumber(r.gainLinear) },
                  { label: 'Kazanç (dBd)', value: `${formatNumber(r.gainDbd)} dBd` },
                  { label: 'Etkin açıklık Ae', value: `${formatNumber(r.effectiveAperture)} m²` },
                  { label: 'Uzak alan sınırı 2D²/λ', value: formatSI(r.fraunhofer, 'm') },
                  { label: 'Reaktif yakın alan sınırı', value: formatSI(r.reactiveNear, 'm') },
                  { label: 'Yarım dalga (λ/2)', value: formatSI(r.halfWave, 'm') },
                ],
                warnings: r.fraunhofer < r.lambda ? ['Anten dalga boyuna göre küçük: uzak alan için ayrıca r ≫ λ koşulu belirleyicidir.'] : [],
              };
            },
            formulas: [
              formula(String.raw`A_e = \frac{G\lambda^2}{4\pi},\qquad G_{\text{dBd}} = G_{\text{dBi}} - 2.15,\qquad r_{\text{uzak}} > \frac{2D^2}{\lambda},\qquad r_{\text{reaktif}} < 0.62\sqrt{\frac{D^3}{\lambda}}`,
                'Ae = G·λ²/(4π),  GdBd = GdBi − 2,15,  r_uzak > 2D²/λ,  r_reaktif < 0,62·√(D³/λ)'),
            ],
            notes: [
              'Balanis, Antenna Theory, Böl. 2. Uzak alan için ayrıca r ≫ D ve r ≫ λ koşulları sağlanmalıdır.',
              'dBd, yarım dalga dipole göre kazançtır; yarım dalga dipolün kazancı 2,15 dBi’dir.',
              'Etkin açıklık, kayıpsız ve polarizasyonu uyumlu bir anten içindir (kazanç zaten verimi içerir).',
              verifyNote('Gerçek yarım dalga dipol, uç etkisi nedeniyle λ/2’den yaklaşık %2–5 kısa kesilir; kısaltma oranı tel kalınlığına bağlıdır.'),
            ],
          }),
        },
        {
          id: 'aperture',
          label: 'Açıklıktan',
          build: () => calculatorPanel({
            fields: [
              freqField,
              { key: 'area', label: 'Fiziksel açıklık alanı (m²)', name: 'Alan', value: '0.0707', hint: '30 cm çaplı çanak ≈ 0,0707 m²' },
              { key: 'eff', label: 'Açıklık verimi (%)', name: 'Verim', value: '55', max: 100, hint: 'Parabolik çanaklarda tipik %50–70' },
            ],
            compute(v) {
              const r = gainFromAperture({ f: v.f, aperture: v.area * v.eff / 100 });
              return {
                results: [
                  { label: 'Kazanç', value: `${formatNumber(r.gainDbi)} dBi` },
                  { label: 'Kazanç (dBd)', value: `${formatNumber(r.gainDbi - 2.15)} dBd` },
                  { label: 'Kazanç (doğrusal)', value: formatNumber(r.gainLinear) },
                  { label: 'Etkin açıklık Ae', value: `${formatNumber(v.area * v.eff / 100)} m²` },
                  { label: 'Dalga boyu λ', value: formatSI(r.lambda, 'm') },
                ],
              };
            },
            formulas: [formula(String.raw`G = e_{ap}\,\frac{4\pi A}{\lambda^2}`, 'G = e_ap · 4π·A / λ²')],
            notes: ['Açıklık verimi aydınlatma, taşma (spillover), blokaj ve yüzey hatalarını birlikte temsil eder.'],
          }),
        },
      ],
    }));
  },
};
