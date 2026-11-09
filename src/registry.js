// Tüm hesaplayıcıların listesi. Yeni bir hesaplayıcı eklemek için
// görünüm modülünü içe aktarıp ilgili kategorinin listesine ekleyin.
import microstrip from './ui/rf/microstrip.js';

export const categories = [
  {
    id: 'rf',
    title: 'Anten / RF',
    calculators: [microstrip],
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
