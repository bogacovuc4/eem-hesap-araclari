// Basit, bağımlılıksız SVG grafikleri (tek seri): çizgi ve çubuk.
// Kurallar (dataviz): tek eksen, ince işaretler (2 px çizgi, 4 px yuvarlatılmış çubuk ucu,
// çubuklar arası 2 px boşluk), sönük ızgara, üzerine gelince ipucu, tablo görünümü.
import { el } from './dom.js';
import { s } from './schematic.js';

const W = 640;
const H = 260;
const PAD = { top: 16, right: 18, bottom: 44, left: 64 };

/** 0'dan başlayan ya da veriyi kapsayan "güzel" tık değerleri. */
function niceTicks(min, max, count = 5) {
  if (min === max) { max = min + 1; }
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

function frame({ xTicks, yTicks, xScale, yScale, xFormat, yFormat, xLabel, yLabel }) {
  const g = s('g', {});
  for (const t of yTicks) {
    const y = yScale(t);
    g.append(
      s('line', { x1: PAD.left, x2: W - PAD.right, y1: y, y2: y, class: 'chart-grid' }),
      s('text', { x: PAD.left - 8, y, class: 'chart-tick', 'text-anchor': 'end', 'dominant-baseline': 'middle' }, yFormat(t)),
    );
  }
  for (const t of xTicks) {
    g.append(s('text', { x: xScale(t), y: H - PAD.bottom + 16, class: 'chart-tick', 'text-anchor': 'middle' }, xFormat(t)));
  }
  g.append(
    s('line', { x1: PAD.left, x2: W - PAD.right, y1: H - PAD.bottom, y2: H - PAD.bottom, class: 'chart-axis' }),
    s('text', { x: (PAD.left + W - PAD.right) / 2, y: H - 6, class: 'chart-label', 'text-anchor': 'middle' }, xLabel),
    s('text', { x: 14, y: (PAD.top + H - PAD.bottom) / 2, class: 'chart-label', 'text-anchor': 'middle', transform: `rotate(-90 14 ${(PAD.top + H - PAD.bottom) / 2})` }, yLabel),
  );
  return g;
}

function tableView(caption, headers, rows) {
  return el('details', { class: 'chart-table' },
    el('summary', {}, 'Tablo olarak göster'),
    el('div', { class: 'table-wrap' },
      el('table', { class: 'data-table data-table-compact' },
        el('caption', { class: 'visually-hidden' }, caption),
        el('thead', {}, el('tr', {}, ...headers.map((h) => el('th', {}, h)))),
        el('tbody', {}, ...rows.map((r) => el('tr', {}, ...r.map((c) => el('td', {}, c))))))));
}

/**
 * Çizgi grafiği. points: [{x, y}] (x artan), marker: {x, y} (vurgulanan nokta),
 * refs: [{x, label}] dikey referans çizgileri (ör. τ, 5τ).
 */
export function lineChart({ title, points, xLabel, yLabel, xFormat, yFormat, marker = null, refs = [], tableRows = null, tableHeaders = null }) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yTicks = niceTicks(Math.min(0, ...ys), Math.max(0, ...ys));
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];
  const xScale = (x) => PAD.left + ((x - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right);
  const yScale = (y) => H - PAD.bottom - ((y - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
  const xTicks = niceTicks(xMin, xMax, 6).filter((t) => t >= xMin - 1e-12 && t <= xMax + 1e-12);

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${xScale(p.x).toFixed(2)},${yScale(p.y).toFixed(2)}`).join('');
  const cross = s('line', { y1: PAD.top, y2: H - PAD.bottom, class: 'chart-cross', visibility: 'hidden' });
  const hoverDot = s('circle', { r: 5, class: 'chart-dot', visibility: 'hidden' });
  const tip = el('div', { class: 'chart-tip', hidden: true });

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img', 'aria-label': title },
    s('title', {}, title),
    frame({ xTicks, yTicks, xScale, yScale, xFormat, yFormat, xLabel, yLabel }),
    ...refs.filter((r) => r.x >= xMin && r.x <= xMax).map((r) => s('g', {},
      s('line', { x1: xScale(r.x), x2: xScale(r.x), y1: PAD.top, y2: H - PAD.bottom, class: 'chart-ref' }),
      s('text', { x: xScale(r.x) + 4, y: PAD.top + 10, class: 'chart-ref-label' }, r.label))),
    s('path', { d: path, class: 'chart-line' }),
    marker ? s('circle', { cx: xScale(marker.x), cy: yScale(marker.y), r: 5, class: 'chart-marker' }) : null,
    cross, hoverDot,
    s('rect', { x: PAD.left, y: PAD.top, width: W - PAD.left - PAD.right, height: H - PAD.top - PAD.bottom, class: 'chart-hit' }),
  );

  const box = el('div', { class: 'chart' }, svg, tip);

  function hide() {
    cross.setAttribute('visibility', 'hidden');
    hoverDot.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  }
  svg.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    const xv = xMin + ((sx - PAD.left) / (W - PAD.left - PAD.right)) * (xMax - xMin);
    if (xv < xMin || xv > xMax) { hide(); return; }
    let best = points[0];
    for (const p of points) if (Math.abs(p.x - xv) < Math.abs(best.x - xv)) best = p;
    const cx = xScale(best.x);
    const cy = yScale(best.y);
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
    hoverDot.setAttribute('cx', cx); hoverDot.setAttribute('cy', cy); hoverDot.setAttribute('visibility', 'visible');
    tip.textContent = `${xLabel.split(' (')[0]}: ${xFormat(best.x, true)} · ${yLabel.split(' (')[0]}: ${yFormat(best.y, true)}`;
    tip.hidden = false;
    tip.style.left = `${(cx / W) * 100}%`;
    tip.style.top = `${(cy / H) * 100}%`;
  });
  svg.addEventListener('pointerleave', hide);

  return el('figure', { class: 'chart-figure' },
    el('figcaption', { class: 'chart-title' }, title),
    box,
    tableRows ? tableView(title, tableHeaders, tableRows) : null);
}

/**
 * Çubuk grafiği. bars: [{ label, value, tip }] — label x ekseninde, tip ipucu metni.
 */
export function barChart({ title, bars, xLabel, yLabel, yFormat, tableRows = null, tableHeaders = null }) {
  const yTicks = niceTicks(0, Math.max(...bars.map((b) => b.value), 0));
  const yMax = yTicks[yTicks.length - 1] || 1;
  const n = bars.length;
  const slot = (W - PAD.left - PAD.right) / n;
  const gap = 2;
  const barW = Math.max(2, slot - gap);
  const yScale = (y) => H - PAD.bottom - (y / yMax) * (H - PAD.top - PAD.bottom);
  const tip = el('div', { class: 'chart-tip', hidden: true });
  const labelEvery = Math.ceil(n / 13);

  const g = s('g', {});
  bars.forEach((b, i) => {
    const x = PAD.left + i * slot + gap / 2;
    const y = yScale(b.value);
    const h = H - PAD.bottom - y;
    const r = Math.min(4, barW / 2, h);
    // Yalnızca üst köşeleri yuvarlatılmış, tabana oturan çubuk
    const d = h <= 0 ? '' : `M${x},${H - PAD.bottom}V${y + r}Q${x},${y} ${x + r},${y}H${x + barW - r}Q${x + barW},${y} ${x + barW},${y + r}V${H - PAD.bottom}Z`;
    const mark = s('path', { d, class: 'chart-bar' });
    const hit = s('rect', { x: PAD.left + i * slot, y: PAD.top, width: slot, height: H - PAD.top - PAD.bottom, class: 'chart-hit' });
    const show = () => {
      mark.classList.add('active');
      tip.textContent = b.tip;
      tip.hidden = false;
      tip.style.left = `${((x + barW / 2) / W) * 100}%`;
      tip.style.top = `${(Math.min(y, H - PAD.bottom - 4) / H) * 100}%`;
    };
    const hide = () => { mark.classList.remove('active'); tip.hidden = true; };
    hit.addEventListener('pointerenter', show);
    hit.addEventListener('pointerleave', hide);
    g.append(mark, hit);
    if (i % labelEvery === 0) {
      g.append(s('text', { x: x + barW / 2, y: H - PAD.bottom + 16, class: 'chart-tick', 'text-anchor': 'middle' }, b.label));
    }
  });

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img', 'aria-label': title },
    s('title', {}, title),
    frame({ xTicks: [], yTicks, xScale: () => 0, yScale, xFormat: () => '', yFormat, xLabel, yLabel }),
    g);

  return el('figure', { class: 'chart-figure' },
    el('figcaption', { class: 'chart-title' }, title),
    el('div', { class: 'chart' }, svg, tip),
    tableRows ? tableView(title, tableHeaders, tableRows) : null);
}
