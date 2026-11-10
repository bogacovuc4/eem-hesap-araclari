// Sayfanın arkasındaki hareketli sahne: renk bulutları, devre kartı izleri ve izler
// üzerinde akan akım darbeleri. Tamamen CSS/SVG; ağ isteği yok.
//
// Higgsfield (ya da başka bir araç) ile üretilmiş döngü video eklemek için dosyayı
// assets/ klasörüne koyup aşağıdaki yolu doldurun; video sahnenin en altına yerleşir.
// Azaltılmış hareket ya da veri tasarrufu açıksa video yüklenmez.
import { s } from './schematic.js';

export const BG_VIDEO = null; // ör. { src: 'assets/bg.mp4', poster: 'assets/bg.jpg' }

const W = 1600;
const H = 900;
const TRACE_COUNT = 16;

/** Belirlenimci sözde rastgele sayı (her yüklemede aynı desen). */
function random(seed) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
}

/** Soldan sağa giden, yatay ve 45° parçalardan oluşan bir devre izi. */
function tracePoints(r, row) {
  let x = -40;
  let y = Math.round(((row + 0.5) * H) / TRACE_COUNT + (r() - 0.5) * 30);
  const pts = [[x, y]];
  while (x < W + 40) {
    x += 80 + Math.round(r() * 220);
    pts.push([x, y]);
    const d = (r() < 0.5 ? -1 : 1) * (25 + Math.round(r() * 45));
    if (y + d > 20 && y + d < H - 20 && r() < 0.75) {
      x += Math.abs(d);
      y += d;
      pts.push([x, y]);
    }
  }
  return pts;
}

function buildCircuit() {
  const r = random(20241110);
  const traces = s('g', { class: 'bg-traces' });
  const pulses = s('g', { class: 'bg-pulses' });
  const pads = s('g', { class: 'bg-pads' });
  for (let i = 0; i < TRACE_COUNT; i += 1) {
    const pts = tracePoints(r, i);
    const d = pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join('');
    traces.append(s('path', { d }));
    // Her izde 1–2 darbe; süre ve gecikme izden ize değişir.
    const n = r() < 0.4 ? 2 : 1;
    for (let k = 0; k < n; k += 1) {
      const dur = (7 + r() * 9).toFixed(1);
      pulses.append(s('path', {
        d,
        pathLength: 1000,
        class: `bg-pulse ${r() < 0.35 ? 'alt' : ''}`.trim(),
        style: `animation-duration:${dur}s;animation-delay:-${(r() * dur).toFixed(1)}s`,
      }));
    }
    // Köşelere lehim noktaları
    for (const [x, y] of pts.slice(1, -1)) {
      if (r() < 0.22) pads.append(s('circle', { cx: x, cy: y, r: 4 }));
    }
  }
  return s('svg', {
    class: 'bg-circuit',
    viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: 'xMidYMid slice',
    'aria-hidden': 'true',
    focusable: 'false',
  }, traces, pads, pulses);
}

function wantsVideo() {
  if (!BG_VIDEO) return false;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (navigator.connection?.saveData) return false;
  } catch { /* eski tarayıcı */ }
  return true;
}

export function mountBackground() {
  if (document.querySelector('.bg-scene')) return;
  const scene = document.createElement('div');
  scene.className = 'bg-scene';
  scene.setAttribute('aria-hidden', 'true');
  if (wantsVideo()) {
    const video = document.createElement('video');
    Object.assign(video, { muted: true, loop: true, autoplay: true, playsInline: true, preload: 'auto' });
    video.className = 'bg-video';
    video.src = BG_VIDEO.src;
    if (BG_VIDEO.poster) video.poster = BG_VIDEO.poster;
    video.addEventListener('error', () => video.remove());
    scene.append(video);
  }
  for (const name of ['b1', 'b2', 'b3']) {
    const blob = document.createElement('div');
    blob.className = `bg-blob ${name}`;
    scene.append(blob);
  }
  scene.append(buildCircuit());
  const veil = document.createElement('div');
  veil.className = 'bg-veil';
  scene.append(veil);
  document.body.prepend(scene);
}
