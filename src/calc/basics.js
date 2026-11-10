// Temel devre hesapları: Ohm yasası ve karmaşık sayı (fazör) işlemleri.
import { assert } from './validate.js';

/**
 * V, I, R, P değerlerinden herhangi ikisi verilince diğer ikisini bulur.
 * Verilmeyenler null olmalıdır.
 */
export function ohmsLaw({ v = null, i = null, r = null, p = null }) {
  const given = [v, i, r, p].filter((x) => x !== null).length;
  assert(given === 2, 'Tam olarak iki değer girin.');
  if (v !== null && i !== null) { r = v / i; p = v * i; }
  else if (v !== null && r !== null) { assert(r > 0, 'R sıfırdan büyük olmalı.'); i = v / r; p = (v * v) / r; }
  else if (i !== null && r !== null) { v = i * r; p = i * i * r; }
  else if (p !== null && v !== null) { assert(v !== 0, 'V sıfır olamaz.'); i = p / v; r = (v * v) / p; }
  else if (p !== null && i !== null) { assert(i !== 0, 'I sıfır olamaz.'); v = p / i; r = p / (i * i); }
  else if (p !== null && r !== null) {
    assert(p >= 0 && r > 0, 'P negatif olamaz, R sıfırdan büyük olmalı.');
    v = Math.sqrt(p * r); i = Math.sqrt(p / r);
  }
  return { v, i, r, p };
}

// ---------------------------------------------------------------------------
// Karmaşık sayılar { re, im }
// ---------------------------------------------------------------------------
const DEG = Math.PI / 180;

export function fromPolar(mag, deg) {
  return { re: mag * Math.cos(deg * DEG), im: mag * Math.sin(deg * DEG) };
}

export function toPolar({ re, im }) {
  return { mag: Math.hypot(re, im), deg: Math.atan2(im, re) / DEG };
}

export function complexOp(a, b, op) {
  switch (op) {
    case 'add': return { re: a.re + b.re, im: a.im + b.im };
    case 'sub': return { re: a.re - b.re, im: a.im - b.im };
    case 'mul': return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
    case 'div': {
      const d = b.re * b.re + b.im * b.im;
      assert(d > 0, 'Sıfıra bölme: ikinci sayı 0 olamaz.');
      return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
    }
    case 'par': {
      // a ∥ b = ab / (a + b) (paralel empedans)
      const sum = complexOp(a, b, 'add');
      return complexOp(complexOp(a, b, 'mul'), sum, 'div');
    }
    default:
      throw new RangeError(`Bilinmeyen işlem: ${op}`);
  }
}

/** Fazörün zaman domeni karşılığı için tepe değer: RMS fazör → Vm = √2·|V|. */
export function phasorPeak(mag, isRms) {
  return isRms ? Math.SQRT2 * mag : mag;
}
