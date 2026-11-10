import { el } from '../dom.js';
import { calculatorView } from '../form.js';
import {
  minimizeSop, parseTermList, karnaughLayout, coveredMinterms, termToText, VAR_NAMES,
} from '../../calc/logic.js';
import { textField, selectField, outputCard, codeLayout, wideCard, notesCard } from '../codes/common.js';

function panel() {
  const vars = selectField({
    label: 'Değişken sayısı',
    options: [2, 3, 4].map((n) => ({ value: String(n), text: `${n} (${VAR_NAMES.slice(0, n).join(', ')})` })),
    value: '4',
    param: 'v',
  });
  const mins = textField({ label: 'Mintermler (çıkışın 1 olduğu satırlar)', value: '0, 2, 5, 7, 8, 10, 13, 15', placeholder: 'ör. 0, 2, 5-7', hint: 'Virgül ya da boşlukla ayırın; aralık için 5-7', param: 'm' });
  const dcs = textField({ label: 'Önemsiz durumlar (X)', value: '', placeholder: 'ör. 3, 11', param: 'd' });
  const output = outputCard();
  const mapBox = el('div', { class: 'kmap-box' });
  const termsBox = el('div', { class: 'kmap-terms' });

  function drawMap(n, ones, x, terms) {
    const k = karnaughLayout(n);
    const cellOf = new Map();
    const table = el('table', { class: 'kmap', 'aria-label': 'Karnaugh haritası' },
      el('thead', {}, el('tr', {},
        el('th', { class: 'kmap-corner' }, `${k.rowLabel} \\ ${k.colLabel}`),
        ...k.cols.map((c) => el('th', {}, c)))),
      el('tbody', {}, ...k.rows.map((r, i) => el('tr', {},
        el('th', {}, r),
        ...k.cells[i].map((m) => {
          const v = ones.includes(m) ? '1' : x.includes(m) ? 'X' : '0';
          const td = el('td', { class: `kmap-cell kmap-${v === '1' ? 'one' : v === 'X' ? 'dc' : 'zero'}`, title: `m${m}` },
            el('span', { class: 'kmap-val' }, v), el('span', { class: 'kmap-idx' }, String(m)));
          cellOf.set(m, td);
          return td;
        })))));
    mapBox.replaceChildren(table);

    const highlight = (term, on) => {
      for (const m of coveredMinterms(term)) cellOf.get(m)?.classList.toggle('kmap-hit', on);
    };
    termsBox.replaceChildren(...terms.map((t) => {
      const chip = el('button', { type: 'button', class: 'kmap-term' }, termToText(t),
        el('small', {}, ` m(${coveredMinterms(t).join(',')})`));
      chip.addEventListener('mouseenter', () => highlight(t, true));
      chip.addEventListener('mouseleave', () => highlight(t, false));
      chip.addEventListener('focus', () => highlight(t, true));
      chip.addEventListener('blur', () => highlight(t, false));
      return chip;
    }));
  }

  function update() {
    const n = Number(vars.value);
    try {
      const ones = parseTermList(mins.value);
      const x = parseTermList(dcs.value);
      mins.setInvalid(false);
      dcs.setInvalid(false);
      const r = minimizeSop({ variables: n, minterms: ones, dontCares: x });
      const literals = r.terms.reduce((s, t) => s + [...t].filter((c) => c !== '-').length, 0);
      output.show({
        rows: [
          { label: 'En sade SOP', value: `F = ${r.expression}` },
          { label: 'Terim / literal sayısı', value: `${r.terms.length} / ${literals}` },
          { label: 'Asal çarpanlar', value: r.primes.map((p) => termToText(p)).join(', ') || '—' },
          { label: 'Zorunlu asal çarpanlar', value: r.essential.map((p) => termToText(p)).join(', ') || '—' },
          { label: 'Σm', value: `Σm(${[...new Set(ones)].sort((a, b) => a - b).join(', ')})${x.length ? ` + d(${[...new Set(x)].sort((a, b) => a - b).join(', ')})` : ''}` },
        ],
      });
      drawMap(n, ones, x, r.terms);
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      mins.setInvalid(true, err.message);
      output.show({ errors: [err.message] });
      mapBox.replaceChildren();
      termsBox.replaceChildren();
    }
  }

  vars.onChange(update);
  mins.onChange(update);
  dcs.onChange(update);
  update();

  return codeLayout({
    visual: el('div', { class: 'kmap-wrap' }, mapBox, el('div', {},
      el('p', { class: 'table-note' }, 'Çözümdeki terimler — üzerine gelince haritada kapsadığı hücreler vurgulanır:'), termsBox)),
    visualTitle: 'Karnaugh haritası',
    inputs: [vars.element, mins.element, dcs.element],
    output,
    extra: [notesCard([
      'Sadeleştirme Quine–McCluskey yöntemiyle yapılır: önce tüm asal çarpanlar bulunur, zorunlu olanlar seçilir, kalan mintermler en az terimli (eşitlikte en az literalli) örtüyle kapatılır.',
      'Birden fazla eşit derecede sade çözüm olabilir (döngüsel haritalar); burada bunlardan biri gösterilir.',
      'Değişken sırası A en anlamlı bittir: 4 değişkende m5 = 0101 = A′BC′D. Harita satır/sütunları Gray koduyla dizilir.',
      'Önemsiz durumlar (X) yalnızca grupları büyütmek için kullanılır, örtülmeleri gerekmez.',
    ])],
  });
}

export default {
  id: 'digital/karnaugh',
  title: 'Karnaugh / mantık sadeleştirme',
  render(container) {
    container.append(calculatorView({
      title: 'Karnaugh haritası ve mantık sadeleştirme',
      intro: 'Mintermler ve önemsiz durumlardan en sade çarpımların toplamı (SOP) ifadesi.',
      modes: [{ id: 'kmap', label: 'Sadeleştir', build: panel }],
    }));
  },
};
