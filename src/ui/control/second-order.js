import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber } from '../../calc/units.js';
import { secondOrderStep, secondOrderMetrics } from '../../calc/signals.js';
import { lineChart } from '../chart.js';

const TYPES = { underdamped: 'az sönümlü (0 < ζ < 1)', critical: 'kritik sönümlü (ζ = 1)', overdamped: 'aşırı sönümlü (ζ > 1)' };

const poleText = (p) => `${formatNumber(p.re, 4)}${p.im ? ` ${p.im < 0 ? '−' : '+'} j${formatNumber(Math.abs(p.im), 4)}` : ''}`;

export default {
  id: 'control/second-order',
  title: 'İkinci derece sistem',
  render(container) {
    container.append(calculatorView({
      title: 'İkinci derece sistem — basamak yanıtı',
      intro: 'Sönüm oranı ve doğal frekanstan aşım, yükselme, tepe ve yerleşme süreleri; kutuplar ve yanıt grafiği.',
      modes: [{
        id: 'step',
        label: 'Basamak yanıtı',
        build: () => calculatorPanel({
          fields: [
            { key: 'zeta', label: 'Sönüm oranı ζ', name: 'ζ', value: '0.5', hint: '0 < ζ < 1 az sönümlü · ζ = 1 kritik · ζ > 1 aşırı sönümlü' },
            { key: 'wn', label: 'Doğal frekans ωn (rad/s)', name: 'ωn', value: '10', hint: 'fn (Hz) biliniyorsa ωn = 2π·fn' },
          ],
          compute(v) {
            const m = secondOrderMetrics(v);
            return {
              results: [
                { label: 'Yüzde aşım Mp', value: `%${formatNumber(m.overshoot * 100, 4)}` },
                { label: 'Yerleşme süresi (±%2)', value: formatSI(m.settlingTime, 's') },
                { label: 'Yükselme süresi (%10 → %90)', value: m.riseTime !== null ? formatSI(m.riseTime, 's') : '—' },
                { label: 'Tepe zamanı tp', value: m.tPeak !== null ? formatSI(m.tPeak, 's') : '— (aşım yok)' },
                { label: 'Sönümlü frekans ωd', value: m.wd ? `${formatNumber(m.wd)} rad/s` : '—' },
                { label: 'Sistem tipi', value: TYPES[m.type] },
                { label: 'Kutuplar', value: m.poles.map(poleText).join(' ; ') },
                { label: 'Yaklaşık yerleşme 4/(ζωn)', value: formatSI(m.settlingApprox, 's') },
              ],
              raw: m,
            };
          },
          diagram: (v, out) => {
            if (!out) return [];
            const m = out.raw;
            const tEnd = Math.min(m.tEnd, Math.max(1.5 * m.settlingTime, m.tPeak ? 3 * m.tPeak : 0));
            const pts = [];
            for (let i = 0; i <= 500; i += 1) {
              const t = (tEnd * i) / 500;
              pts.push({ x: t, y: secondOrderStep(t, v) });
            }
            const refs = [{ x: m.settlingTime, label: 'ts' }];
            if (m.tPeak) refs.push({ x: m.tPeak, label: 'tp' });
            return lineChart({
              title: 'Birim basamak yanıtı y(t)',
              points: pts,
              reference: pts.map((p) => ({ x: p.x, y: 1 })),
              labels: ['y(t)', 'son değer (1)'],
              xLabel: 'Zaman (s)',
              yLabel: 'y(t)',
              xFormat: (x) => formatSI(x, 's', 2),
              yFormat: (y, precise) => formatNumber(y, precise ? 4 : 2),
              marker: m.tPeak ? { x: m.tPeak, y: 1 + m.overshoot } : null,
              refs,
            });
          },
          diagramTitle: 'Yanıt',
          formulas: [
            formula(String.raw`G(s) = \frac{\omega_n^2}{s^2 + 2\zeta\omega_n s + \omega_n^2},\qquad M_p = e^{-\zeta\pi/\sqrt{1-\zeta^2}},\qquad t_p = \frac{\pi}{\omega_d},\ \ \omega_d = \omega_n\sqrt{1-\zeta^2}`,
              'G(s) = ωn²/(s² + 2ζωn·s + ωn²),  Mp = e^(−ζπ/√(1−ζ²)),  tp = π/ωd,  ωd = ωn·√(1−ζ²)'),
          ],
          notes: [
            'Aşım ve tepe zamanı analitik; yükselme ve yerleşme süreleri yanıt sayısal taranarak bulunur (ders kitaplarındaki 4/(ζωn) yaklaşımı ayrıca verilir).',
            'Sıfırı olmayan, birim DC kazançlı standart ikinci derece sistem varsayılır. Ek kutup ya da sıfır yanıtı değiştirir.',
            'Tasarımda sık hedef: %5–%10 aşım için ζ ≈ 0,6–0,7.',
          ],
        }),
      }],
    }));
  },
};
