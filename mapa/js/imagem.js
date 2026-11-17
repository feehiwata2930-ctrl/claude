// imagem.js — prepara a foto escolhida: reduz para um tamanho seguro para o iPhone
// e gera a miniatura da galeria. Guardamos os bytes (ArrayBuffer), que é o formato
// mais confiável para o IndexedDB do Safari.

const LADO_MAX = 2048;   // maior lado da imagem guardada (nitidez no zoom x memória)
const LADO_MINI = 360;   // maior lado da miniatura

/** Carrega um arquivo/blob como <img> (respeita a rotação da foto do celular). */
export function carregarImg(blob) {
  return new Promise((ok, erro) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error('imagem inválida')); };
    img.src = url;
  });
}

/** Desenha `fonte` num canvas com o maior lado limitado a `ladoMax`. */
export function paraCanvas(fonte, ladoMax) {
  const l = fonte.naturalWidth || fonte.width;
  const a = fonte.naturalHeight || fonte.height;
  const f = Math.min(1, ladoMax / Math.max(l, a));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(l * f));
  c.height = Math.max(1, Math.round(a * f));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fonte, 0, 0, c.width, c.height);
  return c;
}

function canvasParaBytes(canvas, qualidade) {
  return new Promise((ok, erro) => {
    canvas.toBlob(async (b) => {
      if (!b) return erro(new Error('falha ao gerar imagem'));
      ok({ dados: await b.arrayBuffer(), tipo: b.type });
    }, 'image/jpeg', qualidade);
  });
}

/** Recebe o arquivo escolhido e devolve imagem + miniatura prontas para salvar. */
export async function prepararImagem(arquivo) {
  const img = await carregarImg(arquivo);
  const grande = paraCanvas(img, LADO_MAX);
  const mini = paraCanvas(grande, LADO_MINI);
  return {
    largura: grande.width,
    altura: grande.height,
    imagem: await canvasParaBytes(grande, 0.92),
    mini: await canvasParaBytes(mini, 0.8),
  };
}

/** Cria uma URL temporária para mostrar bytes guardados num <img>. */
export function urlDeBytes({ dados, tipo }) {
  return URL.createObjectURL(new Blob([dados], { type: tipo }));
}
