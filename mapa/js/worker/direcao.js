// direcao.js — lente Direção: orientação do traço que segue a forma e a textura.
//
// Tensor de estrutura da imagem (gradiente em σ ≈ 0,6 mm, integrado em σ ≈ 3 mm).
// O gradiente dominante aponta através das isofotas; o traço vai ao longo delas (+90°).
// A coerência (0–1) diz o quanto a orientação é confiável: vira a opacidade do tracinho.
// O campo sai em metade da resolução (suficiente: os tracinhos são amostrados na tela).

import { borrar } from './filtros.js';

const PASSO = 2;

/** { l, a, angulo:Uint8 (0–255 ↔ 0–180°), forca:Uint8 (coerência × energia) }. */
export function calcularDirecao(d, l, a, pxPorMm) {
  const n = l * a;
  const g = borrar(d, l, a, Math.max(0.6 * pxPorMm, 1.2));
  const jxx = new Float32Array(n), jxy = new Float32Array(n), jyy = new Float32Array(n);
  for (let y = 1; y < a - 1; y++) {
    for (let x = 1; x < l - 1; x++) {
      const i = y * l + x;
      const gx = (g[i + 1] - g[i - 1]) * 0.5, gy = (g[i + l] - g[i - l]) * 0.5;
      jxx[i] = gx * gx; jxy[i] = gx * gy; jyy[i] = gy * gy;
    }
  }
  const si = Math.max(3 * pxPorMm, 4);
  const Jxx = borrar(jxx, l, a, si), Jxy = borrar(jxy, l, a, si), Jyy = borrar(jyy, l, a, si);

  const l2 = Math.ceil(l / PASSO), a2 = Math.ceil(a / PASSO);
  const angulo = new Uint8Array(l2 * a2), forca = new Uint8Array(l2 * a2);
  for (let y2 = 0; y2 < a2; y2++) {
    for (let x2 = 0; x2 < l2; x2++) {
      const i = Math.min(a - 1, y2 * PASSO) * l + Math.min(l - 1, x2 * PASSO);
      const dif = Jxx[i] - Jyy[i], tr = Jxx[i] + Jyy[i];
      const coerencia = tr > 1e-12 ? Math.sqrt(dif * dif + 4 * Jxy[i] * Jxy[i]) / tr : 0;
      // energia: gradiente típico por mm; abaixo de ~0,008/mm é área lisa (sem direção útil)
      const e = Math.sqrt(tr) * pxPorMm;
      const t = Math.min(1, Math.max(0, (e - 0.008) / 0.03));
      let th = 0.5 * Math.atan2(2 * Jxy[i], dif) + Math.PI / 2;   // ao longo da isofota
      th = ((th % Math.PI) + Math.PI) % Math.PI;
      const k = y2 * l2 + x2;
      angulo[k] = Math.round((th / Math.PI) * 255);
      forca[k] = Math.round(coerencia * t * t * (3 - 2 * t) * 255);
    }
  }
  return { l: l2, a: a2, angulo, forca };
}
