// Sayısal tasarım: mantık fonksiyonu sadeleştirme (Quine–McCluskey + en küçük örtü).
import { assert } from './validate.js';

export const VAR_NAMES = ['A', 'B', 'C', 'D', 'E'];

/** Terim gösterimi: '01-1' gibi; '-' = değişken yok. Bit sırası: A en anlamlı. */
function toBits(m, n) {
  return m.toString(2).padStart(n, '0');
}

function combine(a, b) {
  let diff = 0;
  let out = '';
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      if (a[i] === '-' || b[i] === '-') return null;
      diff += 1;
      out += '-';
    } else {
      out += a[i];
    }
  }
  return diff === 1 ? out : null;
}

/** Bir terimin kapsadığı mintermler */
export function coveredMinterms(term) {
  let list = [''];
  for (const ch of term) {
    list = ch === '-' ? list.flatMap((p) => [p + '0', p + '1']) : list.map((p) => p + ch);
  }
  return list.map((b) => parseInt(b, 2));
}

/** Terimi cebirsel yazar: '01-1' → A′BD (tümleyen için ′) */
export function termToText(term, names = VAR_NAMES) {
  if (/^-+$/.test(term)) return '1';
  return [...term].map((ch, i) => (ch === '-' ? '' : ch === '1' ? names[i] : `${names[i]}′`)).join('');
}

/** Asal çarpanlar (prime implicants) */
export function primeImplicants(minterms, dontCares, n) {
  let current = [...new Set([...minterms, ...dontCares])].map((m) => toBits(m, n));
  const primes = new Set();
  while (current.length) {
    const used = new Set();
    const next = new Set();
    for (let i = 0; i < current.length; i += 1) {
      for (let j = i + 1; j < current.length; j += 1) {
        const c = combine(current[i], current[j]);
        if (c) {
          next.add(c);
          used.add(current[i]);
          used.add(current[j]);
        }
      }
    }
    for (const t of current) if (!used.has(t)) primes.add(t);
    current = [...next];
  }
  return [...primes];
}

/**
 * En sade çarpımların toplamı (SOP). Önce zorunlu asal çarpanlar seçilir, kalan
 * mintermler için en az terimli (eşitlikte en az literalli) örtü kapsamlı aramayla bulunur.
 * @returns {{ terms: string[], expression: string, primes: string[], essential: string[] }}
 */
export function minimizeSop({ variables, minterms, dontCares = [] }) {
  assert(Number.isInteger(variables) && variables >= 1 && variables <= 5, 'Değişken sayısı 1 ile 5 arasında olmalı.');
  const max = 2 ** variables;
  for (const m of [...minterms, ...dontCares]) {
    assert(Number.isInteger(m) && m >= 0 && m < max, `Terim ${m}, ${variables} değişken için 0…${max - 1} aralığında olmalı.`);
  }
  const ones = [...new Set(minterms)].sort((a, b) => a - b);
  const dcs = [...new Set(dontCares)].filter((d) => !ones.includes(d));
  const overlap = [...new Set(dontCares)].filter((d) => ones.includes(d));
  assert(overlap.length === 0, `Şu terimler hem minterm hem önemsiz durum olarak girildi: ${overlap.join(', ')}.`);

  if (ones.length === 0) return { terms: [], expression: '0', primes: [], essential: [] };
  if (ones.length + dcs.length === max) return { terms: ['-'.repeat(variables)], expression: '1', primes: ['-'.repeat(variables)], essential: ['-'.repeat(variables)] };

  const primes = primeImplicants(ones, dcs, variables);
  const cover = new Map(primes.map((p) => [p, coveredMinterms(p).filter((m) => ones.includes(m))]));

  // Zorunlu asal çarpanlar: bir mintermi tek başına kapsayanlar
  const essential = new Set();
  for (const m of ones) {
    const owners = primes.filter((p) => cover.get(p).includes(m));
    if (owners.length === 1) essential.add(owners[0]);
  }
  const covered = new Set([...essential].flatMap((p) => cover.get(p)));
  const remaining = ones.filter((m) => !covered.has(m));
  const candidates = primes.filter((p) => !essential.has(p) && cover.get(p).some((m) => remaining.includes(m)));

  const literals = (t) => [...t].filter((c) => c !== '-').length;
  let best = null;
  // En fazla 5 değişkende aday sayısı küçüktür; artan boyutta alt kümeler denenir
  for (let size = 0; size <= candidates.length && !best; size += 1) {
    const pick = [];
    const search = (start) => {
      if (pick.length === size) {
        const cov = new Set(pick.flatMap((p) => cover.get(p)));
        if (remaining.every((m) => cov.has(m))) {
          const lit = pick.reduce((s, p) => s + literals(p), 0);
          if (!best || lit < best.lit) best = { set: [...pick], lit };
        }
        return;
      }
      for (let i = start; i < candidates.length; i += 1) {
        pick.push(candidates[i]);
        search(i + 1);
        pick.pop();
      }
    };
    search(0);
  }

  const terms = [...essential, ...(best ? best.set : [])]
    .sort((a, b) => literals(a) - literals(b) || a.localeCompare(b));
  return {
    terms,
    expression: terms.map((t) => termToText(t)).join(' + '),
    primes,
    essential: [...essential],
  };
}

/** Bir SOP terim listesinin minterm m için değeri */
export function evaluateSop(terms, m, n) {
  const bits = toBits(m, n);
  return terms.some((t) => [...t].every((ch, i) => ch === '-' || ch === bits[i]));
}

/** "0, 1, 5 7" ya da "0-3, 8" gibi listeyi tam sayılara çevirir (aralık desteği). */
export function parseTermList(text) {
  const raw = String(text ?? '').trim();
  if (raw === '') return [];
  const out = [];
  for (const part of raw.split(/[,;\s]+/).filter(Boolean)) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])];
      assert(a <= b, `“${part}” aralığında başlangıç bitişten büyük.`);
      for (let i = a; i <= b; i += 1) out.push(i);
    } else {
      assert(/^\d+$/.test(part), `“${part}” geçerli bir terim numarası değil.`);
      out.push(Number(part));
    }
  }
  return out;
}

/** Karnaugh haritası düzeni (Gray kodu): satır ve sütun değişkenleri, hücre → minterm */
export function karnaughLayout(variables) {
  assert(variables >= 2 && variables <= 4, 'Karnaugh haritası 2–4 değişken için çizilir.');
  const gray = (k) => (k === 1 ? ['0', '1'] : ['00', '01', '11', '10']);
  const rowVars = Math.floor(variables / 2);
  const colVars = variables - rowVars;
  const rows = gray(rowVars);
  const cols = gray(colVars);
  const cells = rows.map((r) => cols.map((c) => parseInt(r + c, 2)));
  return {
    rowLabel: VAR_NAMES.slice(0, rowVars).join(''),
    colLabel: VAR_NAMES.slice(rowVars, variables).join(''),
    rows,
    cols,
    cells,
  };
}
