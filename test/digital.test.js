import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseInteger, convertInteger, groupDigits } from '../src/calc/digital.js';

describe('sayı tabanı ayrıştırma', () => {
  it('her tabanda okur, önekleri ve boşlukları kabul eder', () => {
    assert.equal(parseInteger('255', 10), 255n);
    assert.equal(parseInteger('0xFF', 16), 255n);
    assert.equal(parseInteger('ff', 16), 255n);
    assert.equal(parseInteger('1111 1111', 2), 255n);
    assert.equal(parseInteger('0b1010', 2), 10n);
    assert.equal(parseInteger('377', 8), 255n);
    assert.equal(parseInteger('-1', 10), -1n);
  });

  it('geçersiz rakamda RangeError', () => {
    assert.throws(() => parseInteger('102', 2), RangeError);
    assert.throws(() => parseInteger('G1', 16), RangeError);
    assert.throws(() => parseInteger('', 10), RangeError);
    assert.throws(() => parseInteger('-5', 16), RangeError);
  });
});

describe('dönüşüm ve ikinin tümleyeni', () => {
  it('255 (8 bit) → FF, 1111 1111, 377; işaretli −1', () => {
    const r = convertInteger({ value: 255n, width: 8 });
    assert.equal(r.hex, 'FF');
    assert.equal(r.bin, '1111 1111');
    assert.equal(r.oct, '377');
    assert.equal(r.signed, -1n);
    assert.equal(r.unsigned, 255n);
  });

  it('−1 (16 bit) → FFFF; −128 (8 bit) → 1000 0000', () => {
    assert.equal(convertInteger({ value: -1n, width: 16 }).hex, 'FFFF');
    assert.equal(convertInteger({ value: -128n, width: 8 }).bin, '1000 0000');
  });

  it('0x80 (8 bit) işaretli olarak −128', () => {
    assert.equal(convertInteger({ value: 0x80n, width: 8 }).signed, -128n);
  });

  it('64 bit sınırları', () => {
    assert.equal(convertInteger({ value: -1n, width: 64 }).hex, 'FFFF FFFF FFFF FFFF');
    assert.equal(convertInteger({ value: 2n ** 63n, width: 64 }).signed, -(2n ** 63n));
  });

  it('bite sığmayan değer RangeError', () => {
    assert.throws(() => convertInteger({ value: 256n, width: 8 }), RangeError);
    assert.throws(() => convertInteger({ value: -129n, width: 8 }), RangeError);
  });

  it('gruplama ve bit sayıları', () => {
    assert.equal(groupDigits('101010', 4), '10 1010');
    const r = convertInteger({ value: 10n, width: 8 });
    assert.equal(r.bitLength, 4);
    assert.equal(r.ones, 2);
  });
});
