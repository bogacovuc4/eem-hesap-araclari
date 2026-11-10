// Devre analizi: doğrusal denklem sistemi (düğüm/çevre analizi) ve dalga şekli değerleri.
import { assert } from './validate.js';

/**
 * A·x = b çözümü: kısmi pivotlamalı Gauss eliminasyonu.
 * Dönüş: { x, det }. Tekil (det ≈ 0) matriste RangeError.
 */
export function linearSolve(A, b) {
  const n = A.length;
  assert(n >= 1 && n <= 10, 'Denklem sayısı 1–10 arasında olmalı.');
  assert(A.every((row) => row.length === n), 'Katsayı matrisi kare olmalı (her satırda n katsayı).');
  assert(b.length === n, 'Sağ taraf vektörü n elemanlı olmalı.');
  const M = A.map((row, i) => [...row, b[i]]);
  const scale = Math.max(...A.flat().map(Math.abs), 1e-300);
  let det = 1;
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    assert(Math.abs(M[p][c]) > 1e-12 * scale, 'Matris tekil: denklemler bağımsız değil (tek çözüm yok).');
    if (p !== c) { [M[p], M[c]] = [M[c], M[p]]; det = -det; }
    det *= M[c][c];
    for (let r = c + 1; r < n; r += 1) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k += 1) M[r][k] -= f * M[c][k];
    }
  }
  const x = Array(n).fill(0);
  for (let r = n - 1; r >= 0; r -= 1) {
    let sum = M[r][n];
    for (let k = r + 1; k < n; k += 1) sum -= M[r][k] * x[k];
    x[r] = sum / M[r][r];
  }
  return { x, det };
}

/** "2 -1 0; -1 3 -1; 0 -1 2" biçimindeki metni matrise çevirir (satırlar ; ya da yeni satır). */
export function parseMatrix(text) {
  const rows = String(text).trim().split(/[;\n]+/).map((r) => r.trim()).filter(Boolean);
  assert(rows.length > 0, 'Matris boş.');
  return rows.map((r) => r.replace(/−/g, '-').split(/,\s+|\s+/).filter(Boolean).map((s) => {
    const v = Number(s.replace(',', '.'));
    assert(Number.isFinite(v), `“${s}” geçerli bir sayı değil.`);
    return v;
  }));
}

/**
 * Periyodik dalga şekillerinin RMS, ortalama ve doğrultulmuş ortalama değerleri (tepe Vp).
 *   sine, half (yarım dalga doğrultulmuş), full (tam dalga doğrultulmuş),
 *   square (±Vp), pulse (0…Vp, görev oranı D), triangle (±Vp, testere dişi de aynı)
 */
export function waveformStats({ shape, vp, duty = 0.5 }) {
  assert(vp > 0, 'Tepe değer sıfırdan büyük olmalı.');
  const table = {
    sine: { rms: vp / Math.SQRT2, avg: 0, absAvg: (2 * vp) / Math.PI, vpp: 2 * vp },
    half: { rms: vp / 2, avg: vp / Math.PI, absAvg: vp / Math.PI, vpp: vp },
    full: { rms: vp / Math.SQRT2, avg: (2 * vp) / Math.PI, absAvg: (2 * vp) / Math.PI, vpp: vp },
    square: { rms: vp, avg: 0, absAvg: vp, vpp: 2 * vp },
    triangle: { rms: vp / Math.sqrt(3), avg: 0, absAvg: vp / 2, vpp: 2 * vp },
  };
  let r;
  if (shape === 'pulse') {
    assert(duty > 0 && duty <= 1, 'Görev oranı 0 ile 1 arasında olmalı.');
    r = { rms: vp * Math.sqrt(duty), avg: vp * duty, absAvg: vp * duty, vpp: vp };
  } else {
    r = table[shape];
    assert(r, 'Bilinmeyen dalga şekli.');
  }
  // AC bileşenin RMS'i: √(Vrms² − Vdc²)
  const acRms = Math.sqrt(Math.max(0, r.rms ** 2 - r.avg ** 2));
  return { ...r, acRms, crest: vp / r.rms, form: r.rms / r.absAvg, ripple: r.avg ? acRms / r.avg : null };
}
