// mapa-potes.js — transforma o escurecimento em um mapa de potes limpo.

/** Cada pixel recebe o índice do pote mais próximo (usando a tabela fixa). */
export function quantizar(d, tabela) {
  const m = new Uint8Array(d.length);
  for (let i = 0; i < d.length; i++) m[i] = tabela[(d[i] * 255 + 0.5) | 0];
  return m;
}

/**
 * Limpeza: toda mancha menor que `areaMin` pixels é absorvida pelo pote vizinho
 * com quem ela mais faz fronteira. Assim somem as ilhas pequenas demais para tatuar.
 */
export function absorverIlhas(mapa, l, a, areaMin, nPotes) {
  if (areaMin < 2) return mapa;
  const n = l * a;
  const visto = new Uint8Array(n);
  const pilha = new Int32Array(n);
  const viz = new Int32Array(nPotes);
  for (let ini = 0; ini < n; ini++) {
    if (visto[ini]) continue;
    const pote = mapa[ini];
    let topo = 0, tam = 0;
    pilha[topo++] = ini; visto[ini] = 1;
    viz.fill(0);
    // percorre a mancha; `pilha` guarda todos os pixels dela (de 0 a tam)
    while (tam < topo) {
      const p = pilha[tam++], x = p % l;
      for (let k = 0; k < 4; k++) {
        let q;
        if (k === 0) { if (x === 0) continue; q = p - 1; }
        else if (k === 1) { if (x === l - 1) continue; q = p + 1; }
        else if (k === 2) { if (p < l) continue; q = p - l; }
        else { if (p >= n - l) continue; q = p + l; }
        if (mapa[q] === pote) { if (!visto[q]) { visto[q] = 1; pilha[topo++] = q; } }
        else viz[mapa[q]]++;   // fronteira com outro pote
      }
    }
    if (tam < areaMin) {
      let melhor = -1, max = 0;
      for (let k = 0; k < nPotes; k++) if (viz[k] > max) { max = viz[k]; melhor = k; }
      if (melhor >= 0) for (let k = 0; k < tam; k++) mapa[pilha[k]] = melhor;
    }
  }
  return mapa;
}
