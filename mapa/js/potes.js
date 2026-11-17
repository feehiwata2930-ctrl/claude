// potes.js — a escala de potes e as cores de como cada um aparece na pele.
// Funções puras (sem tela), usadas tanto na interface quanto no Web Worker.

/** Escala inicial: escurecimento % na pele cicatrizada. */
export const POTES_PADRAO = [
  { nome: 'Preto puro', pct: 100 },
  { nome: '1:1', pct: 78 },
  { nome: '1:3', pct: 58 },
  { nome: '1:6', pct: 40 },
  { nome: '1:10', pct: 26 },
  { nome: '1:20', pct: 14 },
  { nome: 'Pele limpa', pct: 0 },
];

/** Quatro tons de pele (RGB), do mais claro ao mais escuro. */
export const TONS_DE_PELE = [
  [241, 213, 192],
  [224, 182, 150],
  [188, 136, 100],
  [128, 86, 62],
];

/** Cor do preto cicatrizado: nunca é preto absoluto, puxa levemente para o azul. */
export const COR_TINTA = [24, 27, 31];

/** Ordena do mais escuro para o mais claro (é a ordem da barra). */
export function ordenarPotes(potes) {
  return [...potes].sort((a, b) => b.pct - a.pct);
}

/** Cor de um escurecimento (0–100 %) sobre um tom de pele: mistura pele → tinta. */
export function corNaPele(pct, pele) {
  const k = Math.min(1, Math.max(0, pct / 100));
  return [0, 1, 2].map((i) => Math.round(pele[i] + (COR_TINTA[i] - pele[i]) * k));
}

/**
 * Tabela de 256 posições: para cada escurecimento (0 = branco … 255 = preto),
 * o índice do pote mais próximo. É FIXA: o mesmo cinza cai sempre no mesmo pote.
 */
export function tabelaDePotes(potes) {
  const t = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    const pct = (v / 255) * 100;
    let melhor = 0, dist = Infinity;
    potes.forEach((p, i) => {
      const d = Math.abs(p.pct - pct);
      if (d < dist) { dist = d; melhor = i; }
    });
    t[v] = melhor;
  }
  return t;
}
