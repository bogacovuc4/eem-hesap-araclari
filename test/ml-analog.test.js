import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertClose } from './helpers.js';
import { confusionMetrics, parsePairs, linearRegression, activation } from '../src/calc/ml.js';
import { mosfet, sizeForCurrent, commonSource, currentMirror } from '../src/calc/analog.js';

describe('Karışıklık matrisi', () => {
  const m = confusionMetrics({ tp: 40, fn: 10, fp: 5, tn: 45 });
  it('doğruluk, kesinlik, duyarlılık, özgüllük, F1, MCC', () => {
    assertClose(m.accuracy, 0.85, 1e-12);
    assertClose(m.precision, 40 / 45, 1e-12);
    assertClose(m.recall, 0.8, 1e-12);
    assertClose(m.specificity, 0.9, 1e-12);
    assertClose(m.f1, 80 / 95, 1e-12);
    assertClose(m.mcc, 0.703526, 1e-5);
    assertClose(m.balancedAccuracy, 0.85, 1e-12);
  });
  it('tanımsız oranlar null, hatalı giriş reddedilir', () => {
    const z = confusionMetrics({ tp: 0, fn: 0, fp: 0, tn: 10 });
    assert.equal(z.precision, null);
    assert.equal(z.recall, null);
    assert.equal(z.mcc, null);
    assert.throws(() => confusionMetrics({ tp: 1.5, fn: 0, fp: 0, tn: 0 }), RangeError);
    assert.throws(() => confusionMetrics({ tp: 0, fn: 0, fp: 0, tn: 0 }), RangeError);
  });
});

describe('Doğrusal regresyon', () => {
  it('veri okuma: virgül, boşluk, ondalık virgül', () => {
    assert.deepEqual(parsePairs('1, 2\n3 4; 1.5,2.5'), [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 1.5, y: 2.5 }]);
    assert.deepEqual(parsePairs('1,5 2,5'), [{ x: 1.5, y: 2.5 }]);
    assert.throws(() => parsePairs('1 2 3'), RangeError);
    assert.throws(() => parsePairs('a, b'), RangeError);
  });
  it('y = 2,2 + 0,6x, R² = 0,6', () => {
    const r = linearRegression(parsePairs('1,2; 2,4; 3,5; 4,4; 5,5'));
    assertClose(r.slope, 0.6, 1e-12);
    assertClose(r.intercept, 2.2, 1e-12);
    assertClose(r.r2, 0.6, 1e-12);
    assertClose(r.rmse, Math.sqrt(2.4 / 5), 1e-12);
    assertClose(r.predict(10), 8.2, 1e-12);
  });
  it('tek x değeri hata verir', () => {
    assert.throws(() => linearRegression([{ x: 1, y: 1 }, { x: 1, y: 2 }]), RangeError);
  });
});

describe('Aktivasyon fonksiyonları', () => {
  it('sigmoid(0) = 0,5, türevi 0,25; tanh′(0) = 1; ReLU; leaky', () => {
    assertClose(activation('sigmoid', 0).y, 0.5, 1e-12);
    assertClose(activation('sigmoid', 0).dy, 0.25, 1e-12);
    assertClose(activation('tanh', 0).dy, 1, 1e-12);
    assert.equal(activation('relu', -3).y, 0);
    assert.equal(activation('relu', 3).dy, 1);
    assertClose(activation('leaky', -2, 0.1).y, -0.2, 1e-12);
  });
  it('softplus büyük x’te taşmaz', () => {
    assertClose(activation('softplus', 1000).y, 1000, 1e-12);
    assertClose(activation('softplus', 0).y, Math.log(2), 1e-12);
  });
});

describe('MOSFET kare yasası', () => {
  const dev = { k: 200e-6, wl: 10, vth: 0.45, lambda: 0.1 };
  it('doyma: ID, gm = 2ID/VOV, ro = 1/(λ·ID0), gm·ro', () => {
    const m = mosfet({ ...dev, vgs: 0.8, vds: 1 });
    assert.equal(m.region, 'saturation');
    assertClose(m.id, 1.3475e-4, 1e-9);
    assertClose(m.gm, (2 * m.id) / 0.35, 1e-9);
    assertClose(m.ro, 1 / (0.1 * 1.225e-4), 1e-9);
    assertClose(m.intrinsicGain, (2 * 1.1) / (0.1 * 0.35), 1e-9);
  });
  it('doğrusal bölge ve kesim', () => {
    const t = mosfet({ ...dev, vgs: 0.8, vds: 0.1 });
    assert.equal(t.region, 'triode');
    assertClose(t.id, 2e-3 * (0.35 * 0.1 - 0.005), 1e-9);
    assert.equal(mosfet({ ...dev, vgs: 0.3, vds: 1 }).region, 'cutoff');
  });
  it('tasarım: W/L = 2ID/(μCox·VOV²)', () => {
    assertClose(sizeForCurrent({ k: 200e-6, id: 1.225e-4, vov: 0.35 }).wl, 10, 1e-9);
  });
});

describe('Ortak kaynaklı kuvvetlendirici', () => {
  it('λ = 0: ID = 122,5 µA, Av = −gm·RD = −3,5', () => {
    const r = commonSource({ vdd: 1.8, rd: 5e3, k: 200e-6, wl: 10, vgs: 0.8, vth: 0.45, lambda: 0 });
    assert.equal(r.region, 'saturation');
    assertClose(r.id, 1.225e-4, 1e-9);
    assertClose(r.vout, 1.1875, 1e-9);
    assertClose(r.gain, -3.5, 1e-9);
  });
  it('λ > 0: devre denklemi sağlanır, kazanç RD ∥ ro ile düşer', () => {
    const r = commonSource({ vdd: 1.8, rd: 8e3, k: 200e-6, wl: 10, vgs: 0.8, vth: 0.45, lambda: 0.1, cl: 1e-12 });
    assert.equal(r.region, 'saturation');
    assertClose(r.vout, 1.8 - r.id * 8e3, 1e-9);
    assertClose(r.id, 1.225e-4 * (1 + 0.1 * r.vout), 1e-9);
    assert.ok(Math.abs(r.gain) < r.gm * 8e3);
    assertClose(r.f3db, 1 / (2 * Math.PI * r.rout * 1e-12), 1e-12);
  });
  it('büyük RD: doğrusal bölgeye düşer, KVL sağlanır', () => {
    const r = commonSource({ vdd: 1.8, rd: 100e3, k: 200e-6, wl: 10, vgs: 0.8, vth: 0.45 });
    assert.equal(r.region, 'triode');
    const m = mosfet({ k: 200e-6, wl: 10, vgs: 0.8, vth: 0.45, vds: r.vout });
    assertClose(m.id, (1.8 - r.vout) / 100e3, 1e-6);
  });
});

describe('Akım aynası', () => {
  it('λ = 0: Iout = Iref·oran', () => {
    const r = currentMirror({ iref: 100e-6, k: 200e-6, wl1: 10, wl2: 20, vth: 0.45, lambda: 0, vout: 1 });
    assertClose(r.iout, 200e-6, 1e-9);
    assertClose(r.vov, Math.sqrt(0.1), 1e-9);
  });
  it('λ > 0: Iout = Iref·oran·(1 + λVout)/(1 + λVGS)', () => {
    const r = currentMirror({ iref: 100e-6, k: 200e-6, wl1: 10, wl2: 10, vth: 0.45, lambda: 0.1, vout: 1.2 });
    assertClose(r.iout, (100e-6 * (1 + 0.1 * 1.2)) / (1 + 0.1 * r.vgs), 1e-9);
    assertClose(r.rout, 1 / (0.1 * r.iout0), 1e-12);
  });
});
