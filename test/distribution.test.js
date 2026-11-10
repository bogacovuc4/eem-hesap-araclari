import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertClose } from './helpers.js';
import {
  voltageDrop, distributedLine, parseLoads, shortCircuit, groundRod, groundStrip, groundPlate, lineCurrent,
} from '../src/calc/distribution.js';

describe('Gerilim düşümü (tek yük)', () => {
  it('reaktans ihmal edilince ΔU, ders kitabı formülüyle aynı: %e = 100·L·P/(k·S·U²)', () => {
    const r = voltageDrop({ system: '3ph', p: 20e3, u: 400, pf: 0.8, length: 100, area: 10, k: 56, x: 0 });
    assertClose(r.simplePct, 2.232143, 1e-6);
    assertClose(r.dropPct, r.simplePct, 1e-12);
  });

  it('tek fazda katsayı 200 (gidiş-dönüş)', () => {
    const r = voltageDrop({ system: '1ph', p: 3e3, u: 230, pf: 1, length: 30, area: 2.5, k: 56, x: 0 });
    assertClose(r.dropPct, (200 * 30 * 3000) / (56 * 2.5 * 230 ** 2), 1e-12);
    assertClose(r.current, 3000 / 230, 1e-12);
  });

  it('reaktanslı üç faz: ΔU = √3·I·L·(R′cosφ + X′sinφ) = 9,229 V', () => {
    const r = voltageDrop({ system: '3ph', p: 20e3, u: 400, pf: 0.8, length: 100, area: 10, k: 56, x: 0.08, allowedPct: 3 });
    assertClose(r.current, 36.0844, 1e-5);
    assertClose(r.dropV, 9.228571, 1e-6);
    assertClose(r.requiredArea, 7.631258, 1e-6);
    assert.equal(r.standard, 10);
  });

  it('kayıp: üç iletkende 3·I²·R', () => {
    const r = voltageDrop({ system: '3ph', p: 20e3, u: 400, pf: 0.8, length: 100, area: 10, k: 56, x: 0 });
    assertClose(r.loss, 3 * lineCurrent({ system: '3ph', p: 20e3, u: 400, pf: 0.8 }) ** 2 * (100 / 560), 1e-12);
  });

  it('reaktans tek başına izin verilen düşümü aşarsa kesit yok', () => {
    const r = voltageDrop({ system: '3ph', p: 500e3, u: 400, pf: 0.5, length: 1000, area: 240, k: 56, x: 0.08, allowedPct: 1 });
    assert.equal(r.requiredArea, null);
  });
});

describe('Çok yüklü dağıtım hattı', () => {
  const loads = parseLoads('50:3; 20:5');
  it('liste okunur, kW → W', () => {
    assert.deepEqual(loads, [{ d: 50, p: 3000 }, { d: 20, p: 5000 }]);
    assert.deepEqual(parseLoads('12,5 m : 2,5 kW'), [{ d: 12.5, p: 2500 }]);
    assert.throws(() => parseLoads('abc'), RangeError);
    assert.throws(() => parseLoads(''), RangeError);
  });

  it('uç düşümü yük momentleriyle aynı: ΣL·P = 250 kW·m', () => {
    const r = distributedLine({ system: '3ph', u: 400, pf: 1, area: 16, k: 56, x: 0, loads });
    assert.equal(r.moment, 250000);
    assertClose(r.maxDropPct, 0.174386, 1e-5);
    assertClose(r.maxDropPct, r.simplePct, 1e-12);
    assert.equal(r.points.length, 3);
    assertClose(r.segments[0].power, 8000, 1e-12);
    assertClose(r.segments[1].power, 3000, 1e-12);
  });

  it('kesit hesabı: bulunan kesitte uç düşüm tam izin verilen değer', () => {
    const base = { system: '3ph', u: 400, pf: 0.9, k: 35, x: 0.08, loads: parseLoads('100:20; 250:15; 400:10') };
    const r = distributedLine({ ...base, area: 50, allowedPct: 5 });
    const check = distributedLine({ ...base, area: r.requiredArea });
    assertClose(check.maxDropPct, 5, 1e-9);
  });
});

describe('Kısa devre akımı', () => {
  it('sonsuz şebeke, Pcu = 0, c = 1: I″k = In/uk', () => {
    const r = shortCircuit({ u: 400, c: 1, sn: 1e6, uk: 0.06 });
    assertClose(r.bus.ik, r.ratedCurrent / 0.06, 1e-12);
    assertClose(r.bus.ik, 24056.3, 1e-5);
    assertClose(r.bus.kappa, 2, 1e-12);
  });

  it('şebeke ve kablo eklenince akım azalır, κ 1 ile 2 arasında', () => {
    const r = shortCircuit({ u: 400, c: 1.05, skq: 500e6, sn: 1e6, uk: 0.06, pcu: 10.5e3, length: 50, area: 95, k: 56, x: 0.08 });
    assertClose(r.transformer.r, (10.5e3 * 400 ** 2) / 1e12, 1e-12);
    assert.ok(r.end.ik < r.bus.ik);
    assert.ok(r.end.kappa > 1 && r.end.kappa < r.bus.kappa);
    assertClose(r.bus.ip, r.bus.kappa * Math.SQRT2 * r.bus.ik, 1e-12);
  });
});

describe('Topraklama direnci', () => {
  it('çubuk: Dwight formülü ρ = 100 Ω·m, L = 2 m, d = 20 mm → 45,24 Ω', () => {
    const r = groundRod({ rho: 100, length: 2, diameter: 0.02, count: 2 });
    assertClose(r.r, 45.2367, 1e-5);
    assertClose(r.approx, 50, 1e-12);
    assertClose(r.parallel, r.r / 2, 1e-12);
  });

  it('şerit 2ρ/L, levha ρ/(4,5a)', () => {
    assertClose(groundStrip({ rho: 100, length: 10 }).r, 20, 1e-12);
    assertClose(groundPlate({ rho: 100, side: 1 }).r, 22.2222, 1e-5);
  });

  it('hatalı girişler', () => {
    assert.throws(() => groundRod({ rho: 100, length: 0.05, diameter: 0.02 }), RangeError);
    assert.throws(() => groundRod({ rho: 100, length: 2, diameter: 0.02, count: 1.5 }), RangeError);
  });
});
