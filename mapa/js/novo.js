// novo.js — criação do projeto: mostra a imagem escolhida e pede a LARGURA REAL
// da peça na pele, em cm (único campo obrigatório). Teclado próprio, com teclas
// grandes, para funcionar de luva.

import { prepararImagem } from './imagem.js';
import { salvarProjeto } from './db.js';
import { icones } from './icones.js';

let raiz, acoes = {}, texto = '', preparo = null, urlPrevia = null;

export function iniciarNovo(el, a) {
  raiz = el; acoes = a;   // { aoCriar(id), aoCancelar() }
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'apagar'];
  raiz.innerHTML = `
    <div class="novo-previa">
      <img alt="">
      <div class="regua"><svg viewBox="0 0 200 22" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke">
        <path d="M1 3v16M199 3v16M1 11h198" vector-effect="non-scaling-stroke"/></svg></div>
    </div>
    <div class="novo-valor"><span class="num"></span><small>cm</small></div>
    <div class="teclado">${teclas.map((t) =>
      `<button data-t="${t}">${t === 'apagar' ? icones.apagarTecla : t}</button>`).join('')}</div>
    <div class="novo-acoes">
      <button class="cancelar" aria-label="Cancelar">${icones.fechar}</button>
      <button class="ok" aria-label="Criar" disabled>${icones.ok}</button>
    </div>`;
  raiz.querySelector('.teclado').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) tecla(b.dataset.t);
  });
  raiz.querySelector('.cancelar').addEventListener('click', () => acoes.aoCancelar());
  raiz.querySelector('.ok').addEventListener('click', criar);
}

/** Abre a tela com o arquivo escolhido na galeria. */
export function abrirNovo(arquivo) {
  texto = '';
  if (urlPrevia) URL.revokeObjectURL(urlPrevia);
  urlPrevia = URL.createObjectURL(arquivo);
  raiz.querySelector('.novo-previa img').src = urlPrevia;
  // Já vai reduzindo a imagem enquanto a pessoa digita a largura.
  preparo = prepararImagem(arquivo);
  preparo.catch(() => {});
  mostrar();
}

function valor() { return parseFloat(texto.replace(',', '.')) || 0; }

function tecla(t) {
  if (t === 'apagar') texto = texto.slice(0, -1);
  else if (t === ',') { if (!texto.includes(',')) texto = (texto || '0') + ','; }
  else {
    const [int, dec] = texto.split(',');
    if (dec !== undefined ? dec.length < 1 : int.length < 3) texto += t;   // até 999,9 cm
    if (texto.length > 1 && texto[0] === '0' && texto[1] !== ',') texto = texto.slice(1);
  }
  mostrar();
}

function mostrar() {
  const num = raiz.querySelector('.num');
  num.textContent = texto || '0';
  num.classList.toggle('vazio', !texto);
  raiz.querySelector('.ok').disabled = valor() < 1;   // menos de 1 cm não faz sentido
}

async function criar() {
  const bt = raiz.querySelector('.ok');
  bt.disabled = true;
  try {
    const p = await preparo;
    const projeto = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      criadoEm: Date.now(),
      larguraCm: valor(),
      largura: p.largura, altura: p.altura,
      mini: p.mini,
    };
    await salvarProjeto(projeto, p.imagem);
    acoes.aoCriar(projeto.id);
  } catch (erro) {
    console.error(erro);
    acoes.aoCancelar();
  }
}
