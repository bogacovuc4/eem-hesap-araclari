// Sayısal yardımcılar: integral, Bessel J0, Gamma.

/** Bileşik Simpson integrali (n çift). */
export function simpson(f, a, b, n = 1000) {
  const steps = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / steps;
  let sum = f(a) + f(b);
  for (let i = 1; i < steps; i += 1) sum += (i % 2 ? 4 : 2) * f(a + i * h);
  return (sum * h) / 3;
}

/** Birinci tür sıfırıncı mertebe Bessel fonksiyonu: J0(x) = (1/π)∫₀^π cos(x·sin τ) dτ */
export function besselJ0(x) {
  return simpson((t) => Math.cos(x * Math.sin(t)), 0, Math.PI, 200) / Math.PI;
}

// Lanczos yaklaşımı (g = 7, n = 9); çift duyarlıkta ~15 anlamlı basamak.
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012,
  9.9843695780195716e-6, 1.5056327351493116e-7,
];

/** Gamma fonksiyonu Γ(x). */
export function gamma(x) {
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  const z = x - 1;
  let a = LANCZOS[0];
  const t = z + 7.5;
  for (let i = 1; i < 9; i += 1) a += LANCZOS[i] / (z + i);
  return Math.sqrt(2 * Math.PI) * t ** (z + 0.5) * Math.exp(-t) * a;
}
