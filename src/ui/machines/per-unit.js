import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber, VOLTAGE_UNITS } from '../../calc/units.js';
import { perUnitBase, perUnitChangeBase } from '../../calc/power.js';

const S_UNITS = { kVA: 1e3, MVA: 1e6 };
const V_KV = { ...VOLTAGE_UNITS };

export default {
  id: 'machines/per-unit',
  title: 'Birim değer (pu) sistemi',
  render(container) {
    container.append(calculatorView({
      title: 'Birim değer (per-unit) sistemi',
      intro: 'Üç fazlı sistemde baz empedans ve akım, ohm ↔ pu dönüşümü ve baz değiştirme.',
      modes: [
        {
          id: 'base',
          label: 'Baz ve dönüşüm',
          build: () => calculatorPanel({
            fields: [
              { key: 'sb', label: 'Baz güç Sb (3 faz)', name: 'Sb', value: '100', units: S_UNITS, unit: 'MVA' },
              { key: 'vb', label: 'Baz gerilim Vb (hat)', name: 'Vb', value: '154', units: V_KV, unit: 'kV' },
              { key: 'z', label: 'Gerçek empedans Z (Ω)', name: 'Z', value: '20', constraint: 'nonnegative' },
              { key: 'i', label: 'Gerçek akım I (A)', name: 'I', value: '300', constraint: 'nonnegative' },
            ],
            compute(v) {
              const b = perUnitBase(v);
              return {
                results: [
                  { label: 'Baz empedans Zb = Vb²/Sb', value: formatSI(b.zb, 'Ω') },
                  { label: 'Baz akım Ib = Sb/(√3·Vb)', value: formatSI(b.ib, 'A') },
                  { label: 'Baz admitans Yb', value: formatSI(b.yb, 'S') },
                  { label: 'Z (pu)', value: formatNumber(v.z / b.zb, 5) },
                  { label: 'I (pu)', value: formatNumber(v.i / b.ib, 5) },
                ],
              };
            },
            formulas: [formula(String.raw`Z_b=\frac{V_b^2}{S_b},\qquad I_b=\frac{S_b}{\sqrt3\,V_b},\qquad Z_{pu}=\frac{Z_{\Omega}}{Z_b}`, 'Zb = Vb²/Sb,  Ib = Sb/(√3·Vb),  Zpu = Z/Zb')],
            notes: ['Vb hat (faz–faz) gerilimi, Sb üç fazlı toplam güçtür. Tek fazlı eşdeğerde aynı Zb elde edilir.', 'Trafonun iki tarafında baz gerilimler dönüştürme oranıyla seçilirse trafo pu’da ideal 1:1 olur.'],
          }),
        },
        {
          id: 'change',
          label: 'Baz değiştirme',
          build: () => calculatorPanel({
            fields: [
              { key: 'zpu', label: 'Eski bazda empedans (pu)', name: 'Zpu', value: '0.1', hint: 'Plaka değeri: %10 → 0,1' },
              { key: 'sOld', label: 'Eski baz güç', name: 'Sb,eski', value: '50', units: S_UNITS, unit: 'MVA' },
              { key: 'vOld', label: 'Eski baz gerilim', name: 'Vb,eski', value: '154', units: V_KV, unit: 'kV' },
              { key: 'sNew', label: 'Yeni baz güç', name: 'Sb,yeni', value: '100', units: S_UNITS, unit: 'MVA' },
              { key: 'vNew', label: 'Yeni baz gerilim', name: 'Vb,yeni', value: '154', units: V_KV, unit: 'kV' },
            ],
            compute(v) {
              const z = perUnitChangeBase(v);
              return {
                results: [
                  { label: 'Yeni bazda empedans', value: `${formatNumber(z, 5)} pu` },
                  { label: 'Yüzde olarak', value: `%${formatNumber(z * 100, 5)}` },
                  { label: 'Ohm karşılığı (yeni baz)', value: formatSI(z * (v.vNew ** 2 / v.sNew), 'Ω') },
                ],
              };
            },
            formulas: [formula(String.raw`Z_{pu}^{\text{yeni}}=Z_{pu}^{\text{eski}}\left(\frac{V_b^{\text{eski}}}{V_b^{\text{yeni}}}\right)^{2}\frac{S_b^{\text{yeni}}}{S_b^{\text{eski}}}`, 'Zpu,yeni = Zpu,eski·(Vb,eski/Vb,yeni)²·(Sb,yeni/Sb,eski)')],
            notes: ['Kısa devre ve yük akışı hesaplarında tüm elemanlar ortak baza çevrilir.'],
          }),
        },
      ],
    }));
  },
};
