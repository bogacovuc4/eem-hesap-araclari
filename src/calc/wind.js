import { assert } from './validate.js';

/** Betz sınırı: ideal bir rotorun çekebileceği en yüksek güç katsayısı, 16/27 ≈ 0,593 */
export const BETZ_LIMIT = 16 / 27;

/** Deniz seviyesi standart hava yoğunluğu (ISA, 15 °C, 101 325 Pa), kg/m³ */
export const RHO_STANDARD = 1.225;

// ISA / US Standart Atmosfer 1976 sabitleri (troposfer, 0–11 km)
const P0 = 101_325; // Pa
const T0 = 288.15; // K
const LAPSE = 0.0065; // K/m
const G0 = 9.80665; // m/s²
const R_UNIVERSAL = 8.3144598; // J/(mol·K)
const M_AIR = 0.0289644; // kg/mol
export const R_DRY_AIR = R_UNIVERSAL / M_AIR; // ≈ 287,05 J/(kg·K)
const BARO_EXP = (G0 * M_AIR) / (R_UNIVERSAL * LAPSE); // ≈ 5,2558

// ---------------------------------------------------------------------------
// Türbin gücü
// ---------------------------------------------------------------------------

/**
 * P = ½·ρ·A·v³·Cp, A = π·D²/4.
 * Cp > Betz sınırı fiziksel olarak mümkün değildir; fonksiyon hesaplar, uyarıyı arayüz verir.
 */
export function turbinePower({ rho, diameter, v, cp }) {
  assert(rho > 0, 'Hava yoğunluğu sıfırdan büyük olmalı.');
  assert(diameter > 0, 'Rotor çapı sıfırdan büyük olmalı.');
  assert(v >= 0, 'Rüzgâr hızı negatif olamaz.');
  assert(cp > 0 && cp <= 1, 'Cp 0 ile 1 arasında olmalı.');
  const area = (Math.PI * diameter ** 2) / 4;
  const available = 0.5 * rho * area * v ** 3;
  return {
    area,
    available,
    power: available * cp,
    betzPower: available * BETZ_LIMIT,
    powerDensity: 0.5 * rho * v ** 3,
    exceedsBetz: cp > BETZ_LIMIT,
  };
}

// ---------------------------------------------------------------------------
// Hava yoğunluğu
// ---------------------------------------------------------------------------

/** ISA'ya göre yükseklikteki basınç (Pa), 0–11 km troposfer. */
export function isaPressure(altitude) {
  assert(altitude >= -500 && altitude <= 11_000, 'Yükseklik −500 m ile 11 000 m arasında olmalı (troposfer).');
  return P0 * (1 - (LAPSE * altitude) / T0) ** BARO_EXP;
}

/** ISA'ya göre yükseklikteki sıcaklık (K). */
export function isaTemperature(altitude) {
  return T0 - LAPSE * altitude;
}

/**
 * Kuru hava yoğunluğu: basınç ISA'dan (yüksekliğe göre), sıcaklık kullanıcının verdiği yerel değer.
 * ρ = p / (R_d · T)
 * @param altitude deniz seviyesinden yükseklik, m
 * @param temperatureC yerel hava sıcaklığı, °C
 */
export function airDensity({ altitude, temperatureC }) {
  const t = temperatureC + 273.15;
  assert(t > 0, 'Sıcaklık mutlak sıfırın üzerinde olmalı.');
  const pressure = isaPressure(altitude);
  const rho = pressure / (R_DRY_AIR * t);
  const isaT = isaTemperature(altitude);
  return {
    rho,
    pressure,
    isaTemperatureC: isaT - 273.15,
    isaRho: pressure / (R_DRY_AIR * isaT),
    ratioToStandard: rho / RHO_STANDARD,
  };
}

// ---------------------------------------------------------------------------
// Rüzgâr hızının yüksekliğe taşınması
// ---------------------------------------------------------------------------

/** Güç yasası: v2 = v1·(h2/h1)^α */
export function windPowerLaw({ v1, h1, h2, alpha }) {
  assert(v1 >= 0, 'Referans hız negatif olamaz.');
  assert(h1 > 0 && h2 > 0, 'Yükseklikler sıfırdan büyük olmalı.');
  assert(alpha >= 0 && alpha < 1, 'α 0 ile 1 arasında olmalı.');
  return v1 * (h2 / h1) ** alpha;
}

/** Logaritmik profil (nötr atmosfer): v2 = v1·ln(h2/z0)/ln(h1/z0) */
export function windLogLaw({ v1, h1, h2, z0 }) {
  assert(v1 >= 0, 'Referans hız negatif olamaz.');
  assert(z0 > 0, 'Pürüzlülük uzunluğu z0 sıfırdan büyük olmalı.');
  assert(h1 > z0 && h2 > z0, 'Yükseklikler pürüzlülük uzunluğu z0’dan büyük olmalı.');
  return v1 * Math.log(h2 / z0) / Math.log(h1 / z0);
}
