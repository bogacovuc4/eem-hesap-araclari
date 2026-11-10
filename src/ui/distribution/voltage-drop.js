import { el } from '../dom.js';
import { calculatorView, calculatorPanel, numberField, verifyNote } from '../form.js';
import { formula } from '../formula.js';
import { VOLTAGE_UNITS, POWER_UNITS, DISTANCE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { voltageDrop, distributedLine, parseLoads } from '../../calc/distribution.js';
import { STANDARD_SECTIONS } from '../../calc/circuit2.js';
import { textField, selectField, outputCard, codeLayout, wideCard, notesCard } from '../codes/common.js';
import { svg, figure, twoTerminal, wire, dot, label, s, fmt } from '../schematic.js';
import { lineChart, barChart } from '../chart.js';

const mm2 = (a) => `${formatNumber(a, 4)} mm²`;
const pct = (p, digits = 3) => `%${formatNumber(p, digits)}`;

const COMMON_NOTES = [
  'Türk ders kitaplarında iletkenlik k: bakır 56, alüminyum 35 m/(Ω·mm²) alınır (≈ 20 °C). Çalışma sıcaklığında direnç daha yüksektir.',
  verifyNote('Sınır değerler yönetmeliğe göre değişir. Sık kullanılan değerler: iç tesisatta aydınlatma %1,5, motor ve diğer yükler %3; dağıtım şebekesinde AG için %5 civarı. Uygulamada güncel yönetmeliği kontrol edin.'),
  'Kablo reaktansı x tipik olarak 0,07–0,1 Ω/km’dir (AG kablo); havai hatta 0,3–0,4 Ω/km. Küçük kesitlerde etkisi ihmal edilebilir, büyük kesitlerde belirleyicidir.',
  'Bu hesap yalnızca gerilim düşümüne göredir; kesit ayrıca akım taşıma kapasitesine ve koruma elemanına göre kontrol edilmelidir.',
];

function singleFigure(v, r) {
  const yTop = 40;
  const yBot = 150;
  return figure(svg([-10, -6, 430, 200], 'Tek yüklü hat: kaynak, hat empedansı ve yük',
    twoTerminal('ac', [30, yBot], [30, yTop]),
    wire([30, yTop], [80, yTop]),
    twoTerminal('resistor', [80, yTop], [180, yTop]),
    twoTerminal('inductor', [180, yTop], [280, yTop]),
    wire([280, yTop], [340, yTop]),
    twoTerminal('resistor', [340, yTop], [340, yBot]),
    wire([340, yBot], [30, yBot]),
    dot(340, yTop), dot(340, yBot),
    label(52, 92, 'U', fmt(v.u, 'V')),
    label(130, yTop - 32, 'R hat', r ? fmt(r.r, 'Ω') : '', { anchor: 'middle' }),
    label(230, yTop - 32, 'X hat', r ? fmt(r.x, 'Ω') : '', { anchor: 'middle' }),
    label(356, 100, 'P', fmt(v.p, 'W')),
    label(356, 136, 'cos φ', Number.isFinite(v.pf) ? formatNumber(v.pf, 3) : ''),
    label(185, yBot + 22, 'L', fmt(v.len, 'm'), { anchor: 'middle' }),
    label(356, 64, 'U son', r ? fmt(r.endVoltage, 'V') : '', { unknown: true }),
  ), 'Hat tek iletkenle gösterildi; formül dönüş iletkenini de hesaba katar.');
}

function sectionChart(v, system) {
  const rows = STANDARD_SECTIONS.filter((a) => a >= 1.5 && a <= 300).map((a) => ({
    a, r: voltageDrop({ system, p: v.p, u: v.u, pf: v.pf, length: v.len, area: a, k: v.k, x: v.x }),
  }));
  return barChart({
    title: 'Standart kesitlere göre gerilim düşümü',
    bars: rows.map(({ a, r }) => ({ label: String(a).replace('.', ','), value: r.dropPct, tip: `${String(a).replace('.', ',')} mm² · ${pct(r.dropPct)} · ${formatSI(r.dropV, 'V', 3)}` })),
    xLabel: 'Kesit (mm²)',
    yLabel: 'Düşüm (%)',
    yFormat: (y) => formatNumber(y, 2),
  });
}

function singlePanel(system) {
  const three = system === '3ph';
  return calculatorPanel({
    fields: [
      { key: 'p', label: 'Yük gücü P', name: 'P', value: three ? '20' : '3', units: POWER_UNITS, unit: 'kW' },
      { key: 'u', label: three ? 'Hat (faz–faz) gerilimi U' : 'Faz–nötr gerilimi U', name: 'U', value: three ? '400' : '230', units: VOLTAGE_UNITS, unit: 'V' },
      { key: 'pf', label: 'Güç faktörü cos φ', name: 'cos φ', value: three ? '0.8' : '1', max: 1 },
      { key: 'len', label: 'Hat uzunluğu L (tek yön)', name: 'L', value: three ? '100' : '30', units: DISTANCE_UNITS, unit: 'm' },
      { key: 'a', label: 'İletken kesiti S (mm²)', name: 'S', value: three ? '10' : '2.5' },
      { key: 'k', label: 'İletkenlik k (m/Ω·mm²)', name: 'k', value: '56', hint: 'Bakır 56 · alüminyum 35' },
      { key: 'x', label: 'Hat reaktansı x (Ω/km)', name: 'x', value: three ? '0.08' : '0', constraint: 'nonnegative', hint: '0 girilirse reaktans ihmal edilir' },
      { key: 'e', label: 'İzin verilen düşüm (%)', name: 'Sınır', value: three ? '3' : '1.5', max: 99 },
    ],
    compute(v) {
      const r = voltageDrop({ system, p: v.p, u: v.u, pf: v.pf, length: v.len, area: v.a, k: v.k, x: v.x, allowedPct: v.e });
      const warnings = [];
      if (r.dropPct > v.e) warnings.push(`Gerilim düşümü (${pct(r.dropPct)}) izin verilen %${formatNumber(v.e, 3)} sınırını aşıyor: kesiti büyütün${r.standard ? ` (en az ${String(r.standard).replace('.', ',')} mm²)` : ''} ya da hattı kısaltın.`);
      if (r.requiredArea === null) warnings.push('Hat reaktansındaki düşüm tek başına sınırı aşıyor: kesit büyütmek yetmez, gerilimi yükseltin ya da hattı bölün.');
      else if (r.standard === null) warnings.push('Gereken kesit en büyük standart kesitten büyük: paralel kablo kullanın.');
      return {
        results: [
          { label: 'Gerilim düşümü %e', value: pct(r.dropPct) },
          { label: 'Gerilim düşümü ΔU', value: formatSI(r.dropV, 'V') },
          { label: 'Yük ucundaki gerilim', value: formatSI(r.endVoltage, 'V') },
          { label: 'Hat akımı I', value: formatSI(r.current, 'A') },
          { label: 'Reaktans ihmal edilince %e', value: pct(r.simplePct) },
          { label: 'Hat kaybı', value: `${formatSI(r.loss, 'W')} (${pct(r.lossPct)})` },
          { label: `%${formatNumber(v.e, 3)} için gereken kesit`, value: r.requiredArea !== null ? `${mm2(r.requiredArea)} → ${r.standard !== null ? `${String(r.standard).replace('.', ',')} mm²` : '—'}` : '—' },
          { label: 'Yük momenti L·P', value: `${formatNumber(r.moment / 1000, 4)} kW·m` },
        ],
        warnings,
        raw: r,
      };
    },
    diagram: (v, out) => (out ? [singleFigure(v, out.raw), sectionChart(v, system)] : singleFigure(v, null)),
    diagramTitle: 'Hat ve kesit karşılaştırması',
    formulas: three
      ? [
        formula(String.raw`\%e = \frac{100\,L\,P}{k\,S\,U^2}\quad(\text{reaktans ihmal})`, '%e = 100·L·P / (k·S·U²)'),
        formula(String.raw`\Delta U = \sqrt3\,I\,L\,(R'\cos\varphi + X'\sin\varphi),\qquad I = \frac{P}{\sqrt3\,U\cos\varphi}`, 'ΔU = √3·I·L·(R′cos φ + X′sin φ),  I = P/(√3·U·cos φ)'),
      ]
      : [
        formula(String.raw`\%e = \frac{200\,L\,P}{k\,S\,U^2}\quad(\text{reaktans ihmal})`, '%e = 200·L·P / (k·S·U²)'),
        formula(String.raw`\Delta U = 2\,I\,L\,(R'\cos\varphi + X'\sin\varphi),\qquad I = \frac{P}{U\cos\varphi}`, 'ΔU = 2·I·L·(R′cos φ + X′sin φ),  I = P/(U·cos φ)'),
      ],
    notes: [
      'R′ = 1/(k·S) ve X′ hattın metre başına direnç ve reaktansıdır. Formül gerilim düşümünün boyuna bileşenidir (kısa AG hatlarında geçerli yaklaşım).',
      ...COMMON_NOTES,
    ],
  });
}

function lineFigure(loads, area) {
  const W = 420;
  const x0 = 40;
  const x1 = W - 30;
  const y = 50;
  const maxD = Math.max(...loads.map((l) => l.d));
  const pos = (d) => x0 + ((x1 - x0) * d) / maxD;
  const sorted = [...loads].sort((a, b) => a.d - b.d);
  return figure(svg([0, 0, W, 130], 'Tek uçtan beslenen çok yüklü dağıtım hattı',
    s('rect', { x: 10, y: y - 16, width: 30, height: 32, class: 'sch-line', fill: 'none' }),
    label(25, y + 4, '~', '', { anchor: 'middle' }),
    wire([x0, y], [x1, y]),
    ...sorted.flatMap((l, i) => {
      const x = pos(l.d);
      return [
        dot(x, y),
        wire([x, y], [x, y + 30]),
        s('polygon', { points: `${x - 5},${y + 26} ${x + 5},${y + 26} ${x},${y + 36}`, class: 'sch-fill' }),
        label(x, y + 52 + (i % 2) * 16, `${formatNumber(l.p / 1000, 3)} kW`, '', { anchor: 'middle' }),
        label(x, y - 8, `${formatNumber(l.d, 4)} m`, '', { anchor: 'middle' }),
      ];
    }),
  ), `Kesit S = ${formatNumber(area, 4)} mm² boyunca sabit. Mesafeler kaynaktan ölçülür; oklar yükleri gösterir.`);
}

function linePanel() {
  const system = selectField({
    label: 'Sistem',
    options: [{ value: '3ph', text: 'Üç faz' }, { value: '1ph', text: 'Tek faz' }],
    value: '3ph',
    param: 's',
  });
  const u = numberField({ key: 'u', label: 'Gerilim U (üç fazda faz–faz)', name: 'U', value: '400', units: VOLTAGE_UNITS, unit: 'V' });
  const pf = numberField({ key: 'pf', label: 'Güç faktörü cos φ (tüm yükler)', name: 'cos φ', value: '0.9', max: 1 });
  const area = numberField({ key: 'a', label: 'İletken kesiti S (mm²)', name: 'S', value: '35' });
  const k = numberField({ key: 'k', label: 'İletkenlik k (m/Ω·mm²)', name: 'k', value: '56', hint: 'Bakır 56 · alüminyum 35' });
  const x = numberField({ key: 'x', label: 'Hat reaktansı x (Ω/km)', name: 'x', value: '0.08', constraint: 'nonnegative' });
  const allowed = numberField({ key: 'e', label: 'İzin verilen düşüm (%)', name: 'Sınır', value: '5', max: 99 });
  const loads = textField({
    label: 'Yükler (mesafe m : güç kW)',
    value: '40:8; 90:12; 150:6; 220:10',
    placeholder: 'ör. 40:8; 90:12',
    hint: 'Her yük “kaynağa uzaklık:güç”; noktalı virgülle ayırın',
    param: 'y',
  });
  const output = outputCard();
  const visual = el('div', {});
  const table = el('div', {});

  function update() {
    try {
      const vals = {};
      for (const [key, f] of Object.entries({ u, pf, area, k, x, allowed })) {
        const r = f.read();
        if (r.error) throw new RangeError(r.error);
        vals[key] = r.value;
      }
      const list = parseLoads(loads.value);
      loads.setInvalid(false);
      const r = distributedLine({
        system: system.value, u: vals.u, pf: vals.pf, area: vals.area, k: vals.k, x: vals.x, loads: list, allowedPct: vals.allowed,
      });
      const warnings = [];
      if (r.maxDropPct > vals.allowed) warnings.push(`Hat sonundaki düşüm (${pct(r.maxDropPct)}) %${formatNumber(vals.allowed, 3)} sınırını aşıyor${r.standard ? `: en az ${String(r.standard).replace('.', ',')} mm² gerekir` : ''}.`);
      if (r.requiredArea === null) warnings.push('Reaktanstaki düşüm tek başına sınırı aşıyor: kesit büyütmek yetmez.');
      output.show({
        rows: [
          { label: 'Hat sonunda gerilim düşümü', value: `${pct(r.maxDropPct)} (${formatSI(r.maxDropV, 'V')})` },
          { label: 'Toplam yük / besleme akımı', value: `${formatSI(r.totalP, 'W')} / ${formatSI(r.feederCurrent, 'A')}` },
          { label: 'Toplam yük momenti ΣL·P', value: `${formatNumber(r.moment / 1000, 5)} kW·m` },
          { label: 'Reaktans ihmal edilince %e', value: pct(r.simplePct) },
          { label: 'Hat kaybı', value: `${formatSI(r.loss, 'W')} (${pct(r.lossPct)})` },
          { label: `%${formatNumber(vals.allowed, 3)} için gereken kesit`, value: r.requiredArea !== null ? `${mm2(r.requiredArea)} → ${r.standard !== null ? `${String(r.standard).replace('.', ',')} mm²` : '—'}` : '—' },
        ],
        warnings,
      });
      visual.replaceChildren(
        lineFigure(list, vals.area),
        lineChart({
          title: 'Hat boyunca gerilim düşümü',
          points: r.points.map((p) => ({ x: p.d, y: p.dropPct })),
          reference: [{ x: 0, y: vals.allowed }, { x: r.length, y: vals.allowed }],
          labels: ['%e', 'izin verilen'],
          xLabel: 'Kaynağa uzaklık (m)',
          yLabel: 'Düşüm (%)',
          xFormat: (d) => `${formatNumber(d, 4)} m`,
          yFormat: (y, precise) => `%${formatNumber(y, precise ? 4 : 2)}`,
          marker: { x: r.length, y: r.maxDropPct },
        }),
      );
      table.replaceChildren(el('table', { class: 'data-table' },
        el('thead', {}, el('tr', {}, ...['Bölüm', 'Taşınan güç', 'Akım', 'Uçtaki düşüm'].map((h) => el('th', {}, h)))),
        el('tbody', {}, ...r.segments.map((sg, i) => el('tr', {},
          el('td', {}, `${formatNumber(sg.from, 4)}–${formatNumber(sg.to, 4)} m`),
          el('td', {}, formatSI(sg.power, 'W')),
          el('td', {}, formatSI(sg.current, 'A')),
          el('td', {}, pct(r.points[i + 1].dropPct)))))));
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      if (/mesafe|yük|okunamadı/i.test(err.message)) loads.setInvalid(true, err.message);
      output.show({ errors: [err.message] });
      visual.replaceChildren();
      table.replaceChildren();
    }
  }

  for (const f of [system, u, pf, area, k, x, allowed, loads]) f.onChange(update);
  update();

  return codeLayout({
    visual,
    visualTitle: 'Dağıtım hattı',
    inputs: [system.element, loads.element, u.element, pf.element, area.element, k.element, x.element, allowed.element],
    output,
    extra: [
      wideCard('Bölümler', table),
      wideCard('Formül', formula(String.raw`\%e = \frac{100}{k\,S\,U^2}\sum_i L_i P_i\quad(\text{üç faz, reaktans ihmal})`, '%e = 100·Σ(Li·Pi) / (k·S·U²)')),
      notesCard([
        'Tek uçtan beslenen, boyunca aynı kesitli dal hattı. Her bölümden, o noktadan sonraki yüklerin toplam akımı geçer; düşüm bölümlerin katkılarının toplamıdır.',
        'Reaktans ihmal edilince uçtaki düşüm yük momentlerinin toplamıyla (ΣLi·Pi) bulunur; tek fazda katsayı 200’dür.',
        'Tüm yüklerde aynı güç faktörü varsayılır. İki uçtan beslenen ya da ring hatlar bu sürümde yok.',
        ...COMMON_NOTES,
      ]),
    ],
  });
}

export default {
  id: 'distribution/voltage-drop',
  title: 'Gerilim düşümü',
  render(container) {
    container.append(calculatorView({
      title: 'Gerilim düşümü',
      intro: 'Tek ve üç fazlı hatlarda yüzde gerilim düşümü, hat kaybı, gereken kesit; çok yüklü dağıtım hattında yük momentleri.',
      modes: [
        { id: '3ph', label: 'Üç faz', build: () => singlePanel('3ph') },
        { id: '1ph', label: 'Tek faz', build: () => singlePanel('1ph') },
        { id: 'line', label: 'Çok yüklü hat', build: linePanel },
      ],
    }));
  },
};
