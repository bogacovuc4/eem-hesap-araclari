import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNumber, formatNumber, formatSI, toSI, fromSI, LENGTH_UNITS, FREQUENCY_UNITS,
} from '../src/calc/units.js';
import { checkPositive, checkMin, checkNonNegative } from '../src/calc/validate.js';

describe('parseNumber', () => {
  it('virgül ve noktayı kabul eder', () => {
    assert.equal(parseNumber('1,6'), 1.6);
    assert.equal(parseNumber('1.6'), 1.6);
    assert.equal(parseNumber(' 2.5e3 '), 2500);
    assert.equal(parseNumber('-4'), -4);
  });

  it('boş için null, geçersiz için NaN döner', () => {
    assert.equal(parseNumber(''), null);
    assert.equal(parseNumber('   '), null);
    assert.ok(Number.isNaN(parseNumber('abc')));
    assert.ok(Number.isNaN(parseNumber('1,2,3')));
  });
});

describe('formatSI', () => {
  it('uygun ön eki seçer', () => {
    assert.equal(formatSI(2.45e9, 'Hz'), '2,450 GHz');
    assert.equal(formatSI(3.0621e-3, 'm'), '3,062 mm');
    assert.equal(formatSI(47000, 'Ω'), '47,00 kΩ');
    assert.equal(formatSI(50, 'Ω'), '50,00 Ω');
    assert.equal(formatSI(1.5e-9, 'F', 3), '1,50 nF');
  });

  it('yuvarlama taşmasında bir üst ön eke geçer', () => {
    assert.equal(formatSI(999.96, 'Hz'), '1,000 kHz');
  });

  it('sıfır ve sonsuzu işler', () => {
    assert.equal(formatSI(0, 'V'), '0 V');
    assert.equal(formatSI(Infinity, 'V'), '—');
  });
});

describe('formatNumber', () => {
  it('anlamlı basamak ve virgül kullanır', () => {
    assert.equal(formatNumber(3.33128), '3,331');
    assert.equal(formatNumber(0.5934, 2), '0,59');
    assert.equal(formatNumber(123456), '123500');
    assert.equal(formatNumber(1.2346e-7), '1,235×10^-7');
  });
});

describe('birim dönüşümü', () => {
  it('SI ↔ birim', () => {
    assert.equal(toSI(1.6, 'mm', LENGTH_UNITS), 1.6e-3);
    assert.equal(fromSI(2.45e9, 'GHz', FREQUENCY_UNITS), 2.45);
    assert.ok(Math.abs(toSI(1, 'mil', LENGTH_UNITS) - 25.4e-6) < 1e-18);
    assert.throws(() => toSI(1, 'furlong', LENGTH_UNITS), RangeError);
  });
});

describe('doğrulama', () => {
  it('pozitiflik ve alt sınır', () => {
    assert.equal(checkPositive('W', 1), null);
    assert.match(checkPositive('W', 0), /sıfırdan büyük/);
    assert.match(checkPositive('W', null), /boş/);
    assert.match(checkPositive('W', NaN), /geçerli bir sayı/);
    assert.match(checkMin('εr', 0.5, 1), /en az 1/);
    assert.equal(checkNonNegative('x', 0), null);
  });
});
