// Analog tümdevre şemaları için MOSFET sembolü.
import { s, wire } from '../schematic.js';

/**
 * NMOS sembolü (3 uçlu, gövde kaynağa bağlı varsayılır).
 * Kapı ucu (x, y); savak (drain) (x + 30, y − 30); kaynak (source) (x + 30, y + 30).
 * mirror = true: kapı sağda, savak/kaynak solda (akım aynasında M1 için).
 */
export function nmos(x, y, { mirror = false } = {}) {
  const d = mirror ? -1 : 1;
  const gx = x + 12 * d;
  const cx = x + 18 * d;
  const ox = x + 30 * d;
  return s('g', {},
    wire([x, y], [gx, y]),
    s('line', { x1: gx, y1: y - 14, x2: gx, y2: y + 14, class: 'sch-line' }),
    s('line', { x1: cx, y1: y - 16, x2: cx, y2: y + 16, class: 'sch-line', 'stroke-width': 3 }),
    wire([cx, y - 10], [ox, y - 10], [ox, y - 30]),
    wire([cx, y + 10], [ox, y + 10], [ox, y + 30]),
    // Kaynak okunun ucu dışarı (NMOS)
    s('polygon', { points: `${ox - 2 * d},${y + 10} ${ox - 9 * d},${y + 6} ${ox - 9 * d},${y + 14}`, class: 'sch-fill' }));
}
