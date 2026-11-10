import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber, FREQUENCY_UNITS } from '../../calc/units.js';
import { planeWave, normalIncidence } from '../../calc/em.js';
import { EPS_FIELD, MU_FIELD } from './units.js';

const SIGMA = { 'S/m': 1, 'mS/m': 1e-3, 'MS/m': 1e6 };

export default {
  id: 'em/plane-wave',
  title: 'Düzlem dalga ve yansıma',
  render(container) {
    container.append(calculatorView({
      title: 'Düzgün düzlem dalga ve dik gelişte yansıma',
      intro: 'Kayıplı ortamda zayıflama ve faz sabiti, dalga empedansı, deri derinliği; iki ortam arasında Γ ve τ.',
      modes: [
        {
          id: 'medium',
          label: 'Ortamda yayılım',
          build: () => calculatorPanel({
            fields: [
              { key: 'f', label: 'Frekans f', name: 'f', value: '1', units: FREQUENCY_UNITS, unit: 'MHz' },
              { key: 'sigma', label: 'İletkenlik σ', name: 'σ', value: '4', units: SIGMA, unit: 'S/m', constraint: 'nonnegative', hint: 'Deniz suyu ≈ 4, bakır 5,8×10⁷, kuru toprak ≈ 10⁻³ S/m' },
              { ...EPS_FIELD, value: '81' },
              MU_FIELD,
            ],
            compute(v) {
              const r = planeWave({ f: v.f, sigma: v.sigma, epsR: v.er, muR: v.mur });
              const kind = r.lossTangent > 100 ? 'iyi iletken (σ/ωε ≫ 1)' : r.lossTangent < 0.01 ? 'düşük kayıplı dielektrik (σ/ωε ≪ 1)' : 'kayıplı ortam (ara bölge)';
              return {
                results: [
                  { label: 'Kayıp tanjantı σ/ωε', value: formatNumber(r.lossTangent, 4) },
                  { label: 'Ortam türü', value: kind },
                  { label: 'Zayıflama sabiti α', value: `${formatNumber(r.alpha, 4)} Np/m  (${formatNumber(r.alphaDb, 4)} dB/m)` },
                  { label: 'Faz sabiti β', value: formatSI(r.beta, 'rad/m') },
                  { label: 'Dalga boyu λ = 2π/β', value: formatSI(r.lambda, 'm') },
                  { label: 'Faz hızı vp = ω/β', value: formatSI(r.vp, 'm/s') },
                  { label: 'Dalga empedansı |η| ∠ θη', value: `${formatSI(r.etaMag, 'Ω')} ∠ ${formatNumber(r.etaDeg, 4)}°` },
                  { label: 'Deri derinliği δ = 1/α', value: Number.isFinite(r.delta) ? formatSI(r.delta, 'm') : '∞ (kayıpsız)' },
                ],
              };
            },
            formulas: [
              formula(String.raw`\gamma=\alpha+j\beta=\sqrt{j\omega\mu(\sigma+j\omega\varepsilon)},\qquad \eta=\sqrt{\frac{j\omega\mu}{\sigma+j\omega\varepsilon}}`, 'γ = α + jβ = √(jωμ(σ + jωε)),  η = √(jωμ/(σ + jωε))'),
              formula(String.raw`\text{İyi iletken: }\ \alpha=\beta\approx\sqrt{\pi f\mu\sigma},\quad \delta=\frac{1}{\sqrt{\pi f\mu\sigma}},\quad \eta\approx(1+j)\sqrt{\frac{\pi f\mu}{\sigma}}`, 'İyi iletken: α = β ≈ √(πfμσ), δ = 1/√(πfμσ), η ≈ (1+j)√(πfμ/σ)'),
            ],
            notes: ['Doğrusal, homojen, izotrop ortam; εr ve σ frekanstan bağımsız alınır (gerçekte su gibi ortamlarda değişir).', 'Alan genliği her δ mesafesinde e ≈ 2,718 kat (8,69 dB) azalır.'],
          }),
        },
        {
          id: 'reflection',
          label: 'Dik geliş (yansıma)',
          build: () => calculatorPanel({
            fields: [
              { key: 'e1', label: 'Ortam 1 εr', name: 'εr1', value: '1', min: 1 },
              { key: 'm1', label: 'Ortam 1 μr', name: 'μr1', value: '1', min: 1 },
              { key: 'e2', label: 'Ortam 2 εr', name: 'εr2', value: '4', min: 1 },
              { key: 'm2', label: 'Ortam 2 μr', name: 'μr2', value: '1', min: 1 },
            ],
            compute(v) {
              const r = normalIncidence({ epsR1: v.e1, muR1: v.m1, epsR2: v.e2, muR2: v.m2 });
              return {
                results: [
                  { label: 'η1', value: formatSI(r.eta1, 'Ω') },
                  { label: 'η2', value: formatSI(r.eta2, 'Ω') },
                  { label: 'Yansıma katsayısı Γ', value: formatNumber(r.gamma, 5) },
                  { label: 'İletim katsayısı τ = 1 + Γ', value: formatNumber(r.tau, 5) },
                  { label: 'Yansıyan güç |Γ|²', value: `%${formatNumber(r.reflected * 100, 4)}` },
                  { label: 'İletilen güç 1 − |Γ|²', value: `%${formatNumber(r.transmitted * 100, 4)}` },
                  { label: 'Ortam 1’de duran dalga oranı (SWR)', value: formatNumber(r.swr, 4) },
                  { label: 'Kırılma indisleri n1, n2', value: `${formatNumber(r.n1, 4)}, ${formatNumber(r.n2, 4)}` },
                ],
              };
            },
            formulas: [formula(String.raw`\Gamma=\frac{\eta_2-\eta_1}{\eta_2+\eta_1},\qquad \tau=\frac{2\eta_2}{\eta_2+\eta_1}=1+\Gamma,\qquad \eta=\eta_0\sqrt{\frac{\mu_r}{\varepsilon_r}}`, 'Γ = (η2 − η1)/(η2 + η1),  τ = 1 + Γ,  η = η0·√(μr/εr)')],
            notes: ['Kayıpsız ortamlar, sınıra dik geliş. Γ alan (E) genliği içindir; güç oranları |Γ|² ve 1 − |Γ|²’dir.', 'Γ < 0: yansıyan E alanı 180° faz döner (daha yoğun ortama geçişte).'],
          }),
        },
      ],
    }));
  },
};
