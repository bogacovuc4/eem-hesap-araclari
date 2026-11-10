import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, VOLTAGE_UNITS, RESISTANCE_UNITS, CURRENT_UNITS } from '../../calc/units.js';
import { zenerRegulator, zenerDesign } from '../../calc/electronics.js';

const V = (key, label, value) => ({ key, label, name: label, value, units: VOLTAGE_UNITS, unit: 'V' });

export default {
  id: 'electronics/zener',
  title: 'Zener regülatör',
  render(container) {
    container.append(calculatorView({
      title: 'Zener diyotlu gerilim regülatörü',
      intro: 'Seri dirençli zener regülatörün analizi ve seri direnç tasarımı.',
      modes: [
        {
          id: 'analysis',
          label: 'Analiz',
          build: () => calculatorPanel({
            fields: [
              V('vs', 'Giriş gerilimi Vs', '16'),
              { key: 'rs', label: 'Seri direnç Rs', name: 'Rs', value: '1', units: RESISTANCE_UNITS, unit: 'kΩ' },
              V('vz', 'Zener gerilimi Vz', '10'),
              { key: 'rl', label: 'Yük direnci RL', name: 'RL', value: '3', units: RESISTANCE_UNITS, unit: 'kΩ' },
            ],
            compute(v) {
              const r = zenerRegulator(v);
              return {
                results: [
                  { label: 'Zener durumu', value: r.on ? 'iletimde (regüle ediyor)' : 'kesimde (regülasyon yok)' },
                  { label: 'Yük gerilimi VL', value: formatSI(r.vl, 'V') },
                  { label: 'Seri direnç akımı IR', value: formatSI(r.ir, 'A') },
                  { label: 'Yük akımı IL', value: formatSI(r.il, 'A') },
                  { label: 'Zener akımı IZ', value: formatSI(r.iz, 'A') },
                  { label: 'Zener gücü PZ', value: formatSI(r.pz, 'W') },
                  { label: 'Rs’de harcanan güç', value: formatSI(r.ir ** 2 * v.rs, 'W') },
                ],
                warnings: r.on ? [] : [`Zener olmadan yük gerilimi ${formatSI(r.vOpen, 'V')} olurdu; Vz’ye ulaşmadığı için zener iletime geçmez. Rs’yi küçültün ya da RL’yi büyütün.`],
              };
            },
            formulas: [formula(String.raw`I_R=\frac{V_s-V_Z}{R_s},\quad I_L=\frac{V_Z}{R_L},\quad I_Z=I_R-I_L,\quad P_Z=V_ZI_Z`, 'IR = (Vs−Vz)/Rs,  IL = Vz/RL,  IZ = IR − IL,  PZ = Vz·IZ')],
            notes: ['İdeal zener: iletimde gerilimi tam Vz’dir (zener iç direnci rz ihmal).', 'Önce zenersiz devrede yük gerilimi bulunur; Vz’den büyükse zener iletimdedir.', 'PZ, zenerin anma gücünden (ör. 0,5 W, 1 W) küçük olmalıdır.'],
          }),
        },
        {
          id: 'design',
          label: 'Rs tasarımı',
          build: () => calculatorPanel({
            fields: [
              V('vsMin', 'En düşük giriş Vs,min', '12'),
              V('vsMax', 'En yüksek giriş Vs,max', '15'),
              V('vz', 'Zener gerilimi Vz', '5.1'),
              { key: 'ilMax', label: 'En büyük yük akımı IL,max', name: 'IL,max', value: '50', units: CURRENT_UNITS, unit: 'mA', constraint: 'nonnegative' },
              { key: 'izMin', label: 'En küçük zener akımı IZ,min', name: 'IZ,min', value: '5', units: CURRENT_UNITS, unit: 'mA', hint: 'Veri sayfasındaki IZK ya da IZT’nin ~%10’u' },
            ],
            compute(v) {
              const r = zenerDesign(v);
              return {
                results: [
                  { label: 'En büyük seri direnç Rs,max', value: formatSI(r.rsMax, 'Ω') },
                  { label: 'En kötü zener akımı (Vs,max, yüksüz)', value: formatSI(r.izWorst, 'A') },
                  { label: 'Gereken zener gücü', value: formatSI(r.pzWorst, 'W') },
                  { label: 'Rs güç değeri (en kötü)', value: formatSI(r.prs, 'W') },
                ],
              };
            },
            formulas: [formula(String.raw`R_{s,max}=\frac{V_{s,min}-V_Z}{I_{L,max}+I_{Z,min}},\qquad P_{Z,max}=V_Z\frac{V_{s,max}-V_Z}{R_s}`, 'Rs,max = (Vs,min − Vz)/(IL,max + IZ,min),  PZ,max = Vz·(Vs,max − Vz)/Rs')],
            notes: ['Rs olarak Rs,max’tan küçük en yakın standart değeri seçin; hesaplanan güçleri bu değerle yeniden kontrol edin.', 'Yük açık devre kalabiliyorsa tüm akım zenerden geçer; güç hesabı bu en kötü duruma göredir.'],
          }),
        },
      ],
    }));
  },
};
