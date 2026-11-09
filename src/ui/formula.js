import { el } from './dom.js';

const pending = new Set();
let waiting = false;

function tryRender(node) {
  const katex = window.katex;
  if (!katex) return false;
  try {
    katex.render(node.dataset.tex, node, { displayMode: true, throwOnError: false });
    return true;
  } catch {
    return false;
  }
}

function waitForKatex() {
  if (waiting) return;
  waiting = true;
  // KaTeX `defer` ile yüklenir; modül ondan önce çalışabilir.
  window.addEventListener('load', () => {
    for (const node of pending) {
      if (node.isConnected) tryRender(node);
    }
    pending.clear();
  }, { once: true });
}

/**
 * Bir formül bloğu oluşturur. KaTeX varsa LaTeX olarak çizer,
 * yoksa (CDN'e ulaşılamadı vb.) düz metin yedeğini gösterir.
 * @param {string} tex LaTeX kaynağı
 * @param {string} plain Düz metin yedek
 */
export function formula(tex, plain) {
  const node = el('div', { class: 'formula', role: 'math', 'aria-label': plain },
    el('span', { class: 'formula-fallback' }, plain));
  node.dataset.tex = tex;
  if (!tryRender(node)) {
    pending.add(node);
    waitForKatex();
  }
  return node;
}
