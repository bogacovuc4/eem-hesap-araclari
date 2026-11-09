import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber } from '../../calc/units.js';
import {
  dbmToWatt, wattToDbm, dbToPowerRatio, dbToVoltageRatio, powerRatioToDb, voltageRatioToDb,
} from '../../calc/rf.js';

const POWER_UNITS = { 'µW': 1e-6, mW: 1e-3, W: 1, kW: 1e3 };

const fmtDb = (v, unit = 'dB') => `${formatNumber(v)} ${unit}`;

export default {
  id: 'rf/decibel',
  title: 'dB çeviriciler',
  render(container) {
    container.append(calculatorView({
      title: 'dB çeviriciler',
      intro: 'Mutlak güç (dBm ↔ W) ve oranlar (dB ↔ güç/gerilim oranı).',
      modes: [
        {
          id: 'dbm2w',
          label: 'dBm → W',
          build: () => calculatorPanel({
            fields: [{ key: 'dbm', label: 'Güç (dBm)', name: 'Güç', value: '20', constraint: 'any' }],
            compute: ({ dbm }) => {
              const w = dbmToWatt(dbm);
              return {
                results: [
                  { label: 'Güç P', value: formatSI(w, 'W') },
                  { label: 'dBW', value: fmtDb(dbm - 30, 'dBW') },
                  { label: '50 Ω yükte etkin gerilim', value: formatSI(Math.sqrt(w * 50), 'V') },
                ],
              };
            },
            formulas: [formula(String.raw`P=1\ \text{mW}\cdot 10^{P_{\text{dBm}}/10}`, 'P = 1 mW · 10^(P_dBm/10)')],
            notes: ['dBm, 1 mW referansına göre güçtür. 0 dBm = 1 mW, 30 dBm = 1 W.', 'Gerilim satırı 50 Ω saf dirençli yük varsayar: V = √(P·R).'],
          }),
        },
        {
          id: 'w2dbm',
          label: 'W → dBm',
          build: () => calculatorPanel({
            fields: [{ key: 'w', label: 'Güç P', name: 'Güç', value: '1', units: POWER_UNITS, unit: 'W' }],
            compute: ({ w }) => {
              const dbm = wattToDbm(w);
              return { results: [{ label: 'dBm', value: fmtDb(dbm, 'dBm') }, { label: 'dBW', value: fmtDb(dbm - 30, 'dBW') }] };
            },
            formulas: [formula(String.raw`P_{\text{dBm}}=10\log_{10}\!\left(\frac{P}{1\ \text{mW}}\right)`, 'P_dBm = 10·log10(P / 1 mW)')],
            notes: ['Güç sıfırdan büyük olmalıdır (0 W = −∞ dBm).'],
          }),
        },
        {
          id: 'db2ratio',
          label: 'dB → oran',
          build: () => calculatorPanel({
            fields: [{ key: 'db', label: 'Değer (dB)', name: 'dB', value: '3', constraint: 'any' }],
            compute: ({ db }) => ({
              results: [
                { label: 'Güç oranı P₂/P₁', value: formatNumber(dbToPowerRatio(db)) },
                { label: 'Gerilim/akım oranı V₂/V₁', value: formatNumber(dbToVoltageRatio(db)) },
              ],
            }),
            formulas: [formula(String.raw`\frac{P_2}{P_1}=10^{\,\text{dB}/10},\qquad \frac{V_2}{V_1}=10^{\,\text{dB}/20}`, 'P2/P1 = 10^(dB/10),  V2/V1 = 10^(dB/20)')],
            notes: ['Gerilim oranı yalnızca iki gerilim aynı empedans üzerinde ölçüldüğünde güç oranıyla tutarlıdır.'],
          }),
        },
        {
          id: 'ratio2db',
          label: 'Oran → dB',
          build: () => calculatorPanel({
            fields: [{ key: 'ratio', label: 'Oran (P₂/P₁ veya V₂/V₁)', name: 'Oran', value: '2' }],
            compute: ({ ratio }) => ({
              results: [
                { label: 'Güç oranı olarak', value: fmtDb(powerRatioToDb(ratio)) },
                { label: 'Gerilim/akım oranı olarak', value: fmtDb(voltageRatioToDb(ratio)) },
              ],
            }),
            formulas: [formula(String.raw`\text{dB}=10\log_{10}\frac{P_2}{P_1}=20\log_{10}\frac{V_2}{V_1}`, 'dB = 10·log10(P2/P1) = 20·log10(V2/V1)')],
            notes: ['Oran sıfırdan büyük olmalıdır. 1’den küçük oranlar negatif dB (kayıp) verir.'],
          }),
        },
      ],
    }));
  },
};
