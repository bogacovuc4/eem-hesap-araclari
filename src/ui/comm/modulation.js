import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { FREQUENCY_UNITS, POWER_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { amModulation, fmModulation } from '../../calc/comm.js';
import { barChart } from '../chart.js';

export default {
  id: 'comm/modulation',
  title: 'AM / FM modülasyonu',
  render(container) {
    container.append(calculatorView({
      title: 'AM / FM modülasyonu',
      intro: 'Tek tonlu genlik ve frekans modülasyonunda güç, bant genişliği ve spektrum.',
      modes: [
        {
          id: 'am',
          label: 'AM',
          build: () => calculatorPanel({
            fields: [
              { key: 'pc', label: 'Taşıyıcı gücü Pc', name: 'Pc', value: '100', units: POWER_UNITS, unit: 'W' },
              { key: 'm', label: 'Modülasyon indeksi m', name: 'm', value: '0.5', constraint: 'nonnegative', hint: 'm = Am/Ac; m > 1 aşırı modülasyon' },
              { key: 'fc', label: 'Taşıyıcı frekansı fc', name: 'fc', value: '1', units: FREQUENCY_UNITS, unit: 'MHz' },
              { key: 'fm', label: 'Mesaj frekansı fm', name: 'fm', value: '5', units: FREQUENCY_UNITS, unit: 'kHz' },
            ],
            compute(v) {
              const r = amModulation(v);
              return {
                results: [
                  { label: 'Toplam güç Pt', value: formatSI(r.total, 'W') },
                  { label: 'Yan bantların toplam gücü', value: formatSI(r.sideband, 'W') },
                  { label: 'Her yan bandın gücü', value: formatSI(r.eachSideband, 'W') },
                  { label: 'Verim (bilgi taşıyan güç oranı)', value: `%${formatNumber(r.efficiency * 100, 3)}` },
                  { label: 'Bant genişliği B = 2fm', value: formatSI(r.bandwidth, 'Hz') },
                  { label: 'Alt / üst yan bant', value: `${formatSI(r.lower, 'Hz', 5)} / ${formatSI(r.upper, 'Hz', 5)}` },
                ],
                warnings: r.overmodulated ? ['m > 1: aşırı modülasyon. Zarf bozulur, zarf dedektörüyle mesaj geri elde edilemez ve fazladan yan bantlar oluşur.'] : [],
                raw: r,
              };
            },
            diagram: (v, out) => (out ? barChart({
              title: 'Genlik spektrumu (taşıyıcıya göre)',
              bars: out.raw.spectrum.map((l, i) => ({ label: ['fc − fm', 'fc', 'fc + fm'][i], value: l.amp, tip: `${formatSI(l.f, 'Hz', 5)} · bağıl genlik ${formatNumber(l.amp, 3)}` })),
              xLabel: 'Frekans',
              yLabel: 'Bağıl genlik',
              yFormat: (y) => formatNumber(y, 2),
            }) : []),
            diagramTitle: 'Spektrum',
            formulas: [formula(String.raw`P_t = P_c\left(1 + \frac{m^2}{2}\right),\qquad \eta = \frac{m^2}{2 + m^2},\qquad B = 2f_m`, 'Pt = Pc·(1 + m²/2),  η = m²/(2 + m²),  B = 2fm')],
            notes: ['Çift yan bantlı, taşıyıcılı AM (DSB-FC) ve tek tonlu mesaj. m = 1’de bile gücün en fazla üçte biri yan bantlardadır.'],
          }),
        },
        {
          id: 'fm',
          label: 'FM',
          build: () => calculatorPanel({
            fields: [
              { key: 'df', label: 'Tepe frekans sapması Δf', name: 'Δf', value: '75', units: FREQUENCY_UNITS, unit: 'kHz' },
              { key: 'fm', label: 'Mesaj frekansı fm', name: 'fm', value: '15', units: FREQUENCY_UNITS, unit: 'kHz' },
            ],
            compute(v) {
              const r = fmModulation({ deviation: v.df, fm: v.fm });
              return {
                results: [
                  { label: 'Modülasyon indeksi β = Δf/fm', value: formatNumber(r.beta) },
                  { label: 'Carson bant genişliği', value: formatSI(r.carson, 'Hz') },
                  { label: '%1 ölçütüne göre bant genişliği', value: formatSI(r.bandwidth1pct, 'Hz') },
                  { label: 'Anlamlı yan bant çifti sayısı', value: String(r.sidebandPairs) },
                  { label: 'Taşıyıcıda kalan güç oranı J0²', value: `%${formatNumber(r.carrierPower * 100, 3)}` },
                  { label: 'Tür', value: r.narrowband ? 'dar bantlı FM (β < 0,3)' : 'geniş bantlı FM' },
                ],
                raw: r,
              };
            },
            diagram: (v, out) => {
              if (!out) return [];
              const lines = out.raw.lines;
              const bars = [...lines.slice(1).reverse().map((l) => ({ n: -l.n, j: l.j })), ...lines.map((l) => ({ n: l.n, j: l.j }))];
              return barChart({
                title: 'Genlik spektrumu |Jn(β)|',
                bars: bars.map((b) => ({ label: b.n === 0 ? 'fc' : String(b.n), value: Math.abs(b.j), tip: `fc ${b.n >= 0 ? '+' : '−'} ${Math.abs(b.n)}·fm · |J${Math.abs(b.n)}(β)| = ${formatNumber(Math.abs(b.j), 3)}` })),
                xLabel: 'Yan bant numarası n (fc + n·fm)',
                yLabel: '|Jn(β)|',
                yFormat: (y) => formatNumber(y, 2),
              });
            },
            diagramTitle: 'Spektrum',
            formulas: [formula(String.raw`\beta = \frac{\Delta f}{f_m},\qquad B_{\text{Carson}} \approx 2(\Delta f + f_m),\qquad s(t) = A_c\sum_{n} J_n(\beta)\cos\!\big(2\pi(f_c + nf_m)t\big)`,
              'β = Δf/fm,  B ≈ 2(Δf + fm),  s(t) = Ac·Σ Jn(β)·cos(2π(fc + n·fm)t)')],
            notes: [
              'Yan bant genlikleri birinci tür Bessel fonksiyonlarıdır (sayısal integralle hesaplanır). |Jn(β)| ≥ 0,01 olanlar anlamlı sayılır.',
              'Carson kuralı gücün yaklaşık %98’ini kapsar. FM yayıncılığında Δf = 75 kHz, fm = 15 kHz → β = 5, B ≈ 180 kHz.',
              'Bazı β değerlerinde (ör. 2,405) taşıyıcı tamamen kaybolur (J0 = 0).',
            ],
          }),
        },
      ],
    }));
  },
};
