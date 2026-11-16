// visualizador.js — a referência em tela cheia, com zoom e movimento.
// Pinça = zoom · arrastar = mover · toque duplo = enquadrar a peça inteira.
// (O gesto de segurar e as lentes entram nas próximas etapas, por cima desta base.)

import { lerProjeto, lerImagem } from './db.js';
import { carregarImg, paraCanvas } from './imagem.js';
import { ligarGestos } from './gestos.js';
import { icones } from './icones.js';

// Ordem das lentes na coluna da direita.
const LENTES = ['referencia', 'pele', 'potes', 'textura', 'bordas', 'direcao', 'luz'];
const ZOOM_MAX = 16;      // vezes o tamanho "enquadrado"
const ZOOM_MIN = 0.7;

let raiz, canvas, ctx, acoes = {};
let projeto = null, base = null;            // base = canvas com a referência
let vista = { escala: 1, x: 0, y: 0 };      // posição da imagem na tela (px CSS)
let pedido = 0, animacao = 0;

export function iniciarVisualizador(el, a) {
  raiz = el; acoes = a;   // { aoVoltar() }
  raiz.innerHTML = `
    <canvas></canvas>
    <button class="bt vz-voltar" aria-label="Voltar">${icones.voltar}</button>
    <div class="lentes">${LENTES.map((l, i) =>
      `<button class="bt${i === 0 ? ' ativa' : ''}" data-lente="${l}" ${i ? 'disabled' : ''}>${icones[l]}</button>`).join('')}</div>`;
  canvas = raiz.querySelector('canvas');
  ctx = canvas.getContext('2d');
  raiz.querySelector('.vz-voltar').addEventListener('click', () => acoes.aoVoltar());

  ligarGestos(canvas, {
    aoArrastar: (dx, dy) => { pararAnimacao(); vista.x += dx; vista.y += dy; limitar(); desenhar(); },
    aoPinca: (fator, cx, cy, dx, dy) => { pararAnimacao(); zoomEm(fator, cx, cy); vista.x += dx; vista.y += dy; limitar(); desenhar(); },
    aoToqueDuplo: () => animarPara(enquadrada()),
  });
  new ResizeObserver(() => { if (!raiz.hidden) { ajustarCanvas(); if (base) { vista = enquadrada(); desenhar(); } } }).observe(raiz);
}

/** Abre um projeto salvo. */
export async function abrirProjeto(id) {
  projeto = await lerProjeto(id);
  const bytes = await lerImagem(id);
  const img = await carregarImg(new Blob([bytes.dados], { type: bytes.tipo }));
  base = paraCanvas(img, 4096);
  ajustarCanvas();
  vista = enquadrada();
  desenhar();
}

export function fecharProjeto() {
  pararAnimacao();
  if (base) { base.width = base.height = 0; }   // devolve a memória ao iPhone
  base = null; projeto = null;
}

// ---------- geometria ----------

/** Área livre da tela (sem a coluna de lentes, a barra de potes e o notch). */
function areaLivre() {
  const r = raiz.getBoundingClientRect();
  const st = getComputedStyle(raiz);
  const n = (v) => parseFloat(st.getPropertyValue(v)) || 0;
  const cima = n('--sat-px') + 6, baixo = n('--sab-px') + 84, dir = n('--sar-px') + 72, esq = n('--sal-px') + 6;
  return { x: esq, y: cima, l: r.width - esq - dir, a: r.height - cima - baixo };
}

/** Vista em que a peça inteira cabe na área livre. */
function enquadrada() {
  const ar = areaLivre();
  const escala = Math.min(ar.l / base.width, ar.a / base.height);
  return {
    escala,
    x: ar.x + (ar.l - base.width * escala) / 2,
    y: ar.y + (ar.a - base.height * escala) / 2,
  };
}

function zoomEm(fator, cx, cy) {
  const e0 = enquadrada().escala;
  const nova = Math.min(e0 * ZOOM_MAX, Math.max(e0 * ZOOM_MIN, vista.escala * fator));
  const f = nova / vista.escala;
  vista.x = cx - (cx - vista.x) * f;
  vista.y = cy - (cy - vista.y) * f;
  vista.escala = nova;
}

/** Não deixa a imagem sumir da tela: sempre sobra um pedaço visível. */
function limitar() {
  const r = raiz.getBoundingClientRect();
  const m = 90, l = base.width * vista.escala, a = base.height * vista.escala;
  vista.x = Math.min(r.width - m, Math.max(m - l, vista.x));
  vista.y = Math.min(r.height - m, Math.max(m - a, vista.y));
}

// ---------- desenho ----------

function ajustarCanvas() {
  const r = raiz.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const l = Math.round(r.width * dpr), a = Math.round(r.height * dpr);
  if (canvas.width !== l || canvas.height !== a) { canvas.width = l; canvas.height = a; }
}

/** Agenda um redesenho (no máximo um por quadro). */
function desenhar() {
  if (pedido) return;
  pedido = requestAnimationFrame(() => { pedido = 0; pintar(); });
}

function pintar() {
  if (!base) return;
  const dpr = canvas.width / raiz.getBoundingClientRect().width;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(vista.escala * dpr, 0, 0, vista.escala * dpr, vista.x * dpr, vista.y * dpr);
  ctx.imageSmoothingEnabled = true;   // zoom sempre suave, sem "quadradinhos"
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(base, 0, 0);
}

// ---------- animação suave (toque duplo) ----------

function pararAnimacao() { cancelAnimationFrame(animacao); animacao = 0; }

function animarPara(alvo, ms = 240) {
  pararAnimacao();
  const de = { ...vista }, t0 = performance.now();
  const passo = (t) => {
    const k = Math.min(1, (t - t0) / ms), s = 1 - Math.pow(1 - k, 3);   // desacelera no fim
    // A escala é interpolada em log para o zoom parecer uniforme.
    vista.escala = de.escala * Math.pow(alvo.escala / de.escala, s);
    vista.x = de.x + (alvo.x - de.x) * s;
    vista.y = de.y + (alvo.y - de.y) * s;
    pintar();
    animacao = k < 1 ? requestAnimationFrame(passo) : 0;
  };
  animacao = requestAnimationFrame(passo);
}
