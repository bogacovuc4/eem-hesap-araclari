// Başvuru tabloları: AWG tel ölçüleri (tanımdan hesaplanır).
import { assert } from './validate.js';

/** ASTM B258 tanımı: d = 0,127 mm · 92^((36 − n)/39). 0000 = −3, 000 = −2, 00 = −1. */
export function awgDiameter(n) {
  assert(Number.isInteger(n) && n >= -3 && n <= 40, 'AWG −3 (4/0) ile 40 arasında olmalı.');
  return 0.127e-3 * 92 ** ((36 - n) / 39);
}

/** AWG kesiti (m²) ve 20 °C’de bakır direnci (Ω/m, ρ = 1,724×10⁻⁸ Ω·m, IACS tavlanmış bakır). */
export function awgWire(n, rho = 1.724e-8) {
  const d = awgDiameter(n);
  const area = (Math.PI * d * d) / 4;
  return { n, d, area, rPerM: rho / area };
}

/** AWG adı: 0 → "0 (1/0)", −1 → "2/0", −3 → "4/0". */
export function awgName(n) {
  return n < 0 ? `${1 - n}/0` : n === 0 ? "0 (1/0)" : String(n);
}
