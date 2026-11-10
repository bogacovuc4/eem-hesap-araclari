import { calculatorView, calculatorPanel, verifyNote } from '../form.js';
import { formula } from '../formula.js';
import { VOLTAGE_UNITS, DISTANCE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { shortCircuit } from '../../calc/distribution.js';
import { svg, figure, wire, label, s, fmt } from '../schematic.js';

const ohm = (z) => formatSI(z, 'Ω', 4);

function fault(x, y, name) {
  return s('g', {},
    s('path', { d: `M ${x} ${y} l 8 10 l -6 0 l 8 12`, class: 'sch-line', fill: 'none', stroke: 'var(--red)' }),
    label(x + 14, y + 20, name, '', {}));
}

function singleLine(v, r) {
  const y = 66;
  const busX = 250;
  return figure(svg([-8, -10, 480, 160], 'Tek hat şeması: şebeke, transformatör, AG barası, kablo',
    s('rect', { x: 10, y: y - 18, width: 36, height: 36, class: 'sch-line', fill: 'none' }),
    s('path', { d: `M 14 ${y + 18} L 46 ${y - 18} M 10 ${y} L 46 ${y}`, class: 'sch-line' }),
    label(28, y + 40, 'Şebeke', v.skq ? `${formatNumber(v.skq / 1e6, 4)} MVA` : '∞', { anchor: 'middle' }),
    wire([46, y], [110, y]),
    s('circle', { cx: 128, cy: y, r: 18, class: 'sch-line', fill: 'none' }),
    s('circle', { cx: 150, cy: y, r: 18, class: 'sch-line', fill: 'none' }),
    label(139, y + 40, 'Trafo', fmt(v.sn, 'VA'), { anchor: 'middle' }),
    label(139, y - 46, 'uk', Number.isFinite(v.uk) ? `%${formatNumber(v.uk * 100, 3)}` : '', { anchor: 'middle' }),
    wire([168, y], [busX, y]),
    s('line', { x1: busX, y1: y - 30, x2: busX, y2: y + 30, class: 'sch-line', 'stroke-width': 5 }),
    label(busX, y + 46, 'AG bara', fmt(v.u, 'V'), { anchor: 'middle' }),
    fault(busX + 6, y - 50, 'F1'),
    ...(v.len > 0 ? [
      wire([busX, y], [430, y]),
      label(340, y - 30, 'Kablo', `${fmt(v.len, 'm')} · ${formatNumber(v.a, 4)} mm²`, { anchor: 'middle' }),
      fault(430, y - 4, 'F2'),
    ] : []),
    r ? label(busX + 70, y + 26, 'I″k (F1)', fmt(r.bus.ik, 'A'), { unknown: true }) : null,
  ), 'F1: bara, F2: kablo sonu. Empedanslar AG tarafına indirgenir.');
}

export default {
  id: 'distribution/short-circuit',
  title: 'Kısa devre akımı',
  render(container) {
    container.append(calculatorView({
      title: 'Kısa devre akımı (AG, üç fazlı)',
      intro: 'Şebeke, dağıtım transformatörü ve kablo empedanslarından barada ve kablo sonunda simetrik kısa devre akımı ve darbe akımı.',
      modes: [{
        id: 'sc3',
        label: 'Üç fazlı kısa devre',
        build: () => calculatorPanel({
          fields: [
            { key: 'u', label: 'AG nominal gerilimi (faz–faz)', name: 'U', value: '400', units: VOLTAGE_UNITS, unit: 'V' },
            { key: 'c', label: 'Gerilim katsayısı c', name: 'c', value: '1.05', min: 0.9, max: 1.2, hint: 'En büyük akım için AG’de 1,05 (tolerans %6) ya da 1,10 (%10)' },
            { key: 'skq', label: 'Şebeke kısa devre gücü S″kQ (MVA)', name: 'S″kQ', value: '500', constraint: 'nonnegative', hint: '0 girilirse sonsuz güçlü şebeke' },
            { key: 'sn', label: 'Trafo gücü Sn (kVA)', name: 'Sn', value: '1000' },
            { key: 'uk', label: 'Kısa devre gerilimi uk (%)', name: 'uk', value: '6', max: 50, hint: 'Dağıtım trafolarında tipik %4–6' },
            { key: 'pcu', label: 'Trafo bakır kaybı Pcu (kW)', name: 'Pcu', value: '10.5', constraint: 'nonnegative', hint: '0 girilirse trafo direnci ihmal edilir' },
            { key: 'len', label: 'Kablo uzunluğu (bara → arıza)', name: 'L', value: '50', units: DISTANCE_UNITS, unit: 'm', constraint: 'nonnegative', hint: '0 girilirse yalnız bara hesaplanır' },
            { key: 'a', label: 'Kablo kesiti S (mm²)', name: 'S', value: '95' },
            { key: 'k', label: 'İletkenlik k (m/Ω·mm²)', name: 'k', value: '56', hint: 'Bakır 56 · alüminyum 35' },
            { key: 'x', label: 'Kablo reaktansı x (Ω/km)', name: 'x', value: '0.08', constraint: 'nonnegative' },
          ],
          compute(v) {
            const r = shortCircuit({
              u: v.u, c: v.c, skq: v.skq > 0 ? v.skq * 1e6 : null, sn: v.sn * 1e3, uk: v.uk / 100, pcu: v.pcu * 1e3,
              length: v.len, area: v.a, k: v.k, x: v.x,
            });
            const results = [
              { label: 'Barada I″k3 (F1)', value: formatSI(r.bus.ik, 'A') },
              { label: 'Barada darbe akımı ip', value: `${formatSI(r.bus.ip, 'A')} (κ = ${formatNumber(r.bus.kappa, 3)})` },
            ];
            if (r.end) {
              results.push(
                { label: 'Kablo sonunda I″k3 (F2)', value: formatSI(r.end.ik, 'A') },
                { label: 'Kablo sonunda ip', value: `${formatSI(r.end.ip, 'A')} (κ = ${formatNumber(r.end.kappa, 3)})` },
              );
            }
            results.push(
              { label: 'Barada kısa devre gücü S″k', value: formatSI(r.bus.sk, 'VA') },
              { label: 'Trafo anma akımı In', value: formatSI(r.ratedCurrent, 'A') },
              { label: 'Şebeke Rq + jXq', value: `${ohm(r.grid.r)} + j${ohm(r.grid.x)}` },
              { label: 'Trafo RT + jXT', value: `${ohm(r.transformer.r)} + j${ohm(r.transformer.x)}` },
            );
            if (r.cable) results.push({ label: 'Kablo R + jX', value: `${ohm(r.cable.r)} + j${ohm(r.cable.x)}` });
            results.push({ label: 'Toplam |Z| (bara / kablo sonu)', value: `${ohm(r.bus.z)}${r.end ? ` / ${ohm(r.end.z)}` : ''}` });
            return { results, raw: r };
          },
          diagram: (v, out) => singleLine({ ...v, sn: v.sn * 1e3, uk: v.uk / 100, skq: v.skq > 0 ? v.skq * 1e6 : null }, out?.raw ?? null),
          diagramTitle: 'Tek hat şeması',
          formulas: [
            formula(String.raw`Z_Q = \frac{c\,U^2}{S''_{kQ}},\quad Z_T = \frac{u_k\,U^2}{S_n},\quad R_T = \frac{P_{cu}\,U^2}{S_n^2},\quad R_K = \frac{L}{k\,S}`,
              'ZQ = c·U²/S″kQ,  ZT = uk·U²/Sn,  RT = Pcu·U²/Sn²,  RK = L/(k·S)'),
            formula(String.raw`I''_{k3} = \frac{c\,U}{\sqrt3\,|Z_Q + Z_T + Z_K|},\qquad i_p = \kappa\sqrt2\,I''_{k3},\quad \kappa = 1{,}02 + 0{,}98\,e^{-3R/X}`,
              'I″k3 = c·U/(√3·|Z|),  ip = κ·√2·I″k3,  κ = 1,02 + 0,98·e^(−3R/X)'),
          ],
          notes: [
            'IEC 60909’un sadeleştirilmiş hâli: şebeke için Xq = 0,995·Zq, Rq = 0,1·Xq alınır; motor katkısı ve ark direnci ihmal edilir.',
            verifyNote('Trafo empedans düzeltme katsayısı KT ve kablonun arıza sıcaklığındaki direnci hesaba katılmamıştır; kesin değerler için IEC 60909-0’a göre hesap yapın.'),
            'Koruma elemanlarının kesme kapasitesi (Icu) I″k’dan, dinamik dayanımı ip’den büyük seçilmelidir.',
            'Faz–toprak (tek fazlı) kısa devre ve en küçük kısa devre akımı (c = 0,95, koruma seçiciliği için) bu sürümde yok.',
          ],
        }),
      }],
    }));
  },
};
