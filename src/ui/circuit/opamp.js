import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { RESISTANCE_UNITS, VOLTAGE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { nonInvertingGain, invertingGain, gainDb } from '../../calc/circuit.js';

const vinField = { key: 'vin', label: 'Giriş gerilimi Vin', name: 'Vin', value: '0.1', units: VOLTAGE_UNITS, unit: 'V', constraint: 'any' };

const notes = [
  'İdeal op-amp: sonsuz açık çevrim kazancı, sonsuz giriş empedansı, sıfır çıkış empedansı.',
  'Çıkış besleme gerilimleriyle sınırlıdır (doyum); gerçek bant genişliği ≈ GBW / |kazanç| (gürültü kazancı) ile sınırlanır.',
];

function results(gain, vin, extra) {
  return [
    { label: 'Gerilim kazancı G', value: formatNumber(gain) },
    { label: 'Kazanç (dB)', value: gain === 0 ? '−∞ dB' : `${formatNumber(gainDb(gain))} dB` },
    { label: 'Çıkış gerilimi Vout', value: formatSI(gain * vin, 'V') },
    ...extra,
  ];
}

export default {
  id: 'circuit/opamp',
  title: 'Op-amp kuvvetlendirici',
  render(container) {
    container.append(calculatorView({
      title: 'Op-amp kuvvetlendirici kazancı',
      intro: 'Evirmeyen ve eviren ideal op-amp kuvvetlendiricileri.',
      modes: [
        {
          id: 'noninv',
          label: 'Evirmeyen',
          build: () => calculatorPanel({
            fields: [
              { key: 'rf', label: 'Geri besleme direnci Rf', name: 'Rf', value: '10', units: RESISTANCE_UNITS, unit: 'kΩ', constraint: 'nonnegative' },
              { key: 'rg', label: 'Toprak direnci Rg', name: 'Rg', value: '1', units: RESISTANCE_UNITS, unit: 'kΩ' },
              vinField,
            ],
            compute: ({ rf, rg, vin }) => ({
              results: results(nonInvertingGain({ rf, rg }), vin, [{ label: 'Giriş empedansı', value: '≈ ∞ (ideal)' }]),
            }),
            formulas: [formula(String.raw`G=1+\frac{R_f}{R_g}`, 'G = 1 + Rf/Rg')],
            notes: ['Rf = 0 (veya Rg → ∞) gerilim izleyici verir: G = 1.', ...notes],
          }),
        },
        {
          id: 'inv',
          label: 'Eviren',
          build: () => calculatorPanel({
            fields: [
              { key: 'rf', label: 'Geri besleme direnci Rf', name: 'Rf', value: '10', units: RESISTANCE_UNITS, unit: 'kΩ', constraint: 'nonnegative' },
              { key: 'rin', label: 'Giriş direnci Rin', name: 'Rin', value: '1', units: RESISTANCE_UNITS, unit: 'kΩ' },
              vinField,
            ],
            compute: ({ rf, rin, vin }) => ({
              results: results(invertingGain({ rf, rin }), vin, [{ label: 'Giriş empedansı', value: formatSI(rin, 'Ω') }]),
            }),
            formulas: [formula(String.raw`G=-\frac{R_f}{R_{\text{in}}}`, 'G = −Rf/Rin')],
            notes: ['Eksi işaret 180° faz farkını gösterir. Giriş empedansı Rin’e eşittir.', ...notes],
          }),
        },
      ],
    }));
  },
};
