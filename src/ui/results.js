// Sonuç satırı: etiket, değer ve değeri kopyalama düğmesi.
import { el } from './dom.js';
import { copyButton } from './clipboard.js';

export function resultRow({ label, value }) {
  return el('div', { class: 'result-row' },
    el('dt', {}, label),
    el('dd', {},
      el('span', { class: 'result-value' }, value),
      copyButton({ getText: () => String(value), label: `${label} değerini kopyala` })));
}
