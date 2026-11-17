// principal.js — o Web Worker: faz todo o processamento pesado fora da interface
// e devolve os resultados aos poucos (Potes primeiro; depois Bordas, Textura, Direção).

import { escurecimento, borrar } from './filtros.js';
import { quantizar, absorverIlhas } from './mapa-potes.js';

let tarefaAtual = 0;

// Dá uma pausa para o worker poder receber um novo pedido (e desistir do antigo).
const respirar = () => new Promise((ok) => setTimeout(ok, 0));

self.onmessage = (e) => {
  if (e.data.tipo === 'processar') processar(e.data).catch((erro) => {
    self.postMessage({ tipo: 'erro', tarefa: e.data.tarefa, texto: String(erro) });
  });
};

/**
 * @param m { tarefa, rgba:ArrayBuffer, l, a, pxPorMm, contraste, limpezaMm, tabela:Uint8Array, nPotes }
 */
async function processar(m) {
  const { tarefa, l, a, pxPorMm } = m;
  tarefaAtual = tarefa;
  const vivo = () => tarefaAtual === tarefa;
  const n = l * a;

  // 1) Escurecimento de cada pixel (0 = pele limpa … 1 = preto)
  const d = escurecimento(new Uint8ClampedArray(m.rgba), n, m.contraste);
  await respirar(); if (!vivo()) return;

  // 2) POTES — suaviza na escala da limpeza (em mm reais), quantiza e remove ilhas
  const limpezaPx = m.limpezaMm * pxPorMm;
  const suave = borrar(d, l, a, limpezaPx * 0.35);
  await respirar(); if (!vivo()) return;
  const mapa = quantizar(suave, m.tabela);
  absorverIlhas(mapa, l, a, limpezaPx * limpezaPx, m.nPotes);
  if (!vivo()) return;
  // Envia uma cópia: o worker ainda vai usar o mapa nas próximas lentes.
  const copia = mapa.slice();
  self.postMessage({ tipo: 'potes', tarefa, l, a, mapa: copia }, [copia.buffer]);

  self.postMessage({ tipo: 'fim', tarefa });
}
