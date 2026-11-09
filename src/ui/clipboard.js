// Panoya kopyalama ve görünür onay ("Kopyalandı").
import { el } from './dom.js';
import { icon } from './icons.js';

async function writeText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Güvenli olmayan bağlamda (http, eski tarayıcı) yedek yöntem
    const area = el('textarea', { readonly: true, style: 'position:fixed;opacity:0;pointer-events:none' });
    area.value = text;
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

/**
 * Kopyalama düğmesi. getText: kopyalanacak metni döndüren fonksiyon.
 * withLabel: düğmede metin de gösterilsin mi (yoksa yalnızca simge + erişilebilir ad).
 */
export function copyButton({ getText, label = 'Kopyala', withLabel = false, className = 'copy-btn' }) {
  const text = withLabel ? el('span', {}, label) : null;
  const button = el('button', { type: 'button', class: className, title: label, 'aria-label': label },
    icon('copy', { size: 16 }), text);
  let timer = null;

  button.addEventListener('click', async () => {
    const ok = await writeText(getText());
    const done = ok ? 'Kopyalandı' : 'Kopyalanamadı';
    button.replaceChildren(icon(ok ? 'check' : 'copy', { size: 16 }), withLabel ? el('span', {}, done) : null);
    button.setAttribute('aria-label', done);
    button.classList.toggle('copied', ok);
    announce(done);
    clearTimeout(timer);
    timer = setTimeout(() => {
      button.replaceChildren(icon('copy', { size: 16 }), withLabel ? el('span', {}, label) : null);
      button.setAttribute('aria-label', label);
      button.classList.remove('copied');
    }, 1600);
  });
  return button;
}

// Ekran okuyucular için tek bir canlı bölge
let liveRegion = null;
function announce(message) {
  if (!liveRegion) {
    liveRegion = el('div', { class: 'visually-hidden', 'aria-live': 'polite' });
    document.body.append(liveRegion);
  }
  liveRegion.textContent = '';
  setTimeout(() => { liveRegion.textContent = message; }, 30);
}
