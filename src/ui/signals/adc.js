import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber, VOLTAGE_UNITS, FREQUENCY_UNITS } from '../../calc/units.js';
import { adcAnalysis, toBinary } from '../../calc/signals.js';

export default {
  id: 'signals/adc',
  title: 'ADC ve örnekleme',
  render(container) {
    container.append(calculatorView({
      title: 'ADC çözünürlüğü ve örnekleme',
      intro: 'Bit sayısından LSB, çıkış kodu ve kuantalama SNR’ı; örnekleme frekansıyla Nyquist ve örtüşme denetimi.',
      modes: [{
        id: 'adc',
        label: 'ADC',
        build: () => calculatorPanel({
          fields: [
            { key: 'bits', label: 'Çözünürlük N (bit)', name: 'N', value: '10', min: 1, max: 32 },
            { key: 'vref', label: 'Referans (tam ölçek) Vref', name: 'Vref', value: '5', units: VOLTAGE_UNITS, unit: 'V' },
            { key: 'vin', label: 'Giriş gerilimi Vin', name: 'Vin', value: '2.5', units: VOLTAGE_UNITS, unit: 'V', constraint: 'nonnegative' },
            { key: 'fs', label: 'Örnekleme frekansı fs', name: 'fs', value: '8', units: FREQUENCY_UNITS, unit: 'kHz' },
            { key: 'fmax', label: 'Sinyalin en yüksek frekansı fmax', name: 'fmax', value: '3', units: FREQUENCY_UNITS, unit: 'kHz' },
          ],
          compute(v) {
            if (!Number.isInteger(v.bits)) throw new RangeError('Bit sayısı tam sayı olmalı.');
            const r = adcAnalysis(v);
            const warnings = [];
            if (!r.aliasOk) warnings.push(`Nyquist koşulu sağlanmıyor (fs < 2·fmax): ${formatSI(v.fmax, 'Hz')} bileşeni ${formatSI(r.alias, 'Hz')}’e katlanır (örtüşme). Örtüşme önleyici filtre ya da daha yüksek fs gerekir.`);
            if (v.vin >= v.vref) warnings.push('Giriş tam ölçeğin üstünde: kod en büyük değere kırpıldı.');
            return {
              results: [
                { label: 'Seviye sayısı 2ᴺ', value: formatNumber(r.levels, 10) },
                { label: 'LSB (adım) = Vref/2ᴺ', value: formatSI(r.lsb, 'V') },
                { label: 'Çıkış kodu (onluk)', value: String(r.code) },
                { label: 'Çıkış kodu (ikili)', value: v.bits <= 24 ? toBinary(r.code, v.bits) : '—' },
                { label: 'Çıkış kodu (onaltılı)', value: `0x${r.code.toString(16).toUpperCase()}` },
                { label: 'Kodun karşılığı gerilim', value: formatSI(r.vq, 'V') },
                { label: 'Kuantalama hatası', value: formatSI(v.vin - r.vq, 'V') },
                { label: 'İdeal SQNR', value: `${formatNumber(r.sqnr, 4)} dB` },
                { label: 'Nyquist frekansı fs/2', value: formatSI(r.nyquist, 'Hz') },
                { label: 'Veri hızı (N·fs)', value: formatSI(v.bits * v.fs, 'bit/s') },
              ],
              warnings,
            };
          },
          formulas: [
            formula(String.raw`\mathrm{LSB}=\frac{V_{ref}}{2^N},\qquad \text{kod}=\left\lfloor\frac{V_{in}}{\mathrm{LSB}}\right\rfloor,\qquad \mathrm{SQNR}=6{,}02N+1{,}76\ \mathrm{dB}`, 'LSB = Vref/2ᴺ,  kod = ⌊Vin/LSB⌋,  SQNR = 6,02·N + 1,76 dB'),
            formula(String.raw`f_s\ge 2f_{max}\qquad\text{(Nyquist–Shannon)}`, 'fs ≥ 2·fmax (Nyquist–Shannon)'),
          ],
          notes: [
            'Tek kutuplu (0…Vref), kırpmalı (aşağı yuvarlayan) ideal ADC. Bazı ADC’ler yuvarlar; hata o zaman ±LSB/2 olur.',
            'SQNR, tam ölçekli sinüs giriş ve yalnızca kuantalama gürültüsü içindir; gerçek ADC’de ENOB = (SINAD − 1,76)/6,02 daha düşüktür.',
            'Pratikte fs, fmax’ın 2,5–10 katı seçilir (örtüşme önleyici filtrenin geçiş bandı için).',
          ],
        }),
      }],
    }));
  },
};
