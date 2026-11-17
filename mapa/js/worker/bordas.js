// bordas.js — lente Bordas: dourado = borda dura, azul = degradê.
//
// Método (tudo em mm reais): compara o gradiente da imagem em DUAS escalas,
//   fina  σ1 ≈ 0,5 mm   e   grossa  σ2 ≈ 2,2 mm.
// Um degrau (borda dura) mantém quase o mesmo "gradiente × escala" nas duas; uma rampa
// larga tem gradiente quase igual nas duas escalas. A razão g1/g2 diz a largura W da transição:
//   borda dura  = transição < ~1 mm   → g1/g2 alta
//   degradê     = transição > ~5 mm   → g1/g2 ≈ 1
//   entre 1 e 5 mm: não marca nada.
// Contra o halo azul em volta das bordas duras: perto de um degrau o gradiente fino já caiu
// mas o grosso ainda não (g1/g2 << 1) — esses pixels são descartados — e, além disso,
// nada fica azul a ≤ 1,2 mm de uma borda dura.

import { borrar } from './filtros.js';
import { dilatar, removerPequenos } from './morfologia.js';

const CONTRASTE_MIN = 0.10;   // a transição precisa mudar pelo menos 10 % de escurecimento
const LARGURA_DURA_MM = 1.0, LARGURA_MOLE_MM = 5.0;

/** Devolve classes: 0 = nada, 1 = borda dura (ouro), 2 = degradê (azul). */
export function calcularBordas(d, l, a, pxPorMm) {
  const n = l * a;
  const s1 = Math.max(0.5 * pxPorMm, 1.2);        // sigmas em pixels (com piso de resolução)
  const s2 = Math.max(2.2 * pxPorMm, s1 * 3.5);
  const m1 = s1 / pxPorMm, m2 = s2 / pxPorMm;     // e em mm
  const b1 = borrar(d, l, a, s1), b2 = borrar(d, l, a, s2);

  // Uma rampa linear de largura W equivale a um degrau borrado com σe = W/3,46.
  const eDura = (LARGURA_DURA_MM / 3.46) ** 2, eMole = (LARGURA_MOLE_MM / 3.46) ** 2;
  const rDura = Math.sqrt((m2 * m2 + eDura) / (m1 * m1 + eDura));
  const rMole = Math.sqrt((m2 * m2 + eMole) / (m1 * m1 + eMole));
  const dura = new Uint8Array(n), mole = new Uint8Array(n);
  const k = 0.5 * pxPorMm;                         // diferença central → gradiente por mm
  const doisPi = 2 * Math.PI;

  for (let y = 1; y < a - 1; y++) {
    for (let x = 1; x < l - 1; x++) {
      const i = y * l + x;
      const g2 = Math.hypot(b2[i + 1] - b2[i - 1], b2[i + l] - b2[i - l]) * k;
      if (g2 < 0.006) continue;                    // área plana
      const g1 = Math.hypot(b1[i + 1] - b1[i - 1], b1[i + l] - b1[i - l]) * k;
      const r = g1 / g2;
      if (r >= rDura) {
        // degrau: contraste ≈ g1·σ1·√(2π)
        if (g1 * m1 * Math.sqrt(doisPi) >= CONTRASTE_MIN) dura[i] = 1;
      } else if (r >= 0.8 && r <= rMole) {
        const q = r * r;
        const se2 = q > 1.05 ? Math.max(0, (m2 * m2 - q * m1 * m1) / (q - 1)) : 16;
        if (g2 * Math.sqrt(doisPi * (m2 * m2 + se2)) >= CONTRASTE_MIN) mole[i] = 1;
      }
    }
  }

  // Limpeza: fragmentos curtos (< ~2,5 mm de borda; < 8 mm² de degradê) são ruído.
  removerPequenos(dura, l, a, Math.round(1.75 * pxPorMm * pxPorMm));
  removerPequenos(mole, l, a, Math.round(8 * pxPorMm * pxPorMm));
  const protegida = dilatar(dura, l, a, Math.max(1, Math.round(1.2 * pxPorMm)));   // anti-halo
  const grossa = dilatar(dura, l, a, 1);                                            // traço visível

  const cls = new Uint8Array(n);
  for (let i = 0; i < n; i++) cls[i] = grossa[i] ? 1 : (mole[i] && !protegida[i] ? 2 : 0);
  return cls;
}
