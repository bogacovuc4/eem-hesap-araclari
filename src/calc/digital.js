// Sayı tabanı dönüşümü ve ikinin tümleyeni (BigInt ile 64 bite kadar).
import { assert } from './validate.js';

export const BASES = Object.freeze({ 2: 'İkili', 8: 'Sekizli', 10: 'Onluk', 16: 'Onaltılı' });
const DIGITS = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^[0-9]+$/, 16: /^[0-9a-f]+$/i };
const PREFIX = { 2: /^0b/i, 8: /^0o/i, 16: /^0x/i };

/**
 * Metni BigInt'e çevirir. Boşluk ve alt çizgi yok sayılır; 0b/0o/0x önekleri kabul edilir.
 * Onluk tabanda başta "-" olabilir.
 */
export function parseInteger(text, base) {
  assert(BASES[base], 'Taban 2, 8, 10 veya 16 olmalı.');
  let s = String(text ?? '').trim().replace(/[\s_]/g, '');
  assert(s !== '', 'Sayı boş bırakılamaz.');
  let negative = false;
  if (s.startsWith('-')) {
    assert(base === 10, 'Eksi işareti yalnızca onluk tabanda kullanılabilir; diğer tabanlarda bit desenini girin.');
    negative = true;
    s = s.slice(1);
  }
  if (PREFIX[base]) s = s.replace(PREFIX[base], '');
  assert(s !== '' && DIGITS[base].test(s), `Geçersiz ${BASES[base].toLocaleLowerCase('tr')} rakam: yalnızca ${{ 2: '0–1', 8: '0–7', 10: '0–9', 16: '0–9 ve A–F' }[base]} kullanılabilir.`);
  const prefix = { 2: '0b', 8: '0o', 10: '', 16: '0x' }[base];
  const value = BigInt(prefix + s);
  return negative ? -value : value;
}

/** Bit desenini n'li gruplara ayırır (sağdan): "10101010" → "1010 1010" */
export function groupDigits(s, size = 4) {
  const out = [];
  for (let i = s.length; i > 0; i -= size) out.unshift(s.slice(Math.max(0, i - size), i));
  return out.join(' ');
}

/**
 * Değeri verilen bit genişliğinde tüm tabanlarda gösterir.
 * Negatif onluk girişte ikinin tümleyeni bit deseni kullanılır.
 * @returns {{ bits, unsigned, signed, bin, oct, dec, hex, hexSigned, bitLength }}
 */
export function convertInteger({ value, width }) {
  assert([8, 16, 32, 64].includes(width), 'Bit genişliği 8, 16, 32 veya 64 olmalı.');
  const w = BigInt(width);
  const maxUnsigned = (1n << w) - 1n;
  const minSigned = -(1n << (w - 1n));
  assert(value >= minSigned && value <= maxUnsigned,
    `Değer ${width} bite sığmıyor (aralık: ${minSigned} … ${maxUnsigned}).`);

  const unsigned = value < 0n ? value + (1n << w) : value; // ikinin tümleyeni
  const signed = unsigned >= (1n << (w - 1n)) ? unsigned - (1n << w) : unsigned;
  const bits = unsigned.toString(2).padStart(width, '0');
  return {
    bits,
    unsigned,
    signed,
    bin: groupDigits(bits, 4),
    oct: unsigned.toString(8),
    dec: unsigned.toString(10),
    hex: groupDigits(unsigned.toString(16).toUpperCase().padStart(width / 4, '0'), 4),
    bitLength: unsigned === 0n ? 0 : unsigned.toString(2).length,
    ones: [...bits].filter((b) => b === '1').length,
  };
}
