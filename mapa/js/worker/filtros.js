// filtros.js — operações básicas de imagem usadas pelo Web Worker.

/**
 * Converte RGBA em "escurecimento" (0 = branco/pele limpa … 1 = preto puro).
 * `contraste` vai de -1 a 1 (0 = sem mudança) e gira em torno do cinza médio.
 * Não há ajuste automático de níveis: o mesmo cinza dá sempre o mesmo valor.
 */
export function escurecimento(rgba, n, contraste = 0) {
  const d = new Float32Array(n);
  const ganho = 1 + contraste;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const alfa = rgba[j + 3] / 255;
    // luminância percebida; áreas transparentes contam como branco
    const y = (0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2]) / 255;
    let v = 1 - (y * alfa + (1 - alfa));
    if (contraste) v = 0.5 + (v - 0.5) * ganho;
    d[i] = v < 0 ? 0 : v > 1 ? 1 : v;
  }
  return d;
}

/** Uma passada de média móvel (horizontal ou vertical), repetindo a borda. */
function caixa(src, dst, l, a, r, vertical) {
  const linhas = vertical ? l : a, tam = vertical ? a : l;
  const passo = vertical ? l : 1, pulo = vertical ? 1 : l;
  const inv = 1 / (2 * r + 1);
  for (let k = 0; k < linhas; k++) {
    const ini = k * pulo;
    let soma = 0;
    for (let i = -r; i <= r; i++) soma += src[ini + Math.min(tam - 1, Math.max(0, i)) * passo];
    for (let i = 0; i < tam; i++) {
      dst[ini + i * passo] = soma * inv;
      const sai = Math.max(0, i - r), entra = Math.min(tam - 1, i + r + 1);
      soma += src[ini + entra * passo] - src[ini + sai * passo];
    }
  }
}

/**
 * Desfoque gaussiano aproximado (3 médias móveis seguidas). `sigma` em pixels.
 * Devolve um novo Float32Array; não altera a entrada.
 */
export function borrar(src, l, a, sigma) {
  // três caixas de raio r dão sigma ≈ raiz(r·(r+1))
  const r = Math.round((-1 + Math.sqrt(1 + 4 * sigma * sigma)) / 2);
  const out = new Float32Array(src);
  if (r < 1) return out;
  const tmp = new Float32Array(src.length);
  for (let p = 0; p < 3; p++) {
    caixa(out, tmp, l, a, r, false);
    caixa(tmp, out, l, a, r, true);
  }
  return out;
}
