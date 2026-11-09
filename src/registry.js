// Tüm hesaplayıcıların listesi. Yeni bir hesaplayıcı eklemek için
// görünüm modülünü içe aktarıp ilgili kategorinin listesine ekleyin.
import wavelength from './ui/rf/wavelength.js';
import microstrip from './ui/rf/microstrip.js';
import spiral from './ui/rf/spiral.js';
import decibel from './ui/rf/decibel.js';
import vswr from './ui/rf/vswr.js';
import divider from './ui/circuit/divider.js';
import led from './ui/circuit/led.js';
import filter from './ui/circuit/filter.js';
import rlc from './ui/circuit/rlc.js';
import opamp from './ui/circuit/opamp.js';
import turbine from './ui/wind/turbine.js';
import density from './ui/wind/density.js';
import profile from './ui/wind/profile.js';
import resistorColor from './ui/codes/resistor-color.js';
import smdResistor from './ui/codes/smd-resistor.js';
import capacitorCode from './ui/codes/capacitor-code.js';
import inductorCode from './ui/codes/inductor-code.js';

export const categories = [
  {
    id: 'rf',
    title: 'Anten / RF',
    calculators: [wavelength, microstrip, spiral, decibel, vswr],
  },
  {
    id: 'circuit',
    title: 'Devre',
    calculators: [divider, led, filter, rlc, opamp],
  },
  {
    id: 'wind',
    title: 'Rüzgâr enerjisi',
    calculators: [turbine, density, profile],
  },
  {
    id: 'codes',
    title: 'Bileşen kodları',
    calculators: [resistorColor, smdResistor, capacitorCode, inductorCode],
  },
];

export function findCalculator(id) {
  for (const category of categories) {
    const found = category.calculators.find((calc) => calc.id === id);
    if (found) return found;
  }
  return null;
}
