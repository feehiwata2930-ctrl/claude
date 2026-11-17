// morfologia.js — operações simples sobre máscaras (0/1): dilatar e remover manchas pequenas.

/** Uma passada de dilatação com janela de raio r (horizontal ou vertical). */
function passada(src, dst, l, a, r, vertical) {
  const linhas = vertical ? l : a, tam = vertical ? a : l;
  const passo = vertical ? l : 1, pulo = vertical ? 1 : l;
  for (let k = 0; k < linhas; k++) {
    const ini = k * pulo;
    let cont = 0;
    for (let i = 0; i <= Math.min(r, tam - 1); i++) cont += src[ini + i * passo];
    for (let i = 0; i < tam; i++) {
      dst[ini + i * passo] = cont > 0 ? 1 : 0;
      const entra = i + r + 1, sai = i - r;
      if (entra < tam) cont += src[ini + entra * passo];
      if (sai >= 0) cont -= src[ini + sai * passo];
    }
  }
}

/** Engorda a máscara em r pixels (janela quadrada). Devolve uma máscara nova. */
export function dilatar(mascara, l, a, r) {
  if (r < 1) return mascara.slice();
  const tmp = new Uint8Array(mascara.length), out = new Uint8Array(mascara.length);
  passada(mascara, tmp, l, a, r, false);
  passada(tmp, out, l, a, r, true);
  return out;
}

/** Apaga (em lugar) toda mancha conectada com menos de `areaMin` pixels. */
export function removerPequenos(mascara, l, a, areaMin) {
  const n = l * a;
  const visto = new Uint8Array(n);
  const fila = new Int32Array(n);
  for (let ini = 0; ini < n; ini++) {
    if (!mascara[ini] || visto[ini]) continue;
    let topo = 0, tam = 0;
    fila[topo++] = ini; visto[ini] = 1;
    while (tam < topo) {
      const p = fila[tam++], x = p % l;
      let q;
      if (x > 0 && mascara[q = p - 1] && !visto[q]) { visto[q] = 1; fila[topo++] = q; }
      if (x < l - 1 && mascara[q = p + 1] && !visto[q]) { visto[q] = 1; fila[topo++] = q; }
      if (p >= l && mascara[q = p - l] && !visto[q]) { visto[q] = 1; fila[topo++] = q; }
      if (p < n - l && mascara[q = p + l] && !visto[q]) { visto[q] = 1; fila[topo++] = q; }
    }
    if (tam < areaMin) for (let k = 0; k < tam; k++) mascara[fila[k]] = 0;
  }
  return mascara;
}
