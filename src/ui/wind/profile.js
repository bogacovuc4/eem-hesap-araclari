import { calculatorView, calculatorPanel, verifyNote } from '../form.js';
import { formula } from '../formula.js';
import { formatNumber } from '../../calc/units.js';
import { windPowerLaw, windLogLaw } from '../../calc/wind.js';

const commonFields = [
  { key: 'v1', label: 'Referans hız v₁ (m/s)', name: 'v₁', value: '5', constraint: 'nonnegative' },
  { key: 'h1', label: 'Ölçüm yüksekliği h₁ (m)', name: 'h₁', value: '10' },
  { key: 'h2', label: 'Hedef yükseklik h₂ (m)', name: 'h₂', value: '80', hint: 'Genellikle türbin göbek yüksekliği' },
];

function results(v1, v2) {
  return [
    { label: 'Hedef yükseklikte hız v₂', value: `${formatNumber(v2)} m/s` },
    { label: 'Hız oranı v₂/v₁', value: v1 > 0 ? formatNumber(v2 / v1) : '—' },
    { label: 'Güç oranı (v₂/v₁)³', value: v1 > 0 ? formatNumber((v2 / v1) ** 3) : '—' },
  ];
}

const commonNotes = [
  'Yatay olarak homojen arazi ve nötr atmosfer (gündüz/gece kararlılık etkisi yok) varsayılır.',
  'Ölçüm ve hedef yüksekliklerinin ikisi de yüzey tabakasında (≈ 100–200 m altında) olmalıdır.',
];

export default {
  id: 'wind/profile',
  title: 'Rüzgâr hız profili',
  render(container) {
    container.append(calculatorView({
      title: 'Rüzgâr hızının yüksekliğe taşınması',
      intro: 'Bir yükseklikte ölçülen rüzgâr hızından başka bir yükseklikteki hızın tahmini.',
      modes: [
        {
          id: 'power',
          label: 'Güç yasası',
          build: () => calculatorPanel({
            fields: [
              ...commonFields,
              { key: 'alpha', label: 'Rüzgâr kesme üssü α', name: 'α', value: '0.143', constraint: 'nonnegative', max: 0.99, hint: '1/7 ≈ 0,143 açık arazi için klasik değer' },
            ],
            compute: (v) => ({ results: results(v.v1, windPowerLaw(v)) }),
            formulas: [formula(String.raw`v_2=v_1\left(\frac{h_2}{h_1}\right)^{\alpha}`, 'v2 = v1·(h2/h1)^α')],
            notes: [
              'Ampirik bir bağıntıdır; α arazi, atmosfer kararlılığı ve günün saatine göre değişir.',
              verifyNote('Tipik α değerleri: su yüzeyi ≈ 0,10; açık düz arazi ≈ 0,14 (1/7); ağaçlık/kırsal ≈ 0,20–0,25; şehir ≈ 0,30–0,40. Kaynaklar arasında farklılık gösterir.'),
              ...commonNotes,
            ],
          }),
        },
        {
          id: 'log',
          label: 'Logaritmik profil',
          build: () => calculatorPanel({
            fields: [
              ...commonFields,
              { key: 'z0', label: 'Pürüzlülük uzunluğu z₀ (m)', name: 'z₀', value: '0.03', hint: 'Açık arazi/çimen ≈ 0,03 m' },
            ],
            compute: (v) => ({ results: results(v.v1, windLogLaw(v)) }),
            formulas: [formula(String.raw`v_2=v_1\,\frac{\ln(h_2/z_0)}{\ln(h_1/z_0)}`, 'v2 = v1·ln(h2/z0)/ln(h1/z0)')],
            notes: [
              'Nötr atmosferde yüzey tabakası için teorik temelli profildir (kararlılık düzeltmesi yok).',
              verifyNote('Tipik z₀ değerleri: açık deniz ≈ 0,0002 m; düz çimenlik ≈ 0,01–0,03 m; tarım arazisi ≈ 0,05–0,1 m; dağınık ağaç/köy ≈ 0,25–0,5 m; orman/banliyö ≈ 0,5–1 m; şehir merkezi ≥ 1 m. Kaynaklar arasında farklılık gösterir.'),
              'Yükseklikler z₀’dan çok büyük olmalıdır; yüksek engellerin (bina, orman) olduğu yerde sıfır düzlem kayması d ayrıca hesaba katılmalıdır.',
              ...commonNotes,
            ],
          }),
        },
      ],
    }));
  },
};
