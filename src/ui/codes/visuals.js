// Bileşen çizimleri: renk bantlı direnç/bobin, SMD çip, seramik kondansatör.
import { s } from '../schematic.js';
import { el } from '../dom.js';
import { colorByKey } from '../../calc/codes.js';

let clipCounter = 0;

/**
 * Renk bantlı eksenel bileşen.
 * bands: renk anahtarları (son bant tolerans, 6 bantta sondan bir önceki tolerans + son TCR).
 */
export function bandedComponent(bands, { kind = 'resistor', title = 'Renk bantları' } = {}) {
  clipCounter += 1;
  const clipId = `body-clip-${clipCounter}`;
  const bodyFill = kind === 'inductor' ? '#a9cfa8' : '#e6cf9f';

  // Bant konumları: rakam/çarpan bantları solda, tolerans (ve TCR) sağda ayrık.
  const n = bands.length;
  const tail = n === 6 ? 2 : n >= 4 ? 1 : 0;
  const lead = n - tail;
  const xs = [];
  for (let i = 0; i < lead; i += 1) xs.push(88 + i * 26);
  if (tail === 1) xs.push(222);
  if (tail === 2) xs.push(206, 230);

  const bandRects = bands.map((key, i) => {
    const color = colorByKey(key);
    if (!color || !color.hex) return null;
    return s('rect', {
      x: xs[i], y: 14, width: 13, height: 62, fill: color.hex,
      stroke: 'rgba(0,0,0,.35)', 'stroke-width': 0.8,
    });
  });

  return s('svg', { viewBox: '0 0 320 90', class: 'component-svg', role: 'img', 'aria-label': title },
    s('title', {}, title),
    s('defs', {}, s('clipPath', { id: clipId }, s('rect', { x: 60, y: 18, width: 200, height: 54, rx: 20 }))),
    s('line', { x1: 0, y1: 45, x2: 60, y2: 45, class: 'lead' }),
    s('line', { x1: 260, y1: 45, x2: 320, y2: 45, class: 'lead' }),
    s('rect', { x: 60, y: 18, width: 200, height: 54, rx: 20, fill: bodyFill }),
    s('g', { 'clip-path': `url(#${clipId})` }, ...bandRects),
    s('rect', { x: 60, y: 18, width: 200, height: 54, rx: 20, fill: 'none', stroke: 'rgba(0,0,0,.45)', 'stroke-width': 1.2 }),
  );
}

/** SMD çip (direnç: siyah gövde, bobin: gri gövde) üzerinde yazılı kod. */
export function smdChip(code, { kind = 'resistor', title = 'SMD bileşen' } = {}) {
  const body = kind === 'inductor' ? '#5b5f66' : '#1d1d1f';
  const text = code || '?';
  const fontSize = text.length > 4 ? 22 : 30;
  return s('svg', { viewBox: '0 0 200 90', class: 'component-svg component-small', role: 'img', 'aria-label': `${title}: ${text}` },
    s('title', {}, `${title}: ${text}`),
    s('rect', { x: 14, y: 18, width: 30, height: 54, rx: 3, fill: '#c9cdd2', stroke: 'rgba(0,0,0,.35)' }),
    s('rect', { x: 156, y: 18, width: 30, height: 54, rx: 3, fill: '#c9cdd2', stroke: 'rgba(0,0,0,.35)' }),
    s('rect', { x: 40, y: 18, width: 120, height: 54, rx: 2, fill: body }),
    s('text', {
      x: 100, y: 45, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: '#f2f2f2', 'font-family': 'ui-monospace, Consolas, monospace', 'font-size': fontSize, 'font-weight': 600,
    }, text),
  );
}

/** Seramik disk kondansatör üzerinde yazılı kod. */
export function ceramicCap(code, { title = 'Seramik kondansatör' } = {}) {
  const text = code || '?';
  const fontSize = text.length > 4 ? 18 : 24;
  return s('svg', { viewBox: '0 0 160 140', class: 'component-svg component-small', role: 'img', 'aria-label': `${title}: ${text}` },
    s('title', {}, `${title}: ${text}`),
    s('line', { x1: 66, y1: 90, x2: 66, y2: 138, class: 'lead' }),
    s('line', { x1: 94, y1: 90, x2: 94, y2: 138, class: 'lead' }),
    s('ellipse', { cx: 80, cy: 52, rx: 52, ry: 46, fill: '#d98a3a', stroke: 'rgba(0,0,0,.4)', 'stroke-width': 1.2 }),
    s('text', {
      x: 80, y: 52, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: '#2a1a0a', 'font-family': 'ui-monospace, Consolas, monospace', 'font-size': fontSize, 'font-weight': 700,
    }, text),
  );
}

/** Altyazılı görsel; birden fazla görsel yan yana dizilebilir. */
export function visualFigure(svgNode, caption) {
  return el('figure', { class: 'component-figure' }, svgNode, caption ? el('figcaption', {}, caption) : null);
}
