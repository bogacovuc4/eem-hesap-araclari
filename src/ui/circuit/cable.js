import { calculatorView, calculatorPanel, verifyNote } from '../form.js';
import { formula } from '../formula.js';
import { CURRENT_UNITS, VOLTAGE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { cableSection, RESISTIVITY, STANDARD_SECTIONS } from '../../calc/circuit2.js';

const rhoHint = Object.entries(RESISTIVITY).map(([k, v]) => `${k} ${String(v).replace('.', ',')}`).join(' · ');

const SYSTEMS = {
  dc: { label: 'DC', voltage: '24', current: '10', k: '2', title: 'DC (gidiş-dönüş)' },
  '1ph': { label: 'Tek faz AC', voltage: '230', current: '16', k: '2', title: 'Tek faz AC (gidiş-dönüş)' },
  '3ph': { label: 'Üç faz AC', voltage: '400', current: '32', k: '√3', title: 'Üç faz AC (dengeli)' },
};

function panel(system) {
  const sys = SYSTEMS[system];
  const fields = [
    { key: 'i', label: 'Yük akımı I', name: 'I', value: sys.current, units: CURRENT_UNITS, unit: 'A' },
    { key: 'len', label: 'Hat uzunluğu (tek yön, m)', name: 'Uzunluk', value: '30', hint: 'Kaynaktan yüke olan mesafe; dönüş iletkeni formülde hesaba katılır' },
    { key: 'v', label: system === '3ph' ? 'Faz–faz gerilimi' : 'Nominal gerilim', name: 'V', value: sys.voltage, units: VOLTAGE_UNITS, unit: 'V' },
    { key: 'drop', label: 'İzin verilen gerilim düşümü (%)', name: 'Düşüm', value: '3', max: 99, hint: 'Aydınlatmada sıklıkla %3, diğer yüklerde %5 sınırı kullanılır' },
    { key: 'rho', label: 'Özdirenç ρ (Ω·mm²/m)', name: 'ρ', value: '0.0175', hint: `20 °C: ${rhoHint}` },
  ];
  if (system !== 'dc') fields.push({ key: 'pf', label: 'Güç faktörü cos φ', name: 'cos φ', value: '0.9', max: 1 });

  return calculatorPanel({
    fields,
    compute(v) {
      const r = cableSection({ current: v.i, length: v.len, voltage: v.v, dropPct: v.drop, rho: v.rho, system, pf: v.pf ?? 1 });
      const warnings = [];
      if (r.standard === null) warnings.push(`Gereken kesit en büyük standart kesitten (${STANDARD_SECTIONS.at(-1)} mm²) büyük: paralel iletken ya da daha yüksek gerilim düşünün.`);
      return {
        results: [
          { label: 'Gereken en küçük kesit', value: `${formatNumber(r.area)} mm²` },
          { label: 'Standart kesit (IEC 60228)', value: r.standard !== null ? `${String(r.standard).replace('.', ',')} mm²` : '—' },
          { label: 'Bu kesitle gerilim düşümü', value: r.standard !== null ? `${formatSI(r.dropV, 'V')} (%${formatNumber(r.dropPct, 3)})` : '—' },
          { label: 'Hattaki güç kaybı', value: r.standard !== null ? formatSI(r.lossW, 'W') : '—' },
          { label: 'İzin verilen düşüm', value: formatSI(r.allowedV, 'V') },
        ],
        warnings,
      };
    },
    formulas: [formula(
      system === 'dc'
        ? String.raw`A = \frac{2\,\rho\,L\,I}{\Delta V},\qquad \Delta V = \frac{\%\,\text{düşüm}}{100}\,V`
        : system === '1ph'
          ? String.raw`A = \frac{2\,\rho\,L\,I\cos\varphi}{\Delta V}`
          : String.raw`A = \frac{\sqrt{3}\,\rho\,L\,I\cos\varphi}{\Delta V}`,
      system === '3ph' ? 'A = √3·ρ·L·I·cos φ / ΔV' : system === '1ph' ? 'A = 2·ρ·L·I·cos φ / ΔV' : 'A = 2·ρ·L·I / ΔV',
    )],
    notes: [
      verifyNote('Bu hesap yalnızca gerilim düşümüne göredir. Kesit ayrıca iletkenin akım taşıma kapasitesine (döşeme biçimi, ortam sıcaklığı, gruplama — IEC 60364-5-52) ve koruma elemanına göre kontrol edilmelidir; daima büyük olan seçilir.'),
      'Hat reaktansı ihmal edilir (ince kesitlerde ve kısa hatlarda geçerli); büyük kesitlerde düşüm biraz daha yüksek çıkar.',
      'Özdirenç 20 °C içindir; 70 °C çalışma sıcaklığında bakırın direnci yaklaşık %20 artar.',
      'Elektrik tesisatı yönetmeliklere tabidir; gerçek bir tesisat için yetkili bir elektrik mühendisine danışın.',
    ],
  });
}

export default {
  id: 'circuit/cable',
  title: 'İletken kesiti',
  render(container) {
    container.append(calculatorView({
      title: 'İletken kesiti (gerilim düşümüne göre)',
      intro: 'Akım, hat uzunluğu ve izin verilen gerilim düşümünden gereken en küçük kablo kesiti.',
      modes: Object.entries(SYSTEMS).map(([id, sys]) => ({ id, label: sys.label, build: () => panel(id) })),
    }));
  },
};
