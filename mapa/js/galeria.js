// galeria.js — grade de miniaturas + botão "+".
// Engrenagem = ajustes. Tocar abre o projeto; segurar pede confirmação visual para apagar.

import { listarProjetos, apagarProjeto } from './db.js';
import { urlDeBytes } from './imagem.js';
import { icones } from './icones.js';

const TEMPO_SEGURAR = 550;
let raiz, grade, entrada, urls = [];
let acoes = {};   // { aoAbrir(id), aoEscolherImagem(arquivo), aoAjustes() }

export function iniciarGaleria(el, a) {
  raiz = el; acoes = a;
  raiz.innerHTML = `
    <div class="galeria-topo"><button class="bt abrir-ajustes" aria-label="Ajustes">${icones.engrenagem}</button></div>
    <div class="grade"></div>
    <button class="mais" aria-label="Novo projeto">${icones.mais}</button>
    <input type="file" accept="image/*" hidden>`;
  grade = raiz.querySelector('.grade');
  entrada = raiz.querySelector('input');
  raiz.querySelector('.abrir-ajustes').addEventListener('click', () => acoes.aoAjustes());
  raiz.querySelector('.mais').addEventListener('click', () => { entrada.value = ''; entrada.click(); });
  entrada.addEventListener('change', () => {
    if (entrada.files[0]) acoes.aoEscolherImagem(entrada.files[0]);
  });
  // Tocar fora cancela qualquer "apagar?" aberto.
  raiz.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.apagando')) fecharApagar();
  });
}

function fecharApagar() {
  grade.querySelectorAll('.apagando').forEach((m) => m.classList.remove('apagando'));
}

export async function atualizarGaleria() {
  const projetos = await listarProjetos();
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls = [];
  // Sem espaços entre os itens: o CSS usa :empty para centralizar o "+" na galeria vazia.
  grade.innerHTML = '';
  for (const p of projetos) grade.appendChild(criarMiniatura(p));
}

const cm = (v) => String(v).replace('.', ',');

function criarMiniatura(p) {
  const el = document.createElement('div');
  el.className = 'mini';
  const url = urlDeBytes(p.mini);
  urls.push(url);
  el.innerHTML = `
    <img src="${url}" alt="">
    <span class="cm">${cm(p.larguraCm)} cm</span>
    <div class="apagar">
      <button class="nao" aria-label="Cancelar">${icones.fechar}</button>
      <button class="sim" aria-label="Apagar">${icones.lixeira}</button>
    </div>`;

  // Segurar = modo apagar. Toque curto = abrir.
  let relogio = 0, segurou = false, x0 = 0, y0 = 0;
  el.addEventListener('pointerdown', (e) => {
    if (el.classList.contains('apagando')) return;
    segurou = false; x0 = e.clientX; y0 = e.clientY;
    el.classList.add('pressionando');
    relogio = setTimeout(() => {
      segurou = true; el.classList.remove('pressionando');
      fecharApagar(); el.classList.add('apagando');
    }, TEMPO_SEGURAR);
  });
  const soltar = () => { clearTimeout(relogio); el.classList.remove('pressionando'); };
  el.addEventListener('pointermove', (e) => {
    if (Math.hypot(e.clientX - x0, e.clientY - y0) > 14) soltar();   // está rolando a lista
  });
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
  el.addEventListener('pointerleave', soltar);
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  el.addEventListener('click', async (e) => {
    if (e.target.closest('.sim')) { await apagarProjeto(p.id); atualizarGaleria(); return; }
    if (e.target.closest('.nao')) { el.classList.remove('apagando'); return; }
    if (segurou || el.classList.contains('apagando')) return;
    acoes.aoAbrir(p.id);
  });
  return el;
}
