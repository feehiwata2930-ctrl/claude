// lentes.js — desenha as camadas das lentes a partir dos resultados do worker.
// Cada camada é um canvas no tamanho processado (~1400 px), guardado em cache
// pelo visualizador e esticado sobre a referência na hora de mostrar.

function novoCanvas(l, a) {
  const c = document.createElement('canvas');
  c.width = l; c.height = a;
  return c;
}

/** Lente POTES: cada pixel pintado com a cor cicatrizada do seu pote. */
export function camadaPotes(mapa, l, a, cores) {
  const c = novoCanvas(l, a), ctx = c.getContext('2d');
  const img = ctx.createImageData(l, a), px = new Uint32Array(img.data.buffer);
  // cores já empacotadas em 32 bits (ordem ABGR na memória)
  const tabela = cores.map(([r, g, b]) => (255 << 24) | (b << 16) | (g << 8) | r);
  // linha fina na divisa entre dois potes: ajuda a separar cinzas vizinhos
  const divisa = cores.map(([r, g, b]) => {
    const k = (r + g + b) / 3 < 70 ? 1.9 : 0.74;   // clareia nos escuros, escurece nos claros
    const f = (v) => Math.min(255, Math.round(v * k + (k > 1 ? 14 : 0)));
    return (255 << 24) | (f(b) << 16) | (f(g) << 8) | f(r);
  });
  for (let i = 0; i < mapa.length; i++) {
    const p = mapa[i];
    const borda = ((i + 1) % l !== 0 && mapa[i + 1] !== p) || (i + l < mapa.length && mapa[i + l] !== p);
    px[i] = borda ? divisa[p] : tabela[p];
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * Lente NA PELE: `d8` = escurecimento (0–255) de cada pixel; cada valor vira a mistura
 * entre o tom de pele e a cor da tinta. Reaproveita o canvas se já existir.
 */
export function camadaPele(canvas, d8, l, a, pele, tinta) {
  const c = canvas || novoCanvas(l, a);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(l, a), px = new Uint32Array(img.data.buffer);
  const lut = new Uint32Array(256);
  for (let v = 0; v < 256; v++) {
    const [r, g, b] = [0, 1, 2].map((i) => Math.round(pele[i] + (tinta[i] - pele[i]) * (v / 255)));
    lut[v] = (255 << 24) | (b << 16) | (g << 8) | r;
  }
  for (let i = 0; i < d8.length; i++) px[i] = lut[d8[i]];
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * Lente LUZ. `cls`: 0 = tinta, 1 = luz (pele limpa na peça), 2 = fundo.
 * Devolve { base, mascara }: a base mostra a referência em cinza (fundo bem escurecido,
 * luz sobre azul-noite); a máscara marca onde as listras azuis serão desenhadas na hora.
 */
export function camadaLuz(cls, d8, l, a) {
  const base = novoCanvas(l, a), mascara = novoCanvas(l, a);
  const ib = base.getContext('2d').createImageData(l, a), pb = new Uint32Array(ib.data.buffer);
  const im = mascara.getContext('2d').createImageData(l, a), pm = new Uint32Array(im.data.buffer);
  const NOITE = (255 << 24) | (38 << 16) | (24 << 8) | 14;   // azul-noite (ABGR)
  for (let i = 0; i < cls.length; i++) {
    if (cls[i] === 1) { pb[i] = NOITE; pm[i] = 0xffffffff; continue; }
    const claro = 255 - d8[i];                                // referência em cinza
    // fundo: quase preto; tinta: referência em cinza erguida a partir de 70 (sempre mais clara que o fundo)
    const g = cls[i] === 2 ? Math.round(claro * 0.07) : Math.round(70 + claro * 0.5);
    pb[i] = (255 << 24) | (g << 16) | (g << 8) | g;
  }
  base.getContext('2d').putImageData(ib, 0, 0);
  mascara.getContext('2d').putImageData(im, 0, 0);
  return { base, mascara };
}

const OURO = (150 << 24) | (60 << 16) | (200 << 8) | 255;   // dourado translúcido
const SOMBRA = (205 << 24);                                  // preto translúcido

/**
 * DESTAQUE: acende as áreas de um pote e apaga o resto.
 * Reaproveita o mesmo canvas a cada chamada (economia de memória).
 */
export function camadaDestaque(canvas, mapa, l, a, pote) {
  const c = canvas || novoCanvas(l, a);
  if (c.width !== l || c.height !== a) { c.width = l; c.height = a; }
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(l, a), px = new Uint32Array(img.data.buffer);
  for (let i = 0; i < mapa.length; i++) px[i] = mapa[i] === pote ? OURO : SOMBRA;
  ctx.putImageData(img, 0, 0);
  return c;
}

export function soltarCanvas(c) { if (c) c.width = c.height = 0; }
