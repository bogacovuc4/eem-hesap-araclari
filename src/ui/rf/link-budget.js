import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { FREQUENCY_UNITS, DISTANCE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { linkBudget, linkRange, dbmToWatt } from '../../calc/rf.js';
import { svg, figure, wire, label, s } from '../schematic.js';

const db = (v, unit = 'dB') => `${formatNumber(v)} ${unit}`;

const commonFields = [
  { key: 'pt', label: 'Verici gücü Pt (dBm)', name: 'Pt', value: '20', constraint: 'any', hint: '20 dBm = 100 mW · 30 dBm = 1 W' },
  { key: 'gt', label: 'Verici anten kazancı Gt (dBi)', name: 'Gt', value: '6', constraint: 'any' },
  { key: 'gr', label: 'Alıcı anten kazancı Gr (dBi)', name: 'Gr', value: '3', constraint: 'any' },
  { key: 'f', label: 'Frekans f', name: 'Frekans', value: '2.4', units: FREQUENCY_UNITS, unit: 'GHz' },
  { key: 'losses', label: 'Ek kayıplar L (dB)', name: 'Ek kayıplar', value: '2', constraint: 'nonnegative', hint: 'Kablo, konnektör, polarizasyon uyumsuzluğu vb. toplamı' },
  { key: 'sens', label: 'Alıcı duyarlılığı (dBm)', name: 'Duyarlılık', value: '-90', constraint: 'any' },
];

/** Verici → mesafe → alıcı çizimi */
function antenna(x, y) {
  return s('g', {},
    wire([x, y], [x, y + 60]),
    s('polygon', { points: `${x - 14},${y} ${x + 14},${y} ${x},${y + 18}`, class: 'sch-line sch-body' }),
    wire([x - 18, y + 60], [x + 18, y + 60]));
}

function linkDiagram({ pt, gt, gr, pr, dText, fspl }) {
  const val = (v, unit) => (Number.isFinite(v) ? `${formatNumber(v, 3)} ${unit}` : '');
  return figure(svg([0, 0, 440, 150], 'Verici ve alıcı arasındaki bağlantı',
    antenna(70, 40),
    antenna(370, 40),
    s('line', { x1: 96, y1: 52, x2: 344, y2: 52, class: 'sch-line', 'stroke-dasharray': '6 5' }),
    s('polygon', { points: '344,47 354,52 344,57', class: 'sch-fill' }),
    label(220, 26, dText ? `d = ${dText}` : 'd', fspl ? `FSPL ${fspl}` : '', { anchor: 'middle' }),
    label(70, 122, 'Verici', `${val(pt, 'dBm')}${Number.isFinite(gt) ? ` · ${val(gt, 'dBi')}` : ''}`, { anchor: 'middle' }),
    label(370, 122, 'Alıcı', `${Number.isFinite(gr) ? val(gr, 'dBi') : ''}${Number.isFinite(pr) ? ` · ${val(pr, 'dBm')}` : ''}`, { anchor: 'middle' }),
  ));
}

const notes = [
  'Serbest uzay, görüş hattı (LOS) ve uzak alan varsayılır; yansıma, çok yollu yayılım, yağmur ve atmosfer zayıflaması yoktur.',
  'Antenler polarizasyon ve empedans açısından uyumlu kabul edilir; uyumsuzlukları “Ek kayıplar” alanına ekleyin.',
  'Kazançlar izotropik antene göre (dBi) girilmelidir. dBd değerini dBi’ye çevirmek için 2,15 dB ekleyin.',
  'Gerçek bağlantılarda birinci Fresnel bölgesinin en az %60’ının engelsiz olması önerilir; bu hesap engelleri içermez.',
];

const formulas = () => [
  formula(String.raw`P_r = P_t + G_t + G_r - \text{FSPL} - L,\qquad \text{FSPL} = 20\log_{10}\!\left(\frac{4\pi d f}{c}\right)\ \text{dB}`,
    'Pr = Pt + Gt + Gr − FSPL − L,  FSPL = 20·log10(4π·d·f / c) dB'),
];

export default {
  id: 'rf/link-budget',
  title: 'Friis / link bütçesi',
  render(container) {
    container.append(calculatorView({
      title: 'Friis iletim denklemi / link bütçesi',
      intro: 'Serbest uzayda alınan güç, bağlantı payı ve ulaşılabilecek en büyük mesafe.',
      modes: [
        {
          id: 'power',
          label: 'Alınan güç',
          build: () => calculatorPanel({
            fields: [
              ...commonFields.slice(0, 4),
              { key: 'd', label: 'Mesafe d', name: 'Mesafe', value: '1', units: DISTANCE_UNITS, unit: 'km' },
              ...commonFields.slice(4),
            ],
            compute(v) {
              const r = linkBudget({ pt: v.pt, gt: v.gt, gr: v.gr, f: v.f, d: v.d, losses: v.losses, sensitivity: v.sens });
              const warnings = r.margin < 0
                ? [`Alınan güç duyarlılığın ${formatNumber(-r.margin, 3)} dB altında: bağlantı kurulamaz.`]
                : r.margin < 10 ? ['Bağlantı payı 10 dB’den az: sönümlenme (fading) ve engeller için genellikle yetersizdir.'] : [];
              return {
                results: [
                  { label: 'Alınan güç Pr', value: db(r.pr, 'dBm') },
                  { label: 'Alınan güç (W)', value: formatSI(dbmToWatt(r.pr), 'W') },
                  { label: 'Serbest uzay kaybı FSPL', value: db(r.fspl) },
                  { label: 'EIRP (Pt + Gt)', value: db(r.eirp, 'dBm') },
                  { label: 'Bağlantı payı', value: db(r.margin) },
                ],
                warnings,
                raw: r,
              };
            },
            diagram: (v, out) => linkDiagram({
              pt: v.pt, gt: v.gt, gr: v.gr, pr: out?.raw.pr,
              dText: Number.isFinite(v.d) ? formatSI(v.d, 'm', 3) : '',
              fspl: out ? db(out.raw.fspl) : '',
            }),
            diagramTitle: 'Bağlantı',
            formulas: formulas(),
            notes,
          }),
        },
        {
          id: 'range',
          label: 'En büyük mesafe',
          build: () => calculatorPanel({
            fields: [
              ...commonFields,
              { key: 'margin', label: 'İstenen bağlantı payı (dB)', name: 'Pay', value: '10', constraint: 'nonnegative' },
            ],
            compute(v) {
              const r = linkRange({ pt: v.pt, gt: v.gt, gr: v.gr, f: v.f, losses: v.losses, sensitivity: v.sens, margin: v.margin });
              return {
                results: [
                  { label: 'En büyük mesafe', value: formatSI(r.distance, 'm') },
                  { label: 'İzin verilen en büyük yol kaybı', value: db(r.maxPathLoss) },
                ],
                warnings: r.maxPathLoss < 0 ? ['İzin verilen yol kaybı negatif: bu değerlerle bağlantı hiçbir mesafede kurulamaz.'] : [],
                raw: r,
              };
            },
            diagram: (v, out) => linkDiagram({
              pt: v.pt, gt: v.gt, gr: v.gr, pr: Number.isFinite(v.sens) ? v.sens + (v.margin || 0) : NaN,
              dText: out ? formatSI(out.raw.distance, 'm', 3) : '?',
              fspl: out ? db(out.raw.maxPathLoss) : '',
            }),
            diagramTitle: 'Bağlantı',
            formulas: [
              ...formulas(),
              formula(String.raw`d_{\max} = \frac{c}{4\pi f}\,10^{\,(P_t + G_t + G_r - L - S - M)/20}`,
                'd_max = c/(4π·f) · 10^((Pt + Gt + Gr − L − S − M)/20)'),
            ],
            notes,
          }),
        },
      ],
    }));
  },
};
