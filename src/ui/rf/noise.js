import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { FREQUENCY_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { noiseFigureToTemp, noiseTempToFigure, cascadeNoise, thermalNoise, T0 } from '../../calc/rf2.js';
import { svg, figure, s, wire, terminal, label } from '../schematic.js';

const db = (v) => `${formatNumber(v)} dB`;

/** Kademeli katlar: giriş → [kat 1] → [kat 2] → [kat 3] → çıkış */
function cascadeDiagram(v) {
  const blocks = [1, 2, 3].map((i) => {
    const x = 40 + (i - 1) * 140;
    const g = v[`g${i}`];
    const nf = v[`nf${i}`];
    return s('g', {},
      s('polygon', { points: `${x},40 ${x},110 ${x + 70},75`, class: 'sch-line sch-body' }),
      label(x + 26, 128, `Kat ${i} · G ${Number.isFinite(g) ? formatNumber(g, 3) : '?'} dB`, `NF ${Number.isFinite(nf) ? formatNumber(nf, 3) : '?'} dB`, { anchor: 'middle' }),
      i < 3 ? wire([x + 70, 75], [x + 140, 75]) : null);
  });
  return figure(svg([-24, 20, 494, 140], 'Kademeli bağlı üç kat',
    terminal(20, 75), wire([20, 75], [40, 75]),
    ...blocks,
    wire([390, 75], [420, 75]), terminal(420, 75),
  ));
}

export default {
  id: 'rf/noise',
  title: 'Gürültü faktörü ve sıcaklığı',
  render(container) {
    container.append(calculatorView({
      title: 'Gürültü faktörü, gürültü sıcaklığı ve duyarlılık',
      intro: 'NF ↔ Te dönüşümü, kademeli katların toplam gürültüsü (Friis) ve termal gürültüye göre alıcı duyarlılığı.',
      modes: [
        {
          id: 'nf',
          label: 'NF ↔ Te',
          build: () => calculatorPanel({
            fields: [{ key: 'nf', label: 'Gürültü faktörü NF (dB)', name: 'NF', value: '3', constraint: 'nonnegative' }],
            compute: (v) => {
              const r = noiseFigureToTemp(v.nf);
              return {
                results: [
                  { label: 'Eşdeğer gürültü sıcaklığı Te', value: `${formatNumber(r.te)} K` },
                  { label: 'Gürültü faktörü F (doğrusal)', value: formatNumber(r.factor) },
                ],
              };
            },
            formulas: [formula(String.raw`T_e = T_0\,(F - 1),\qquad F = 10^{NF/10},\qquad T_0 = 290\ \text{K}`, 'Te = T0·(F − 1),  F = 10^(NF/10),  T0 = 290 K')],
            notes: ['IEEE tanımı: T0 = 290 K standart giriş sıcaklığıdır.'],
          }),
        },
        {
          id: 'te',
          label: 'Te → NF',
          build: () => calculatorPanel({
            fields: [{ key: 'te', label: 'Gürültü sıcaklığı Te (K)', name: 'Te', value: '75', constraint: 'nonnegative' }],
            compute: (v) => {
              const r = noiseTempToFigure(v.te);
              return {
                results: [
                  { label: 'Gürültü faktörü NF', value: db(r.nf) },
                  { label: 'Gürültü faktörü F (doğrusal)', value: formatNumber(r.factor) },
                ],
              };
            },
            formulas: [formula(String.raw`F = 1 + \frac{T_e}{T_0},\qquad NF = 10\log_{10}F`, 'F = 1 + Te/T0,  NF = 10·log10 F')],
            notes: ['Düşük gürültülü kuvvetlendiriciler (LNA) çoğunlukla sıcaklıkla (K) belirtilir.'],
          }),
        },
        {
          id: 'cascade',
          label: 'Kademeli katlar',
          build: () => calculatorPanel({
            fields: [1, 2, 3].flatMap((i) => [
              { key: `g${i}`, label: `Kat ${i} kazancı (dB)`, name: `G${i}`, value: ['15', '-7', '20'][i - 1], constraint: 'any' },
              { key: `nf${i}`, label: `Kat ${i} gürültü faktörü (dB)`, name: `NF${i}`, value: ['1.5', '7', '10'][i - 1], constraint: 'nonnegative', hint: i === 3 ? 'Kullanmadığınız kat için G = 0 dB, NF = 0 dB girin.' : undefined },
            ]),
            compute(v) {
              const stages = [1, 2, 3].map((i) => ({ gainDb: v[`g${i}`], nfDb: v[`nf${i}`] }));
              const r = cascadeNoise(stages);
              const first = cascadeNoise([stages[0]]);
              return {
                results: [
                  { label: 'Toplam gürültü faktörü NF', value: db(r.nf) },
                  { label: 'Toplam gürültü sıcaklığı Te', value: `${formatNumber(r.te)} K` },
                  { label: 'Toplam kazanç', value: db(r.gainDb) },
                  { label: 'Birinci katın payı', value: `%${formatNumber((first.factor - 1) / (r.factor - 1) * 100, 3)}` },
                ],
                warnings: v.g1 < 10 ? ['Birinci katın kazancı düşük: sonraki katların gürültüsü toplamı belirgin biçimde artırır. Girişe yüksek kazançlı bir LNA koyun.'] : [],
              };
            },
            diagram: (v) => cascadeDiagram(v),
            diagramTitle: 'Kat zinciri',
            formulas: [formula(String.raw`F = F_1 + \frac{F_2 - 1}{G_1} + \frac{F_3 - 1}{G_1 G_2},\qquad T_e = T_{e1} + \frac{T_{e2}}{G_1} + \frac{T_{e3}}{G_1 G_2}`,
              'F = F1 + (F2 − 1)/G1 + (F3 − 1)/(G1·G2)')],
            notes: [
              'Pasif kayıplı bir elemanda (kablo, filtre) kazanç = −kayıp dB ve NF = kayıp dB alınır (T = 290 K’de).',
              'Toplam gürültüyü ilk katlar belirler; bu yüzden LNA alıcının en başına konur.',
            ],
          }),
        },
        {
          id: 'thermal',
          label: 'Termal gürültü ve duyarlılık',
          build: () => calculatorPanel({
            fields: [
              { key: 'b', label: 'Bant genişliği B', name: 'B', value: '1', units: FREQUENCY_UNITS, unit: 'MHz' },
              { key: 't', label: 'Sıcaklık T (K)', name: 'T', value: String(T0) },
              { key: 'nf', label: 'Alıcı gürültü faktörü NF (dB)', name: 'NF', value: '5', constraint: 'nonnegative' },
              { key: 'snr', label: 'Gereken en küçük SNR (dB)', name: 'SNR', value: '10', constraint: 'any' },
            ],
            compute(v) {
              const r = thermalNoise({ bandwidth: v.b, temperature: v.t, nfDb: v.nf, snrDb: v.snr });
              return {
                results: [
                  { label: 'Termal gürültü kTB', value: `${formatNumber(r.noiseDbm)} dBm` },
                  { label: 'kTB (W)', value: formatSI(r.noise, 'W') },
                  { label: 'Gürültü tabanı (kTB + NF)', value: `${formatNumber(r.floorDbm)} dBm` },
                  { label: 'Alıcı duyarlılığı', value: `${formatNumber(r.sensitivityDbm)} dBm` },
                ],
              };
            },
            formulas: [formula(String.raw`N = kTB,\qquad S_{\min} = 10\log_{10}\!\frac{kT_0}{1\,\text{mW}} + 10\log_{10}B + NF + \text{SNR}_{\min} \approx -174\ \text{dBm} + 10\log_{10}B + NF + \text{SNR}_{\min}`,
              'N = kTB,  S_min ≈ −174 dBm + 10·log10 B + NF + SNR_min')],
            notes: ['k = 1,380649×10⁻²³ J/K. 290 K’de gürültü yoğunluğu ≈ −174 dBm/Hz.', 'Duyarlılık formülü giriş sıcaklığı T0 = 290 K varsayar; anten gürültü sıcaklığı farklıysa sonuç değişir.'],
          }),
        },
      ],
    }));
  },
};
