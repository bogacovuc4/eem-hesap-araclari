import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertClose } from './helpers.js';
import {
  decodeColorBands, encodeColorBands, colorsForRole, E96,
  decodeSmdResistor, encodeSmdResistor,
  decodeCapacitorCode, encodeCapacitorCode,
  decodeInductorCode, encodeInductorCode,
} from '../src/calc/codes.js';

describe('direnç renk kodu çözme', () => {
  it('sarı-mor-kırmızı-altın → 4,7 kΩ ±%5', () => {
    const r = decodeColorBands(['yellow', 'violet', 'red', 'gold']);
    assert.equal(r.value, 4700);
    assert.equal(r.tolerance, 5);
    assert.equal(r.min, 4465);
    assert.equal(r.max, 4935);
  });

  it('kahverengi-siyah-siyah-kırmızı-kahverengi (5 bant) → 10 kΩ ±%1', () => {
    const r = decodeColorBands(['brown', 'black', 'black', 'red', 'brown']);
    assert.equal(r.value, 10_000);
    assert.equal(r.tolerance, 1);
  });

  it('6 bant: … + kahverengi TCR → 100 ppm/K', () => {
    const r = decodeColorBands(['brown', 'black', 'black', 'red', 'brown', 'brown']);
    assert.equal(r.tcr, 100);
  });

  it('altın ve gümüş çarpan: sarı-mor-altın → 4,7 Ω; sarı-mor-gümüş → 0,47 Ω', () => {
    assert.equal(decodeColorBands(['yellow', 'violet', 'gold', 'gold']).value, 4.7);
    assert.equal(decodeColorBands(['yellow', 'violet', 'silver', 'gold']).value, 0.47);
  });

  it('3 bant → tolerans %20', () => {
    assert.equal(decodeColorBands(['brown', 'black', 'orange']).tolerance, 20);
  });

  it('geçersiz bant rengi RangeError verir', () => {
    assert.throws(() => decodeColorBands(['gold', 'black', 'red', 'gold']), RangeError);
    assert.throws(() => decodeColorBands(['brown', 'black', 'red', 'white']), RangeError);
  });

  it('ilk rakam bandında siyah önerilmez', () => {
    assert.ok(!colorsForRole('digit', { first: true }).some((c) => c.key === 'black'));
  });
});

describe('direnç renk kodu oluşturma', () => {
  it('4,7 kΩ (4 bant) → sarı-mor-kırmızı', () => {
    assert.deepEqual(encodeColorBands(4700, 2), ['yellow', 'violet', 'red']);
  });

  it('10 kΩ (5 bant) → kahverengi-siyah-siyah-kırmızı', () => {
    assert.deepEqual(encodeColorBands(10_000, 3), ['brown', 'black', 'black', 'red']);
  });

  it('küçük değerler: 0,47 Ω → sarı-mor-gümüş, 4,7 Ω → sarı-mor-altın', () => {
    assert.deepEqual(encodeColorBands(0.47, 2), ['yellow', 'violet', 'silver']);
    assert.deepEqual(encodeColorBands(4.7, 2), ['yellow', 'violet', 'gold']);
  });

  it('4,75 kΩ iki rakamla gösterilemez, üç rakamla gösterilir', () => {
    assert.throws(() => encodeColorBands(4750, 2), RangeError);
    assert.deepEqual(encodeColorBands(4750, 3), ['yellow', 'violet', 'green', 'brown']);
  });

  it('çözme ile gidiş-dönüş tutarlı', () => {
    for (const v of [1, 10, 22, 330, 4700, 56_000, 1e6, 0.1]) {
      const bands = encodeColorBands(v, 2);
      assert.equal(decodeColorBands([...bands, 'gold']).value, v);
    }
  });
});

describe('E96 serisi', () => {
  it('96 değer, artan sırada, 10^(i/96) formülüyle uyumlu', () => {
    assert.equal(E96.length, 96);
    E96.forEach((v, i) => {
      assert.equal(v, Math.round(100 * 10 ** (i / 96)), `indeks ${i + 1}`);
    });
  });
});

describe('SMD direnç kodu', () => {
  it('3 haneli: 472 → 4,7 kΩ, 103 → 10 kΩ, 100 → 10 Ω', () => {
    assert.equal(decodeSmdResistor('472').value, 4700);
    assert.equal(decodeSmdResistor('103').value, 10_000);
    assert.equal(decodeSmdResistor('100').value, 10);
  });

  it('4 haneli: 1002 → 10 kΩ, 4991 → 4,99 kΩ', () => {
    assert.equal(decodeSmdResistor('1002').value, 10_000);
    assert.equal(decodeSmdResistor('4991').value, 4990);
  });

  it('R gösterimi: 4R7 → 4,7 Ω, R47 → 0,47 Ω, 49R9 → 49,9 Ω', () => {
    assert.equal(decodeSmdResistor('4R7').value, 4.7);
    assert.equal(decodeSmdResistor('r47').value, 0.47);
    assert.equal(decodeSmdResistor('49R9').value, 49.9);
  });

  it('EIA-96: 01C → 10 kΩ, 68X → 49,9 Ω, 96D → 976 kΩ', () => {
    assert.equal(decodeSmdResistor('01C').value, 10_000);
    assertClose(decodeSmdResistor('68X').value, 49.9, 1e-12);
    assert.equal(decodeSmdResistor('96D').value, 976_000);
  });

  it('47R → 47 Ω (R ondalık), EIA-96 okuması not olarak verilir', () => {
    const r = decodeSmdResistor('47R');
    assert.equal(r.value, 47);
    assert.match(r.note, /3,01 Ω/);
  });

  it('0 / 000 → sıfır ohm köprü', () => {
    assert.equal(decodeSmdResistor('0').value, 0);
    assert.equal(decodeSmdResistor('000').value, 0);
  });

  it('geçersiz kod RangeError verir', () => {
    assert.throws(() => decodeSmdResistor('97A'), RangeError);
    assert.throws(() => decodeSmdResistor('abc'), RangeError);
    assert.throws(() => decodeSmdResistor(''), RangeError);
  });

  it('değerden koda', () => {
    assert.deepEqual(encodeSmdResistor(10_000), { three: '103', four: '1002', eia96: '01C' });
    assert.deepEqual(encodeSmdResistor(4700), { three: '472', four: '4701', eia96: null });
    assert.deepEqual(encodeSmdResistor(4.7), { three: '4R7', four: '4R70', eia96: null });
    assert.deepEqual(encodeSmdResistor(49.9), { three: null, four: '49R9', eia96: '68X' });
    assert.deepEqual(encodeSmdResistor(0.47), { three: 'R47', four: 'R470', eia96: null });
  });
});

describe('kondansatör kodu', () => {
  it('104 → 100 nF; 104K → ±%10', () => {
    assert.equal(decodeCapacitorCode('104').pF, 100_000);
    const c = decodeCapacitorCode('104K');
    assert.equal(c.pF, 100_000);
    assert.equal(c.tolerance.letter, 'K');
  });

  it('222J → 2,2 nF ±%5; 105 → 1 µF', () => {
    assert.equal(decodeCapacitorCode('222J').pF, 2200);
    assert.equal(decodeCapacitorCode('105').pF, 1e6);
  });

  it('küçük değerler: 47 → 47 pF, 4R7 → 4,7 pF, 109 → 1 pF, 108 → 0,1 pF', () => {
    assert.equal(decodeCapacitorCode('47').pF, 47);
    assert.equal(decodeCapacitorCode('4R7').pF, 4.7);
    assert.equal(decodeCapacitorCode('109').pF, 1);
    assert.equal(decodeCapacitorCode('108').pF, 0.1);
  });

  it('harf gösterimi: 4n7 → 4,7 nF, 2u2 → 2,2 µF, 4p7 → 4,7 pF, 100n → 100 nF', () => {
    assert.equal(decodeCapacitorCode('4n7').pF, 4700);
    assert.equal(decodeCapacitorCode('2µ2').pF, 2.2e6);
    assert.equal(decodeCapacitorCode('4p7').pF, 4.7);
    assert.equal(decodeCapacitorCode('100n').pF, 100_000);
  });

  it('ondalık değer µF kabul edilir: 0.1 → 100 nF', () => {
    assert.equal(decodeCapacitorCode('0.1').pF, 100_000);
  });

  it('değerden koda', () => {
    assert.deepEqual(encodeCapacitorCode(100_000), { three: '104', letter: '100n' });
    assert.deepEqual(encodeCapacitorCode(4.7), { three: '4R7', letter: '4p7' });
    assert.deepEqual(encodeCapacitorCode(2.2e6), { three: '225', letter: '2µ2' });
    assert.deepEqual(encodeCapacitorCode(4700), { three: '472', letter: '4n7' });
  });

  it('geçersiz kod RangeError verir', () => {
    assert.throws(() => decodeCapacitorCode('xyz'), RangeError);
  });
});

describe('bobin kodu', () => {
  it('101 → 100 µH, 100K → 10 µH ±%10', () => {
    assert.equal(decodeInductorCode('101').uH, 100);
    const l = decodeInductorCode('100K');
    assert.equal(l.uH, 10);
    assert.equal(l.tolerance.letter, 'K');
  });

  it('4R7 → 4,7 µH, R10 → 0,1 µH, 3N3 → 3,3 nH', () => {
    assert.equal(decodeInductorCode('4R7').uH, 4.7);
    assert.equal(decodeInductorCode('R10').uH, 0.1);
    assert.equal(decodeInductorCode('3n3').uH, 0.0033);
  });

  it('renk kodu µH cinsinden: kahverengi-siyah-siyah-altın → 10 µH ±%5', () => {
    const r = decodeColorBands(['brown', 'black', 'black', 'gold']);
    assert.equal(r.value, 10);
    assert.equal(r.tolerance, 5);
  });

  it('değerden koda', () => {
    assert.equal(encodeInductorCode(100), '101');
    assert.equal(encodeInductorCode(4.7), '4R7');
    assert.equal(encodeInductorCode(0.1), 'R10');
    assert.equal(encodeInductorCode(0.0033), '3N3');
    assert.equal(encodeInductorCode(4.75), null);
  });
});
