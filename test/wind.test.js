import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertClose } from './helpers.js';
import {
  BETZ_LIMIT, R_DRY_AIR, turbinePower, isaPressure, airDensity, windPowerLaw, windLogLaw,
} from '../src/calc/wind.js';

describe('türbin gücü', () => {
  it('Betz sınırı 16/27 ≈ 0,5926', () => {
    assertClose(BETZ_LIMIT, 0.592593, 1e-6);
  });

  it('D = 100 m, v = 10 m/s, ρ = 1,225, Cp = 0,4 → ≈ 1,924 MW', () => {
    const t = turbinePower({ rho: 1.225, diameter: 100, v: 10, cp: 0.4 });
    assertClose(t.area, 7853.98, 1e-6);
    assertClose(t.power, 1_924_225.5, 1e-6);
    assertClose(t.available, 4_810_563.75, 1e-6);
    assertClose(t.powerDensity, 612.5, 1e-12);
    assert.equal(t.exceedsBetz, false);
  });

  it('güç hızın küpüyle artar', () => {
    const a = turbinePower({ rho: 1.225, diameter: 10, v: 5, cp: 0.4 }).power;
    const b = turbinePower({ rho: 1.225, diameter: 10, v: 10, cp: 0.4 }).power;
    assertClose(b / a, 8, 1e-12);
  });

  it('Betz sınırını aşan Cp işaretlenir', () => {
    assert.equal(turbinePower({ rho: 1.225, diameter: 10, v: 5, cp: 0.6 }).exceedsBetz, true);
  });

  it('geçersiz girdide RangeError', () => {
    assert.throws(() => turbinePower({ rho: 1.225, diameter: 0, v: 5, cp: 0.4 }), RangeError);
    assert.throws(() => turbinePower({ rho: 1.225, diameter: 10, v: 5, cp: 1.2 }), RangeError);
  });
});

describe('hava yoğunluğu (ISA)', () => {
  it('R_d ≈ 287,05 J/(kg·K)', () => {
    assertClose(R_DRY_AIR, 287.05, 1e-4);
  });

  it('deniz seviyesi, 15 °C → 101 325 Pa, ρ ≈ 1,225 kg/m³', () => {
    assertClose(isaPressure(0), 101_325, 1e-12);
    assertClose(airDensity({ altitude: 0, temperatureC: 15 }).rho, 1.225, 1e-4);
  });

  it('1000 m, ISA sıcaklığı (8,5 °C) → p ≈ 89 875 Pa, ρ ≈ 1,1117 kg/m³ (ISA tablosu)', () => {
    const d = airDensity({ altitude: 1000, temperatureC: 8.5 });
    assertClose(d.pressure, 89_875, 1e-4);
    assertClose(d.rho, 1.1117, 1e-4);
    assertClose(d.isaTemperatureC, 8.5, 1e-9);
  });

  it('sıcak hava daha az yoğundur: 1000 m, 25 °C → ≈ 1,050 kg/m³', () => {
    assertClose(airDensity({ altitude: 1000, temperatureC: 25 }).rho, 1.0501, 1e-4);
  });

  it('troposfer dışında ve mutlak sıfırın altında RangeError', () => {
    assert.throws(() => isaPressure(12_000), RangeError);
    assert.throws(() => airDensity({ altitude: 0, temperatureC: -300 }), RangeError);
  });
});

describe('rüzgâr profili', () => {
  it('güç yasası: 10 m’de 5 m/s, α = 1/7 → 80 m’de ≈ 6,730 m/s', () => {
    assertClose(windPowerLaw({ v1: 5, h1: 10, h2: 80, alpha: 1 / 7 }), 6.7295, 1e-4);
  });

  it('logaritmik: 10 m’de 5 m/s, z0 = 0,03 m → 80 m’de ≈ 6,790 m/s', () => {
    assertClose(windLogLaw({ v1: 5, h1: 10, h2: 80, z0: 0.03 }), 6.7898, 1e-4);
  });

  it('aynı yükseklikte hız değişmez', () => {
    assert.equal(windPowerLaw({ v1: 7, h1: 50, h2: 50, alpha: 0.2 }), 7);
    assert.equal(windLogLaw({ v1: 7, h1: 50, h2: 50, z0: 0.1 }), 7);
  });

  it('h ≤ z0 için RangeError', () => {
    assert.throws(() => windLogLaw({ v1: 5, h1: 0.01, h2: 80, z0: 0.03 }), RangeError);
  });
});
