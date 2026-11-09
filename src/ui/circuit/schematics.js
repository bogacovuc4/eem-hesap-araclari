// Devre hesaplayıcılarının şemaları. Her fonksiyon bilinen değerleri bileşenlerin
// yanına yazar; bilinmeyen (hesaplanacak) büyüklükler "?" ile gösterilir.
import {
  svg, figure, twoTerminal, wire, ground, dot, terminal, currentArrow, opamp, label, fmt,
} from '../schematic.js';

/** Gerilim bölücü. v: { vin, r1, r2, vout } (SI) */
export function dividerSchematic({ vin, r1, r2, vout }) {
  return figure(svg([0, 40, 360, 160], 'Gerilim bölücü devresi',
    twoTerminal('source', [70, 60], [70, 170]),
    wire([70, 60], [180, 60]),
    twoTerminal('resistor', [180, 60], [180, 115]),
    twoTerminal('resistor', [180, 115], [180, 170]),
    wire([180, 115], [290, 115]),
    wire([70, 170], [290, 170]),
    dot(180, 115), dot(180, 170),
    terminal(290, 115), terminal(290, 170),
    ground(125, 170),
    label(50, 111, 'Vin', fmt(vin, 'V'), { anchor: 'end' }),
    label(196, 84, 'R1', fmt(r1, 'Ω'), { unknown: true }),
    label(196, 139, 'R2', fmt(r2, 'Ω'), { unknown: true }),
    label(302, 139, 'Vout', fmt(vout, 'V'), { unknown: true }),
  ));
}

/** LED seri direnci. v: { vs, vf, current, r } */
export function ledSchematic({ vs, vf, current, r }) {
  return figure(svg([0, 10, 380, 198], 'LED seri direnç devresi',
    twoTerminal('source', [70, 60], [70, 180]),
    twoTerminal('resistor', [70, 60], [200, 60]),
    wire([200, 60], [280, 60]),
    currentArrow(240, 60),
    twoTerminal('led', [280, 60], [280, 180]),
    wire([70, 180], [280, 180]),
    ground(175, 180),
    label(50, 116, 'Vs', fmt(vs, 'V'), { anchor: 'end' }),
    label(135, 28, 'R', fmt(r, 'Ω'), { anchor: 'middle', unknown: true }),
    label(240, 28, 'I', fmt(current, 'A'), { anchor: 'middle' }),
    label(310, 116, 'LED', vf !== undefined && Number.isFinite(vf) ? `Vf ${fmt(vf, 'V')}` : ''),
  ));
}

/**
 * Birinci derece filtre. series/shunt: { kind, name, value }
 * Seri eleman girişten çıkışa, paralel eleman çıkış ile toprak arasındadır.
 */
function firstOrder(series, shunt, title, caption) {
  return figure(svg([0, 10, 300, 180], title,
    twoTerminal('ac', [60, 60], [60, 160]),
    twoTerminal(series.kind, [60, 60], [180, 60]),
    wire([180, 60], [255, 60]),
    twoTerminal(shunt.kind, [180, 60], [180, 160]),
    wire([60, 160], [255, 160]),
    dot(180, 60), dot(180, 160),
    terminal(255, 60), terminal(255, 160),
    ground(120, 160),
    label(42, 114, 'vin', '', { anchor: 'end' }),
    label(120, 28, series.name, series.value, { anchor: 'middle' }),
    label(198, 106, shunt.name, shunt.value),
    label(264, 114, 'vout', ''),
  ), caption);
}

/** RC filtre: alçak ve yüksek geçiren yan yana. v: { r, c } */
export function rcSchematics({ r, c }) {
  const R = { kind: 'resistor', name: 'R', value: fmt(r, 'Ω') };
  const C = { kind: 'capacitor', name: 'C', value: fmt(c, 'F') };
  return [
    firstOrder(R, C, 'RC alçak geçiren filtre', 'Alçak geçiren (çıkış C üzerinden)'),
    firstOrder(C, R, 'RC yüksek geçiren filtre', 'Yüksek geçiren (çıkış R üzerinden)'),
  ];
}

/** RL filtre: alçak ve yüksek geçiren yan yana. v: { r, l } */
export function rlSchematics({ r, l }) {
  const R = { kind: 'resistor', name: 'R', value: fmt(r, 'Ω') };
  const L = { kind: 'inductor', name: 'L', value: fmt(l, 'H') };
  return [
    firstOrder(L, R, 'RL alçak geçiren filtre', 'Alçak geçiren (çıkış R üzerinden)'),
    firstOrder(R, L, 'RL yüksek geçiren filtre', 'Yüksek geçiren (çıkış L üzerinden)'),
  ];
}

/** Seri RLC. v: { r, l, c, f0 } */
export function rlcSchematic({ r, l, c, f0 }) {
  return figure(svg([0, 10, 370, 188], 'Seri RLC devresi',
    twoTerminal('ac', [80, 60], [80, 170]),
    twoTerminal('resistor', [80, 60], [180, 60]),
    twoTerminal('inductor', [180, 60], [290, 60]),
    twoTerminal('capacitor', [290, 60], [290, 170]),
    wire([80, 170], [290, 170]),
    ground(185, 170),
    label(60, 111, 'f₀', fmt(f0, 'Hz'), { anchor: 'end', unknown: true }),
    label(130, 28, 'R', fmt(r, 'Ω'), { anchor: 'middle' }),
    label(235, 28, 'L', fmt(l, 'H'), { anchor: 'middle' }),
    label(308, 111, 'C', fmt(c, 'F')),
  ));
}

/** Evirmeyen op-amp. v: { vin, rf, rg, vout } */
export function nonInvertingSchematic({ vin, rf, rg, vout }) {
  return figure(svg([0, 55, 360, 220], 'Evirmeyen op-amp kuvvetlendirici',
    twoTerminal('source', [70, 90], [70, 160]),
    ground(70, 160),
    wire([70, 90], [180, 90]),
    wire([180, 130], [150, 130], [150, 190]),
    twoTerminal('resistor', [150, 190], [290, 190]),
    wire([290, 190], [290, 110]),
    twoTerminal('resistor', [150, 190], [150, 250]),
    ground(150, 250),
    wire([240, 110], [320, 110]),
    opamp(180, 110, '+'),
    dot(150, 190), dot(290, 110),
    terminal(320, 110),
    label(50, 121, 'Vin', fmt(vin, 'V'), { anchor: 'end' }),
    label(220, 158, 'Rf', fmt(rf, 'Ω'), { anchor: 'middle' }),
    label(166, 216, 'Rg', fmt(rg, 'Ω')),
    label(320, 76, 'Vout', fmt(vout, 'V'), { anchor: 'middle', unknown: true }),
  ));
}

/** Eviren op-amp. v: { vin, rf, rin, vout } */
export function invertingSchematic({ vin, rf, rin, vout }) {
  return figure(svg([0, -8, 360, 183], 'Eviren op-amp kuvvetlendirici',
    twoTerminal('source', [70, 90], [70, 155]),
    ground(70, 155),
    twoTerminal('resistor', [70, 90], [150, 90]),
    wire([150, 90], [180, 90]),
    wire([150, 90], [150, 40]),
    twoTerminal('resistor', [150, 40], [290, 40]),
    wire([290, 40], [290, 110]),
    wire([180, 130], [160, 130], [160, 145]),
    ground(160, 145),
    wire([240, 110], [320, 110]),
    opamp(180, 110, '−'),
    dot(150, 90), dot(290, 110),
    terminal(320, 110),
    label(50, 118, 'Vin', fmt(vin, 'V'), { anchor: 'end' }),
    label(110, 60, 'Rin', fmt(rin, 'Ω'), { anchor: 'middle' }),
    label(220, 12, 'Rf', fmt(rf, 'Ω'), { anchor: 'middle' }),
    label(320, 76, 'Vout', fmt(vout, 'V'), { anchor: 'middle', unknown: true }),
  ));
}
