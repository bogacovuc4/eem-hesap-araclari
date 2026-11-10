// Elektromanyetik sayfalarında ortak birim tabloları.
export const CHARGE_UNITS = { pC: 1e-12, nC: 1e-9, 'µC': 1e-6, mC: 1e-3, C: 1 };
export const SMALL_LENGTH = { 'µm': 1e-6, mm: 1e-3, cm: 1e-2, m: 1 };
export const AREA_UNITS = { 'mm²': 1e-6, 'cm²': 1e-4, 'm²': 1 };

export const EPS_FIELD = {
  key: 'er', label: 'Bağıl geçirgenlik εr', name: 'εr', value: '1', min: 1,
  hint: 'Hava ≈ 1, PTFE ≈ 2,1, FR-4 ≈ 4,4, su ≈ 80',
};
export const MU_FIELD = {
  key: 'mur', label: 'Bağıl manyetik geçirgenlik μr', name: 'μr', value: '1', min: 1,
  hint: 'Hava/bakır ≈ 1; ferrit ve demir çekirdekte yüzlerce–binlerce (doğrusal varsayılır)',
};
