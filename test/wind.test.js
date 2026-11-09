import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertClose } from './helpers.js';
import {
  BETZ_LIMIT, R_DRY_AIR, turbinePower, isaPressure, airDensity, windPowerLaw, windLogLaw,
  weibullPdf, weibullCdf, weibullScaleFromMean, powerCurve, annualEnergy,
} from '../src/calc/wind.js';
import { gamma, simpson, besselJ0 } from '../src/calc/math.js';

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

describe('sayısal yardımcılar', () => {
  it('Γ(1,5) = √π/2, Γ(2,5) ≈ 1,32934, Γ(5) = 24', () => {
    assertClose(gamma(1.5), Math.sqrt(Math.PI) / 2, 1e-12);
    assertClose(gamma(2.5), 1.329340388, 1e-9);
    assertClose(gamma(5), 24, 1e-12);
  });

  it('Simpson: ∫₀^π sin x dx = 2; J0(0) = 1, J0(2,4048) ≈ 0 (ilk kök)', () => {
    assertClose(simpson(Math.sin, 0, Math.PI, 100), 2, 1e-7);
    assertClose(besselJ0(0), 1, 1e-12);
    assert.ok(Math.abs(besselJ0(2.404826)) < 1e-6);
  });
});

describe('Weibull ve yıllık enerji', () => {
  it('yoğunluk 1’e integre olur ve CDF ile tutarlı', () => {
    assertClose(simpson((v) => weibullPdf(v, 2, 8), 0, 80, 4000), 1, 1e-6);
    assertClose(simpson((v) => weibullPdf(v, 2.3, 7), 3, 12, 400), weibullCdf(12, 2.3, 7) - weibullCdf(3, 2.3, 7), 1e-8);
  });

  it('Rayleigh (k = 2): ortalama hız c·√π/2; c = 8 → 7,090 m/s', () => {
    assertClose(weibullScaleFromMean(7.0898154, 2), 8, 1e-6);
  });

  it('güç eğrisi bölgeleri', () => {
    const curve = { rated: 2e6, cutIn: 3, ratedSpeed: 12, cutOut: 25 };
    assert.equal(powerCurve(2.9, curve), 0);
    assert.equal(powerCurve(15, curve), 2e6);
    assert.equal(powerCurve(25, curve), 0);
    assertClose(powerCurve(12, curve), 2e6, 1e-12);
  });

  it('k = 2, c = 8 m/s, 2 MW türbin (3/12/25 m/s) → AEP ≈ 5265 MWh, KF ≈ %30,05', () => {
    // Referans: bağımsız Python hesabı (2·10⁶ adımlı orta nokta integrali) = 5265,30 MWh
    const r = annualEnergy({ k: 2, c: 8, rated: 2e6, cutIn: 3, ratedSpeed: 12, cutOut: 25 });
    assertClose(r.aep, 5265.30e6, 1e-4);
    assertClose(r.capacityFactor, 0.300531, 1e-4);
    assertClose(r.meanSpeed, 7.08982, 1e-5);
    assertClose(r.powerDensity, 416.881, 1e-5);
    assertClose(r.hoursAtRated, 0.1053418 * 8760, 1e-5);
  });

  it('aralıklara bölünmüş enerji toplamı AEP’ye eşit (±%0,5)', () => {
    const r = annualEnergy({ k: 2, c: 8, rated: 2e6, cutIn: 3, ratedSpeed: 12, cutOut: 25 });
    const sum = r.bins.reduce((s, b) => s + b.energy, 0);
    assertClose(sum, r.aep, 5e-3);
  });

  it('kullanılabilirlik AEP’yi orantılı düşürür', () => {
    const a = annualEnergy({ k: 2, c: 8, rated: 2e6, cutIn: 3, ratedSpeed: 12, cutOut: 25 });
    const b = annualEnergy({ k: 2, c: 8, rated: 2e6, cutIn: 3, ratedSpeed: 12, cutOut: 25, availability: 0.95 });
    assertClose(b.aep, a.aep * 0.95, 1e-12);
  });

  it('hız sırası yanlışsa RangeError', () => {
    assert.throws(() => annualEnergy({ k: 2, c: 8, rated: 1, cutIn: 12, ratedSpeed: 3, cutOut: 25 }), RangeError);
  });
});
