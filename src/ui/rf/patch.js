import { calculatorView, calculatorPanel, verifyNote } from '../form.js';
import { formula } from '../formula.js';
import { FREQUENCY_UNITS, LENGTH_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { patchAntenna } from '../../calc/rf.js';
import { svg, figure, label, s } from '../schematic.js';

/** Üstten görünüş: yama, girintili besleme ve ölçüler (ölçekli). */
function patchDiagram(p) {
  if (!p) {
    return figure(svg([0, 0, 360, 240], 'Yama anten', s('text', { x: 180, y: 120, class: 'sch-text', 'text-anchor': 'middle' }, 'Girdileri düzeltin')));
  }
  const maxW = 220;
  const maxL = 150;
  const k = Math.min(maxW / p.w, maxL / p.l);
  const w = p.w * k;
  const l = p.l * k;
  const x0 = 180 - w / 2;
  const y0 = 30;
  const feedW = Math.max(6, w * 0.08);
  const gap = feedW * 0.6;
  const inset = p.inset ? p.inset * k : 0;
  const cx = 180;

  // Yama dış hatları, besleme hattının girdiği girinti dahil
  const path = [
    `M${x0},${y0}`, `H${x0 + w}`, `V${y0 + l}`,
    `H${cx + feedW / 2 + gap}`, `V${y0 + l - inset}`, `H${cx - feedW / 2 - gap}`, `V${y0 + l}`,
    `H${x0}`, 'Z',
  ].join('');

  return figure(svg([0, 0, 360, 250], 'Girintili beslemeli dikdörtgen yama anten, üstten görünüş',
    s('rect', { x: x0 - 22, y: y0 - 18, width: w + 44, height: l + 66, rx: 4, class: 'patch-ground' }),
    s('path', { d: path, class: 'patch-metal' }),
    s('rect', { x: cx - feedW / 2, y: y0 + l - inset, width: feedW, height: inset + 48, class: 'patch-metal' }),
    // W ölçüsü
    s('line', { x1: x0, y1: y0 - 8, x2: x0 + w, y2: y0 - 8, class: 'dim-line' }),
    label(cx, y0 - 13, `W = ${formatSI(p.w, 'm', 3)}`, '', { anchor: 'middle' }),
    // L ölçüsü
    s('line', { x1: x0 + w + 10, y1: y0, x2: x0 + w + 10, y2: y0 + l, class: 'dim-line' }),
    label(x0 + w + 16, y0 + l / 2, 'L', formatSI(p.l, 'm', 3)),
    p.inset ? label(x0 - 6, y0 + l - inset / 2, 'y₀', formatSI(p.inset, 'm', 3), { anchor: 'end' }) : null,
    label(cx + feedW / 2 + 6, y0 + l + 40, 'besleme', ''),
  ));
}

export default {
  id: 'rf/patch',
  title: 'Yama (patch) anten',
  render(container) {
    container.append(calculatorView({
      title: 'Dikdörtgen yama (patch) anten',
      intro: 'Rezonans frekansı ve alt tabakadan yama boyutları, kenar giriş direnci ve girintili besleme derinliği.',
      modes: [{
        id: 'design',
        label: 'Tasarım',
        build: () => calculatorPanel({
          fields: [
            { key: 'f', label: 'Rezonans frekansı f', name: 'Frekans', value: '2.45', units: FREQUENCY_UNITS, unit: 'GHz' },
            { key: 'er', label: 'Bağıl dielektrik sabiti εr', name: 'εr', value: '4.4', min: 1, hint: 'FR-4 ≈ 4,4 · RO4003C ≈ 3,55 · RT/duroid 5880 ≈ 2,2' },
            { key: 'h', label: 'Alt tabaka kalınlığı h', name: 'h', value: '1.6', units: LENGTH_UNITS, unit: 'mm' },
            { key: 'z0', label: 'Besleme hattı empedansı (Ω)', name: 'Z0', value: '50' },
          ],
          compute(v) {
            const p = patchAntenna(v);
            const warnings = [];
            if (p.hOverLambda > 0.05) warnings.push(`h/λ0 = ${formatNumber(p.hOverLambda, 3)}: alt tabaka kalın (h > 0,05λ0). Yüzey dalgaları artar, model doğruluğu düşer.`);
            if (p.hOverLambda < 0.003) warnings.push(`h/λ0 = ${formatNumber(p.hOverLambda, 3)}: alt tabaka çok ince (h < 0,003λ0). Bant genişliği ve verim çok düşük olur.`);
            if (!p.inset) warnings.push(`Hedef empedans (${formatNumber(v.z0, 3)} Ω) kenar direncinden büyük; girintili besleme ile uyumlanamaz.`);
            return {
              results: [
                { label: 'Yama genişliği W', value: formatSI(p.w, 'm') },
                { label: 'Yama uzunluğu L', value: formatSI(p.l, 'm') },
                { label: 'Etkin dielektrik sabiti εeff', value: formatNumber(p.eeff) },
                { label: 'Kenar uzaması ΔL', value: formatSI(p.dl, 'm') },
                { label: 'Kenar giriş direnci Rin(0)', value: formatSI(p.rEdge, 'Ω') },
                { label: `${formatNumber(v.z0, 3)} Ω için girinti y₀`, value: p.inset ? formatSI(p.inset, 'm') : '—' },
                { label: 'En küçük toprak düzlemi (L × W)', value: `${formatSI(p.groundL, 'm', 3)} × ${formatSI(p.groundW, 'm', 3)}` },
                { label: 'h / λ0', value: formatNumber(p.hOverLambda, 3) },
              ],
              warnings,
              raw: p,
            };
          },
          diagram: (v, out) => patchDiagram(out?.raw ?? null),
          diagramTitle: 'Yama (üstten, ölçekli)',
          formulas: [
            formula(String.raw`W = \frac{c}{2f}\sqrt{\frac{2}{\varepsilon_r+1}},\qquad \varepsilon_{\text{eff}} = \frac{\varepsilon_r+1}{2} + \frac{\varepsilon_r-1}{2}\left(1+12\frac{h}{W}\right)^{-1/2}`,
              'W = c/(2f)·√(2/(εr+1)),  εeff = (εr+1)/2 + (εr−1)/2·(1 + 12h/W)^(−1/2)'),
            formula(String.raw`\Delta L = 0.412\,h\,\frac{(\varepsilon_{\text{eff}}+0.3)(W/h+0.264)}{(\varepsilon_{\text{eff}}-0.258)(W/h+0.8)},\qquad L = \frac{c}{2f\sqrt{\varepsilon_{\text{eff}}}} - 2\Delta L`,
              'ΔL = 0,412h·(εeff+0,3)(W/h+0,264) / ((εeff−0,258)(W/h+0,8)),  L = c/(2f√εeff) − 2ΔL'),
            formula(String.raw`R_{in}(0) = \frac{1}{2(G_1+G_{12})},\qquad R_{in}(y_0) = R_{in}(0)\cos^2\!\left(\frac{\pi}{L}y_0\right)`,
              'Rin(0) = 1 / (2(G1 + G12)),  Rin(y0) = Rin(0)·cos²(π·y0/L)'),
          ],
          notes: [
            'İletim hattı modeli (Balanis, Antenna Theory, Böl. 14). Örnek 14.1–14.3 ile test edilmiştir: 10 GHz, εr = 2,2, h = 1,588 mm → W = 1,186 cm, L = 0,906 cm, Rin ≈ 228 Ω.',
            'G1 ve G12 yayılım yarıklarının iletkenlikleri sayısal integralle hesaplanır (Bessel J0 dahil).',
            'Model ince alt tabaka (0,003λ0 ≤ h ≤ 0,05λ0) ve kayıpsız dielektrik varsayar; sonuçlar genellikle birkaç % içinde doğrudur.',
            'Girinti genişliği ve besleme hattının genişliği hesaplanmaz; 50 Ω hat genişliği için “Mikroşerit hat” hesaplayıcısını kullanın.',
            verifyNote('Toprak düzlemi için L + 6h, W + 6h kuralı yaygın bir başparmak kuralıdır; kenar etkileri için daha büyük düzlem önerilir.'),
            'Üretimden önce tasarımı bir EM benzetimiyle (ör. openEMS, CST, HFSS) doğrulayın; FR-4’ün εr değeri frekansa ve üreticiye göre değişir.',
          ],
        }),
      }],
    }));
  },
};
