// Basit devre şeması çizim yardımcıları (SVG).
// Renkler styles.css içindeki .sch-* sınıflarından gelir; açık/koyu temaya uyar.
import { formatSI } from '../calc/units.js';
import { el } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';

/** SVG öğesi oluşturur: s('line', { x1: 0, ... }, ...çocuklar) */
export function s(tag, attrs = {}, ...children) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Şema etiketi için değer: sonlu değilse boş döner (etikette yalnızca ad görünür). */
export function fmt(value, unit) {
  return Number.isFinite(value) ? formatSI(value, unit, 3) : '';
}

const polyline = (points) =>
  s('polyline', { class: 'sch-line', points: points.map((p) => p.join(',')).join(' ') });

/** Noktalardan geçen iletken. */
export function wire(...points) {
  return polyline(points);
}

// Gövdeler yerel koordinatta, x ekseni boyunca −20…+20 aralığında çizilir.
const BODIES = {
  resistor: () => [
    polyline([[-20, 0], [-16.67, -7], [-10, 7], [-3.33, -7], [3.33, 7], [10, -7], [16.67, 7], [20, 0]]),
  ],
  capacitor: () => [
    polyline([[-20, 0], [-4, 0]]),
    polyline([[4, 0], [20, 0]]),
    polyline([[-4, -13], [-4, 13]]),
    polyline([[4, -13], [4, 13]]),
  ],
  inductor: () => [
    s('path', { class: 'sch-line', d: 'M -20 0 a 5 5 0 0 1 10 0 a 5 5 0 0 1 10 0 a 5 5 0 0 1 10 0 a 5 5 0 0 1 10 0' }),
  ],
  led: () => [
    polyline([[-20, 0], [-8, 0]]),
    polyline([[8, 0], [20, 0]]),
    s('polygon', { class: 'sch-line', points: '-8,-9 -8,9 8,0' }),
    polyline([[8, -10], [8, 10]]),
    // Işık okları
    polyline([[-2, -12], [4, -20]]),
    s('polygon', { class: 'sch-fill', points: '4,-20 4,-15 -0.8,-18.6' }),
    polyline([[4, -12], [10, -20]]),
    s('polygon', { class: 'sch-fill', points: '10,-20 10,-15 5.2,-18.6' }),
  ],
  source: () => [
    polyline([[-20, 0], [-13, 0]]),
    polyline([[13, 0], [20, 0]]),
    s('circle', { class: 'sch-line', cx: 0, cy: 0, r: 13 }),
  ],
};
BODIES.ac = BODIES.source;

function sign(type, x, y) {
  return s('g', {},
    polyline([[x - 3.5, y], [x + 3.5, y]]),
    type === '+' ? polyline([[x, y - 3.5], [x, y + 3.5]]) : null);
}

/**
 * İki uçlu eleman: a ve b uç noktaları (eksene paralel olmalı), aradaki boşluk iletkenle doldurulur.
 * kind: resistor | capacitor | inductor | led | source | ac
 * DC kaynakta (+) uç a tarafındadır. LED'de anot a tarafındadır.
 */
export function twoTerminal(kind, a, b) {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const half = Math.hypot(x2 - x1, y2 - y1) / 2;
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

  const group = s('g', {},
    s('g', { transform: `translate(${cx} ${cy}) rotate(${angle})` },
      polyline([[-half, 0], [-20, 0]]),
      polyline([[20, 0], [half, 0]]),
      ...BODIES[kind]()),
  );

  // İşaretler döndürülmeden, genel koordinatta çizilir (− işareti dikey görünmesin diye).
  const ux = (x2 - x1) / (2 * half);
  const uy = (y2 - y1) / (2 * half);
  if (kind === 'source') {
    group.append(sign('+', cx - 6 * ux, cy - 6 * uy), sign('−', cx + 6 * ux, cy + 6 * uy));
  }
  if (kind === 'ac') {
    group.append(s('path', { class: 'sch-line', d: `M ${cx - 7} ${cy} q 3.5 -8 7 0 t 7 0` }));
  }
  return group;
}

/** Toprak sembolü; (x, y) bağlantı noktasıdır, sembol aşağı doğru çizilir. */
export function ground(x, y) {
  return s('g', {},
    polyline([[x, y], [x, y + 8]]),
    polyline([[x - 10, y + 8], [x + 10, y + 8]]),
    polyline([[x - 6, y + 12], [x + 6, y + 12]]),
    polyline([[x - 2, y + 16], [x + 2, y + 16]]));
}

/** Bağlantı noktası (dolu nokta). */
export function dot(x, y) {
  return s('circle', { class: 'sch-fill', cx: x, cy: y, r: 2.8 });
}

/** Açık çıkış ucu. */
export function terminal(x, y) {
  return s('circle', { class: 'sch-term', cx: x, cy: y, r: 3.5 });
}

/** İletken üzerinde akım yönü oku (sağa doğru). */
export function currentArrow(x, y) {
  return s('polygon', { class: 'sch-fill', points: `${x + 5},${y} ${x - 4},${y - 4.5} ${x - 4},${y + 4.5}` });
}

/** İdeal op-amp üçgeni: sol kenar x'te, üst giriş cy−20, alt giriş cy+20, çıkış (x+60, cy). */
export function opamp(x, cy, topSign) {
  const bottomSign = topSign === '+' ? '−' : '+';
  return s('g', {},
    s('polygon', { class: 'sch-line sch-body', points: `${x},${cy - 40} ${x},${cy + 40} ${x + 60},${cy}` }),
    sign(topSign, x + 10, cy - 20),
    sign(bottomSign, x + 10, cy + 20));
}

/**
 * İki satırlı etiket: üstte ad (kalın), altta değer (vurgu rengi).
 * Değer boşsa yalnızca ad yazılır; `unknown` ise "?" gösterilir.
 */
export function label(x, y, name, value, { anchor = 'start', unknown = false } = {}) {
  const text = s('text', { class: 'sch-text', x, y, 'text-anchor': anchor },
    s('tspan', { class: 'sch-name' }, name));
  if (value) text.append(s('tspan', { class: 'sch-value', x, dy: 15 }, value));
  else if (unknown) text.append(s('tspan', { class: 'sch-unknown', x, dy: 15 }, '?'));
  return text;
}

/**
 * Kök SVG; erişilebilirlik için başlık içerir.
 * box: [x, y, genişlik, yükseklik] — çizimin görünen bölgesi.
 */
export function svg([x, y, width, height], title, ...children) {
  return s('svg', {
    viewBox: `${x} ${y} ${width} ${height}`,
    role: 'img',
    'aria-label': title,
    class: 'schematic-svg',
    style: `max-width:${width * 1.25}px`,
  }, s('title', {}, title), ...children);
}

/** Altyazılı şema. */
export function figure(svgNode, caption) {
  return el('figure', { class: 'schematic-figure' }, svgNode, caption ? el('figcaption', {}, caption) : null);
}
