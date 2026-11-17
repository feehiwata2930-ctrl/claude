// apresentacao.js — tela vista uma vez, na primeira abertura (e de novo, se pedir, nos ajustes).
// Cada lente e o gesto de segurar, explicados em uma linha.

import { icones } from './icones.js';

const LINHAS = [
  ['referencia', 'Referência', 'a imagem original.'],
  ['pele', 'Na pele', 'como fica na pele. Escolha o tom; o curativo mostra cicatrizado.'],
  ['potes', 'Potes', 'cada cinza é sempre o mesmo pote. Toque num pote da barra para acendê-lo.'],
  ['textura', 'Textura', 'verde-água liso, laranja texturizado, magenta detalhe fino.'],
  ['bordas', 'Bordas', 'dourado borda dura, azul degradê.'],
  ['direcao', 'Direção', 'os tracinhos mostram o sentido do traço.'],
  ['luz', 'Luz', 'listras azuis são pele limpa; o fundo fica escuro.'],
  ['segurar', 'Segurar', 'segure o dedo num ponto: mostra o pote dali e acende as áreas iguais.'],
];

let raiz, aoFechar = () => {};

export function iniciarApresentacao(el, fn) {
  raiz = el; aoFechar = fn;
  raiz.innerHTML = `
    <h1 class="ap-titulo">Como usar</h1>
    <div class="ap-lista">${LINHAS.map(([ic, nome, txt]) =>
      `<div class="ap-linha"><span class="ap-icone">${icones[ic]}</span><p><b>${nome}</b> — ${txt}</p></div>`).join('')}
      <p class="ap-gestos">Pinça: zoom · Arrastar: mover · Toque duplo: enquadrar a peça</p>
    </div>
    <button class="ap-ok" aria-label="Entendi">${icones.ok}</button>`;
  raiz.querySelector('.ap-ok').addEventListener('click', () => aoFechar());
}
