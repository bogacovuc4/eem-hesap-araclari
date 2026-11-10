import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber, FREQUENCY_UNITS } from '../../calc/units.js';
import { shannonCapacity, nyquistRate, bitErrorRate } from '../../calc/comm.js';

const BITRATE = { 'b/s': 1, 'kb/s': 1e3, 'Mb/s': 1e6, 'Gb/s': 1e9 };
const sci = (x) => (x < 1e-300 ? '< 10^-300' : x.toExponential(3).replace('.', ',').replace('e', '×10^'));

export default {
  id: 'comm/channel',
  title: 'Kanal kapasitesi ve BER',
  render(container) {
    container.append(calculatorView({
      title: 'Kanal kapasitesi, Nyquist hızı ve bit hata oranı',
      intro: 'Shannon–Hartley kapasitesi, gürültüsüz kanalda Nyquist bit hızı ve AWGN kanalda sayısal modülasyonların BER değeri.',
      modes: [
        {
          id: 'shannon',
          label: 'Shannon',
          build: () => calculatorPanel({
            fields: [
              { key: 'b', label: 'Bant genişliği B', name: 'B', value: '3', units: FREQUENCY_UNITS, unit: 'kHz' },
              { key: 'snr', label: 'SNR (dB)', name: 'SNR', value: '30', constraint: 'any' },
              { key: 'rb', label: 'İstenen bit hızı Rb (karşılaştırma)', name: 'Rb', value: '20', units: BITRATE, unit: 'kb/s' },
            ],
            compute(v) {
              const snr = 10 ** (v.snr / 10);
              const r = shannonCapacity({ b: v.b, snr });
              const minSnrDb = 10 * Math.log10(2 ** (v.rb / v.b) - 1);
              return {
                results: [
                  { label: 'Kanal kapasitesi C', value: formatSI(r.c, 'b/s') },
                  { label: 'Spektral verim C/B', value: `${formatNumber(r.spectralEff, 4)} b/s/Hz` },
                  { label: 'SNR (doğrusal)', value: formatNumber(snr, 5) },
                  { label: 'Rb için gereken en küçük SNR', value: `${formatNumber(minSnrDb, 4)} dB` },
                  { label: 'Rb’de Eb/N0 = SNR·B/Rb', value: `${formatNumber(10 * Math.log10((snr * v.b) / v.rb), 4)} dB` },
                  { label: 'Rb ≤ C mi?', value: v.rb <= r.c ? 'evet (hatasız iletim kuramsal olarak mümkün)' : 'hayır' },
                ],
              };
            },
            formulas: [formula(String.raw`C=B\log_2\!\left(1+\frac{S}{N}\right),\qquad \frac{E_b}{N_0}=\frac{S}{N}\cdot\frac{B}{R_b}`, 'C = B·log2(1 + S/N),  Eb/N0 = (S/N)·B/Rb')],
            notes: ['Toplamsal beyaz Gauss gürültülü (AWGN) kanal için kuramsal üst sınırdır; gerçek sistemler kodlamayla bu sınıra yaklaşır.', 'B → ∞ için Eb/N0 alt sınırı ln 2 = −1,59 dB’dir (Shannon sınırı).'],
          }),
        },
        {
          id: 'nyquist',
          label: 'Nyquist',
          build: () => calculatorPanel({
            fields: [
              { key: 'b', label: 'Bant genişliği B', name: 'B', value: '3', units: FREQUENCY_UNITS, unit: 'kHz' },
              { key: 'm', label: 'Sembol seviye sayısı M', name: 'M', value: '4', min: 2, hint: '2 = ikili, 4 = QPSK/4-PAM, 16 = 16-QAM' },
            ],
            compute(v) {
              const r = nyquistRate(v);
              return {
                results: [
                  { label: 'En büyük bit hızı', value: formatSI(r, 'b/s') },
                  { label: 'En büyük sembol hızı 2B', value: formatSI(2 * v.b, 'Bd') },
                  { label: 'Sembol başına bit log2 M', value: formatNumber(Math.log2(v.m), 4) },
                ],
              };
            },
            formulas: [formula(String.raw`R_{\text{max}}=2B\log_2 M`, 'Rmax = 2B·log2(M)')],
            notes: ['Gürültüsüz, ideal alçak geçiren kanal (ISI’sız Nyquist kriteri). Yükseltilmiş kosinüs süzgeçte sembol hızı 2B/(1+α) olur.'],
          }),
        },
        {
          id: 'ber',
          label: 'BER',
          build: () => calculatorPanel({
            fields: [{ key: 'eb', label: 'Eb/N0 (dB)', name: 'Eb/N0', value: '9.6', constraint: 'any', min: -10, max: 30 }],
            compute(v) {
              const e = 10 ** (v.eb / 10);
              return {
                results: [
                  { label: 'BPSK / QPSK (eş fazlı)', value: sci(bitErrorRate('bpsk', e)) },
                  { label: 'BFSK (eş fazlı, dik)', value: sci(bitErrorRate('bfsk', e)) },
                  { label: 'DBPSK (diferansiyel)', value: sci(bitErrorRate('dbpsk', e)) },
                  { label: 'BFSK (eş fazsız)', value: sci(bitErrorRate('ncfsk', e)) },
                  { label: 'Eb/N0 (doğrusal)', value: formatNumber(e, 5) },
                ],
              };
            },
            formulas: [
              formula(String.raw`P_b^{\text{BPSK}}=Q\!\left(\sqrt{2E_b/N_0}\right),\quad P_b^{\text{BFSK}}=Q\!\left(\sqrt{E_b/N_0}\right),\quad Q(x)=\tfrac12\operatorname{erfc}\!\left(\tfrac{x}{\sqrt2}\right)`, 'BPSK: Q(√(2Eb/N0)),  BFSK: Q(√(Eb/N0)),  Q(x) = ½·erfc(x/√2)'),
              formula(String.raw`P_b^{\text{DBPSK}}=\tfrac12e^{-E_b/N_0},\qquad P_b^{\text{FSK, eş fazsız}}=\tfrac12e^{-E_b/2N_0}`, 'DBPSK: ½·e^(−Eb/N0),  eş fazsız FSK: ½·e^(−Eb/2N0)'),
            ],
            notes: ['AWGN kanal, ideal senkronizasyon. QPSK’nin bit hata oranı (Gray kodlu) BPSK ile aynıdır.', 'Referans: BPSK’de BER = 10⁻⁵ için Eb/N0 ≈ 9,6 dB gerekir.'],
          }),
        },
      ],
    }));
  },
};
