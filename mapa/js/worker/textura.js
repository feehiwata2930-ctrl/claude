// textura.js — lente Textura: liso / texturizado / detalhe fino.
//
// Mede a densidade local de OSCILAÇÕES em duas faixas de tamanho, em mm reais:
//   faixa FINA   : detalhes de ~0,6–2,4 mm  (pelo, cabelo, metal riscado)
//                  — o que um CM 7 não resolve como forma (< ~1,5 mm) vira textura
//   faixa MÉDIA  : detalhes de ~1,5–6 mm    (poro, tecido, pedra)
// Em cada faixa (diferença entre dois borrões) conta-se quantas vezes o sinal troca de sinal
// por mm, com amplitude mínima, e faz-se a média local (σ ≈ 3 mm).
// Uma borda isolada troca de sinal uma vez só (≈ 0,1 por mm no máximo); uma região cheia de
// variação troca de sinal muitas vezes. Por isso silhuetas lisas não viram "textura".

import { borrar } from './filtros.js';
import { absorverIlhas } from './mapa-potes.js';

const AMPLITUDE_MIN = 0.012;   // oscilação mais fraca que isso é ruído
// Limiares: trocas de sinal por mm. Calibrados com as imagens de teste.
export const LIMIARES = { fino: 0.30, medio: 0.11 };

/** Trocas de sinal por mm (horizontal + vertical) da faixa `dif`, já suavizadas. */
function densidade(dif, l, a, pxPorMm) {
  const n = l * a, z = new Float32Array(n);
  // amplitude local da faixa: só conta troca de sinal onde a oscilação é de verdade (não ruído)
  const modulo = new Float32Array(n);
  for (let i = 0; i < n; i++) modulo[i] = Math.abs(dif[i]);
  const env = borrar(modulo, l, a, Math.max(1.2 * pxPorMm, 2));
  for (let y = 0; y < a - 1; y++) {
    for (let x = 0; x < l - 1; x++) {
      const i = y * l + x;
      if (env[i] < AMPLITUDE_MIN) continue;
      const v = dif[i];
      if (v * dif[i + 1] < 0) z[i] += 0.5;
      if (v * dif[i + l] < 0) z[i] += 0.5;
    }
  }
  const m = borrar(z, l, a, Math.max(3 * pxPorMm, 4));
  for (let i = 0; i < n; i++) m[i] *= pxPorMm;   // por pixel → por mm
  return m;
}

/** Densidades das duas faixas (Float32Array cada). */
export function energias(d, l, a, pxPorMm) {
  const n = l * a;
  const sg = (mm, min) => Math.max(mm * pxPorMm, min);
  const b04 = borrar(d, l, a, sg(0.4, 0.7));
  const b10 = borrar(d, l, a, sg(1.0, 1.5));
  const b25 = borrar(d, l, a, sg(2.5, 3.5));
  const df = new Float32Array(n), dm = new Float32Array(n);
  for (let i = 0; i < n; i++) { df[i] = b04[i] - b10[i]; dm[i] = b10[i] - b25[i]; }
  return { fino: densidade(df, l, a, pxPorMm), medio: densidade(dm, l, a, pxPorMm) };
}

/** Classes: 0 = liso, 1 = texturizado, 2 = detalhe fino. */
export function calcularTextura(d, l, a, pxPorMm, lim = LIMIARES) {
  const n = l * a;
  const { fino, medio } = energias(d, l, a, pxPorMm);
  const cls = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    cls[i] = fino[i] >= lim.fino ? 2 : (medio[i] >= lim.medio || fino[i] >= lim.fino * 0.6 ? 1 : 0);
  }
  // Manchas menores que ~4 × 4 mm são absorvidas pela vizinhança.
  return absorverIlhas(cls, l, a, Math.round(16 * pxPorMm * pxPorMm), 3);
}
