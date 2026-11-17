// processamento.js — conversa com o Web Worker. Reduz a referência para ~1400 px,
// envia junto com as medidas reais e repassa cada resultado assim que chega.

import { tabelaDePotes } from './potes.js';

const LADO_PROC = 1400;   // maior lado da imagem processada
let worker = null, tarefa = 0, ouvinte = null;

function garantirWorker() {
  if (worker) return;
  worker = new Worker(new URL('./worker/principal.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => { if (e.data.tarefa === tarefa && ouvinte) ouvinte(e.data); };
  worker.onerror = (e) => { if (ouvinte) ouvinte({ tipo: 'erro', texto: e.message }); };
}

/**
 * Inicia o processamento. `aoResultado` é chamado com { tipo: 'potes' | ... | 'fim' }.
 * Um novo pedido cancela o anterior.
 * @param base canvas com a referência · @param larguraCm largura real da peça
 * @param ajustes { potes, contraste, limpezaMm }
 */
export function processar(base, larguraCm, ajustes, aoResultado) {
  garantirWorker();
  ouvinte = aoResultado;
  const f = Math.min(1, LADO_PROC / Math.max(base.width, base.height));
  const l = Math.max(1, Math.round(base.width * f)), a = Math.max(1, Math.round(base.height * f));
  const c = document.createElement('canvas');
  c.width = l; c.height = a;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(base, 0, 0, l, a);
  const rgba = ctx.getImageData(0, 0, l, a).data.buffer;
  c.width = c.height = 0;
  tarefa++;
  worker.postMessage({
    tipo: 'processar', tarefa, rgba, l, a,
    pxPorMm: l / (larguraCm * 10),
    contraste: ajustes.contraste, limpezaMm: ajustes.limpezaMm,
    tabela: tabelaDePotes(ajustes.potes), nPotes: ajustes.potes.length,
  }, [rgba]);
  return { l, a };
}

/** Ignora qualquer resultado que ainda esteja a caminho. */
export function cancelarProcessamento() { tarefa++; ouvinte = null; }
