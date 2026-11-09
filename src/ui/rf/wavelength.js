import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { LENGTH_UNITS, FREQUENCY_UNITS, formatSI } from '../../calc/units.js';
import { wavelengthFromFrequency, frequencyFromWavelength } from '../../calc/rf.js';

const erField = {
  key: 'er', label: 'Ortamın bağıl dielektrik sabiti εr', name: 'εr',
  value: '1', min: 1, hint: 'Boşluk/hava için 1. Mikroşerit hatta εr yerine εeff kullanın.',
};

const formulas = () => [
  formula(String.raw`\lambda=\frac{c}{f\sqrt{\varepsilon_r}}=\frac{\lambda_0}{\sqrt{\varepsilon_r}},\qquad c=299\,792\,458\ \text{m/s}`,
    'λ = c / (f·√εr) = λ0 / √εr,  c = 299 792 458 m/s'),
];

const notes = [
  'Kayıpsız, manyetik olmayan (μr = 1), sonsuz homojen ortam varsayılır.',
  'Hat üzerindeki dalga boyu için εr yerine hattın etkin dielektrik sabiti (εeff) girilmelidir.',
];

function wavelengthResults(lambda, er) {
  const rows = [
    { label: 'Dalga boyu λ', value: formatSI(lambda, 'm') },
    { label: 'λ/2', value: formatSI(lambda / 2, 'm') },
    { label: 'λ/4', value: formatSI(lambda / 4, 'm') },
  ];
  if (er > 1) rows.push({ label: 'Boşluktaki dalga boyu λ0', value: formatSI(lambda * Math.sqrt(er), 'm') });
  return rows;
}

export default {
  id: 'rf/wavelength',
  title: 'Dalga boyu ↔ frekans',
  render(container) {
    container.append(calculatorView({
      title: 'Dalga boyu ↔ frekans',
      intro: 'Verilen ortamda frekanstan dalga boyunu ya da dalga boyundan frekansı hesaplar.',
      modes: [
        {
          id: 'f2l',
          label: 'f → λ',
          build: () => calculatorPanel({
            fields: [
              { key: 'f', label: 'Frekans f', name: 'Frekans', value: '2.45', units: FREQUENCY_UNITS, unit: 'GHz' },
              erField,
            ],
            compute: ({ f, er }) => ({ results: wavelengthResults(wavelengthFromFrequency({ f, er }), er) }),
            formulas: formulas(),
            notes,
          }),
        },
        {
          id: 'l2f',
          label: 'λ → f',
          build: () => calculatorPanel({
            fields: [
              { key: 'wavelength', label: 'Ortamdaki dalga boyu λ', name: 'Dalga boyu', value: '12.24', units: LENGTH_UNITS, unit: 'cm' },
              erField,
            ],
            compute: ({ wavelength, er }) => ({
              results: [
                { label: 'Frekans f', value: formatSI(frequencyFromWavelength({ wavelength, er }), 'Hz') },
                ...(er > 1 ? [{ label: 'Boşluktaki dalga boyu λ0', value: formatSI(wavelength * Math.sqrt(er), 'm') }] : []),
              ],
            }),
            formulas: formulas(),
            notes,
          }),
        },
      ],
    }));
  },
};
