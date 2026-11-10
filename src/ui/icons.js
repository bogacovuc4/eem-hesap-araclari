// Satır içi SVG simgeler (Lucide çizgi stiliyle uyumlu, 24×24, stroke = currentColor).
// Tek bir simge ailesi kullanılır; metin yanındaki simgeler ekran okuyucudan gizlenir.
import { s } from './schematic.js';

const PATHS = {
  menu: [['line', { x1: 4, y1: 6, x2: 20, y2: 6 }], ['line', { x1: 4, y1: 12, x2: 20, y2: 12 }], ['line', { x1: 4, y1: 18, x2: 20, y2: 18 }]],
  sun: [
    ['circle', { cx: 12, cy: 12, r: 4 }],
    ['path', { d: 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41' }],
  ],
  moon: [['path', { d: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z' }]],
  copy: [
    ['rect', { x: 9, y: 9, width: 13, height: 13, rx: 2 }],
    ['path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }],
  ],
  check: [['polyline', { points: '20 6 9 17 4 12' }]],
  link: [
    ['path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }],
    ['path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }],
  ],
  search: [['circle', { cx: 11, cy: 11, r: 7 }], ['line', { x1: 21, y1: 21, x2: 16.65, y2: 16.65 }]],
  clock: [['circle', { cx: 12, cy: 12, r: 9 }], ['polyline', { points: '12 7 12 12 15 14' }]],
  chevron: [['polyline', { points: '6 9 12 15 18 9' }]],
  // Kategori ikonları
  antenna: [
    ['path', { d: 'M4.9 16.1C1 12.2 1 5.8 4.9 1.9M7.8 4.7a6.1 6.1 0 0 0-.8 7.5M16.2 4.8c2 2 2.3 5.1.8 7.5M19.1 1.9a10 10 0 0 1 0 14.1' }],
    ['circle', { cx: 12, cy: 9, r: 2 }],
    ['path', { d: 'M9.5 18h5M8 22l4-11 4 11' }],
  ],
  chip: [
    ['rect', { x: 5, y: 5, width: 14, height: 14, rx: 2 }],
    ['rect', { x: 9, y: 9, width: 6, height: 6, rx: 1 }],
    ['path', { d: 'M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3' }],
  ],
  wind: [['path', { d: 'M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2' }]],
  tag: [
    ['path', { d: 'M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z' }],
    ['circle', { cx: 7.5, cy: 7.5, r: 1.2 }],
  ],
  transistor: [
    ['circle', { cx: 12, cy: 12, r: 9 }],
    ['path', { d: 'M9 7v10M3 12h6M9 10l5-3V3M9 14l5 3v4' }],
  ],
  sine: [['path', { d: 'M2 12c2.5-7 4.5-7 7 0s4.5 7 7 0 3.5-5 6-5' }]],
  target: [['circle', { cx: 12, cy: 12, r: 9 }], ['circle', { cx: 12, cy: 12, r: 5 }], ['circle', { cx: 12, cy: 12, r: 1 }]],
  bolt: [['path', { d: 'M13 2 4 14h7l-1 8 9-12h-7z' }]],
  broadcast: [
    ['circle', { cx: 12, cy: 12, r: 2 }],
    ['path', { d: 'M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2' }],
  ],
  binary: [
    ['rect', { x: 14, y: 14, width: 4, height: 6, rx: 2 }],
    ['rect', { x: 6, y: 4, width: 4, height: 6, rx: 2 }],
    ['path', { d: 'M6 20h4M14 10h4M6 14h2v6M14 4h2v6' }],
  ],
};

/** Simge düğümü. Varsayılan olarak dekoratiftir (aria-hidden). */
export function icon(name, { size = 18 } = {}) {
  return s('svg', {
    class: 'icon', width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true', focusable: 'false',
  }, ...PATHS[name].map(([tag, attrs]) => s(tag, attrs)));
}
