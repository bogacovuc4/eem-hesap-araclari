// İletim hattı çizim parçaları: hat bölümü (dikdörtgen), yük, giriş ucu.
import { s, wire, terminal, twoTerminal, ground, label } from '../schematic.js';

/** Yatay hat bölümü: iki uç arasında çerçeve ve iki iletken çizgisi. */
export function lineSection(x1, x2, y, { title = '', value = '' } = {}) {
  return s('g', {},
    s('rect', { x: x1, y: y - 12, width: x2 - x1, height: 24, rx: 3, class: 'sch-line sch-body' }),
    s('line', { x1, y1: y - 5, x2, y2: y - 5, class: 'sch-line' }),
    s('line', { x1, y1: y + 5, x2, y2: y + 5, class: 'sch-line' }),
    title ? label((x1 + x2) / 2, y - 34, title, value, { anchor: 'middle' }) : null);
}

/** Hattın sağ ucuna bağlı, toprağa giden yük. */
export function load(x, y, name, value) {
  return s('g', {},
    wire([x, y], [x + 30, y]),
    twoTerminal('resistor', [x + 30, y], [x + 30, y + 80]),
    ground(x + 30, y + 80),
    label(x + 46, y + 36, name, value));
}

/** Giriş ucu: açık terminal ve hatta giden kısa iletken. */
export function inputPort(x, y, x2, name = '', value = '') {
  return s('g', {},
    terminal(x, y),
    wire([x, y], [x2, y]),
    name ? label(x - 6, y + 34, name, value) : null);
}
