import { calculatorView, calculatorPanel, verifyNote } from '../form.js';
import { formula } from '../formula.js';
import { VOLTAGE_UNITS, RESISTANCE_UNITS, CAPACITANCE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { commonSource } from '../../calc/analog.js';
import { svg, figure, twoTerminal, wire, ground, dot, terminal, label, fmt } from '../schematic.js';
import { lineChart } from '../chart.js';
import { nmos } from './symbols.js';

const REGION = { saturation: 'doyma (kuvvetlendirici)', triode: 'doğrusal (triyot)', cutoff: 'kesim' };

function schematic(v, r) {
  const gx = 60;
  const gy = 160;
  const dx = gx + 30;
  return figure(svg([-10, -6, 330, 260], 'Direnç yüklü ortak kaynaklı kuvvetlendirici',
    wire([dx - 40, 20], [dx + 40, 20]),
    label(dx, 12, 'VDD', fmt(v.vdd, 'V'), { anchor: 'middle' }),
    twoTerminal('resistor', [dx, 20], [dx, gy - 30 - 20]),
    wire([dx, gy - 50], [dx, gy - 30]),
    dot(dx, gy - 50),
    wire([dx, gy - 50], [dx + 90, gy - 50]),
    terminal(dx + 90, gy - 50),
    nmos(gx, gy),
    terminal(gx, gy),
    ground(dx, gy + 30),
    label(dx + 14, 64, 'RD', fmt(v.rd, 'Ω')),
    label(gx - 10, gy + 4, 'VGS', fmt(v.vgs, 'V'), { anchor: 'end' }),
    label(dx + 100, gy - 46, 'Vout', r ? fmt(r.vout, 'V') : ''),
    label(dx + 40, gy + 8, 'M1', `W/L = ${Number.isFinite(v.wl) ? formatNumber(v.wl, 3) : '?'}`),
    r ? label(dx + 100, gy - 10, 'Av', `${formatNumber(r.gain, 3)} V/V`, { unknown: true }) : null,
  ), 'Kapıya DC polarma (VGS) üstüne küçük işaret uygulanır; çıkış savaktan alınır.');
}

function transferChart(v, r) {
  const pts = [];
  for (let i = 0; i <= 200; i += 1) {
    const vgs = (v.vdd * i) / 200;
    pts.push({ x: vgs, y: commonSource({ ...v, k: v.k * 1e-6, vgs, cl: 0 }).vout });
  }
  return lineChart({
    title: 'Giriş–çıkış (geçiş) karakteristiği',
    points: pts,
    xLabel: 'VGS (V)',
    yLabel: 'Vout (V)',
    xFormat: (x) => formatSI(x, 'V', 2),
    yFormat: (y, precise) => formatSI(y, 'V', precise ? 4 : 2),
    marker: { x: v.vgs, y: r.vout },
    refs: [{ x: v.vth, label: 'VTH' }],
  });
}

export default {
  id: 'analog/common-source',
  title: 'Ortak kaynaklı kuvvetlendirici',
  render(container) {
    container.append(calculatorView({
      title: 'Ortak kaynaklı (CS) kuvvetlendirici',
      intro: 'Direnç yüklü tek transistörlü kuvvetlendiricinin çalışma noktası, gerilim kazancı, çıkış direnci ve bant genişliği.',
      modes: [{
        id: 'rd',
        label: 'Direnç yükü',
        build: () => calculatorPanel({
          fields: [
            { key: 'vdd', label: 'Besleme VDD', name: 'VDD', value: '1.8', units: VOLTAGE_UNITS, unit: 'V' },
            { key: 'rd', label: 'Yük direnci RD', name: 'RD', value: '5', units: RESISTANCE_UNITS, unit: 'kΩ' },
            { key: 'vgs', label: 'Kapı polarması VGS', name: 'VGS', value: '0.8', units: VOLTAGE_UNITS, unit: 'V', constraint: 'nonnegative' },
            { key: 'k', label: 'μnCox (µA/V²)', name: 'μCox', value: '200' },
            { key: 'wl', label: 'W/L', name: 'W/L', value: '10' },
            { key: 'vth', label: 'VTH', name: 'VTH', value: '0.45', units: VOLTAGE_UNITS, unit: 'V', constraint: 'nonnegative' },
            { key: 'lambda', label: 'λ (1/V)', name: 'λ', value: '0.1', constraint: 'nonnegative' },
            { key: 'cl', label: 'Yük kapasitesi CL', name: 'CL', value: '1', units: CAPACITANCE_UNITS, unit: 'pF', constraint: 'nonnegative', hint: '0 girilirse bant genişliği hesaplanmaz' },
          ],
          compute(v) {
            const r = commonSource({ ...v, k: v.k * 1e-6 });
            const warnings = [];
            if (r.region === 'cutoff') warnings.push('VGS ≤ VTH: transistör kesimde, çıkış VDD’de ve kazanç yok.');
            if (r.region === 'triode') warnings.push('Transistör doğrusal bölgede (Vout < VOV): kazanç çok düşer. RD’yi ya da VGS’yi küçültün.');
            if (r.region === 'saturation' && (r.vout - r.vov < 0.15 || v.vdd - r.vout < 0.15)) warnings.push('Çalışma noktası salınım sınırına yakın: büyük işaretlerde çıkış kırpılır. Vout’u VOV ile VDD’nin ortasına yaklaştırın.');
            const res = [
              { label: 'Gerilim kazancı Av', value: r.region === 'cutoff' ? '0' : `${formatNumber(r.gain, 4)} V/V (${formatNumber(r.gainDb, 3)} dB)` },
              { label: 'Çalışma bölgesi', value: REGION[r.region] },
              { label: 'Savak akımı ID', value: formatSI(r.id, 'A') },
              { label: 'Çıkış DC gerilimi Vout', value: formatSI(r.vout, 'V') },
            ];
            if (r.region !== 'cutoff') {
              res.push(
                { label: 'gm / ro', value: `${formatSI(r.gm, 'S')} / ${Number.isFinite(r.ro) ? formatSI(r.ro, 'Ω') : '∞'}` },
                { label: 'Çıkış direnci RD ∥ ro', value: formatSI(r.rout, 'Ω') },
                { label: 'Çıkış salınımı (doymada)', value: `${formatSI(r.swingMin, 'V', 3)} … ${formatSI(r.swingMax, 'V', 3)}` },
                { label: 'Güç tüketimi', value: formatSI(r.power, 'W') },
              );
              if (r.f3db) res.push({ label: '−3 dB bant genişliği / GBW', value: `${formatSI(r.f3db, 'Hz')} / ${formatSI(r.gbw, 'Hz')}` });
            }
            return { results: res, warnings, raw: r };
          },
          diagram: (v, out) => (out ? [schematic(v, out.raw), transferChart(v, out.raw)] : schematic(v, null)),
          diagramTitle: 'Devre ve geçiş eğrisi',
          formulas: [
            formula(String.raw`A_v = -g_m\,(R_D \parallel r_o),\qquad R_{out} = R_D \parallel r_o,\qquad f_{-3dB} = \frac{1}{2\pi R_{out}C_L}`,
              'Av = −gm·(RD ∥ ro),  Rout = RD ∥ ro,  f−3dB = 1/(2π·Rout·CL)'),
          ],
          notes: [
            'Kazanç negatiftir: çıkış girişe göre 180° fazdadır. Geçiş eğrisinde eğimin en dik olduğu bölge kuvvetlendirme bölgesidir.',
            'Bant genişliği yalnızca çıkış düğümündeki tek kutupla hesaplanır; Miller etkisi (CGD) ve giriş kutbu ihmal edilir.',
            'Kazancı artırmak için RD büyütülür; ama DC gerilim düşümü (ID·RD) salınımı azaltır. Bu yüzden tümdevrelerde direnç yerine akım kaynağı (aktif yük) kullanılır.',
            verifyNote('Kare yasası modeli ve örnek süreç değerleri kullanılmıştır; benzetimle doğrulayın.'),
          ],
        }),
      }],
    }));
  },
};
