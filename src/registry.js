// Tüm hesaplayıcıların listesi. Yeni bir hesaplayıcı eklemek için
// görünüm modülünü içe aktarıp ilgili kategorinin listesine ekleyin.
import wavelength from './ui/rf/wavelength.js';
import microstrip from './ui/rf/microstrip.js';
import spiral from './ui/rf/spiral.js';
import decibel from './ui/rf/decibel.js';
import vswr from './ui/rf/vswr.js';

export const categories = [
  {
    id: 'rf',
    title: 'Anten / RF',
    calculators: [wavelength, microstrip, spiral, decibel, vswr],
  },
  {
    id: 'circuit',
    title: 'Devre',
    calculators: [],
  },
  {
    id: 'wind',
    title: 'Rüzgâr enerjisi',
    calculators: [],
  },
];

export function findCalculator(id) {
  for (const category of categories) {
    const found = category.calculators.find((calc) => calc.id === id);
    if (found) return found;
  }
  return null;
}
