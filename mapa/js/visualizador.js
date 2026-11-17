// visualizador.js — a referência em tela cheia, com lentes, barra de potes e gestos.
// Pinça = zoom · arrastar = mover · toque duplo = enquadrar a peça inteira ·
// segurar = mostra o pote do ponto e acende todas as áreas daquele pote.

import { lerProjeto, lerImagem } from './db.js';
import { carregarImg, paraCanvas } from './imagem.js';
import { ligarGestos } from './gestos.js';
import { icones } from './icones.js';
import { ajustes } from './ajustes.js';
import { TONS_DE_PELE, corNaPele } from './potes.js';
import { processar, cancelarProcessamento } from './processamento.js';
import { camadaPotes, camadaDestaque, soltarCanvas } from './lentes.js';
import { iniciarBarra, desenharBarra, marcarPote } from './barra-potes.js';
import { iniciarLupa, mostrarLupa, esconderLupa, pulsar } from './lupa.js';
import { vibrar } from './tatil.js';

// Ordem das lentes na coluna da direita.
const LENTES = ['referencia', 'pele', 'potes', 'textura', 'bordas', 'direcao', 'luz'];
const ZOOM_MAX = 16;      // vezes o tamanho "enquadrado"
const ZOOM_MIN = 0.7;

let raiz, canvas, ctx, acoes = {};
let projeto = null, base = null;            // base = canvas com a referência
let vista = { escala: 1, x: 0, y: 0 };      // posição da imagem na tela (px CSS)
let pedido = 0, animacao = 0;

let lente = 'referencia';
let camadas = {};                           // cache: nome da lente -> canvas
let potes = null;                           // { mapa, l, a } vindo do worker
let cores = [];                             // cor cicatrizada de cada pote
let poteFixo = null;                        // pote aceso pela barra
let poteSonda = null;                       // pote sob o dedo (segurando)
let destaque = null, destaqueDe = null;     // canvas do destaque e qual pote ele mostra

export function iniciarVisualizador(el, a) {
  raiz = el; acoes = a;   // { aoVoltar() }
  raiz.innerHTML = `
    <canvas></canvas>
    <button class="bt vz-voltar" aria-label="Voltar">${icones.voltar}</button>
    <div class="lentes">${LENTES.map((l) =>
      `<button class="bt" data-lente="${l}" disabled>${icones[l]}</button>`).join('')}</div>
    <div class="barra-potes"></div>`;
  canvas = raiz.querySelector('canvas');
  ctx = canvas.getContext('2d');
  raiz.querySelector('.vz-voltar').addEventListener('click', () => acoes.aoVoltar());
  raiz.querySelector('.lentes').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b && !b.disabled) trocarLente(b.dataset.lente);
  });
  iniciarBarra(raiz.querySelector('.barra-potes'), (i) => {
    poteFixo = poteFixo === i ? null : i;
    atualizarDestaque();
  });
  iniciarLupa(raiz);

  ligarGestos(canvas, {
    aoArrastar: (dx, dy) => { pararAnimacao(); vista.x += dx; vista.y += dy; limitar(); desenhar(); },
    aoPinca: (fator, cx, cy, dx, dy) => { pararAnimacao(); zoomEm(fator, cx, cy); vista.x += dx; vista.y += dy; limitar(); desenhar(); },
    aoToqueDuplo: () => animarPara(enquadrada()),
    aoSegurar: sondar,
    aoSegurarMover: sondar,
    aoSoltar: () => { poteSonda = null; esconderLupa(); atualizarDestaque(); },
  });
  new ResizeObserver(() => { if (!raiz.hidden) { ajustarCanvas(); if (base) { vista = enquadrada(); desenhar(); } } }).observe(raiz);
}

/** Abre um projeto salvo e dispara o processamento das lentes. */
export async function abrirProjeto(id) {
  projeto = await lerProjeto(id);
  const bytes = await lerImagem(id);
  const img = await carregarImg(new Blob([bytes.dados], { type: bytes.tipo }));
  base = paraCanvas(img, 4096);
  ajustarCanvas();
  vista = enquadrada();
  lente = 'referencia'; poteFixo = poteSonda = null;
  cores = ajustes().potes.map((p) => corNaPele(p.pct, TONS_DE_PELE[ajustes().tomPele]));
  desenharBarra(cores);
  marcarPote(null);
  marcarLentes();
  desenhar();
  processar(base, projeto.larguraCm, ajustes(), receber);
}

export function fecharProjeto() {
  pararAnimacao();
  cancelarProcessamento();
  esconderLupa();
  Object.values(camadas).forEach(soltarCanvas);   // devolve a memória ao iPhone
  soltarCanvas(destaque); soltarCanvas(base);
  camadas = {}; destaque = null; destaqueDe = null; potes = null; base = null; projeto = null;
}

// ---------- lentes ----------

/** Chega um resultado do worker (progressivo). */
function receber(m) {
  if (!base) return;
  if (m.tipo === 'potes') {
    potes = { mapa: m.mapa, l: m.l, a: m.a };
    camadas.potes = camadaPotes(m.mapa, m.l, m.a, cores);
    marcarLentes();
    atualizarDestaque();
  } else if (m.tipo === 'erro') {
    console.error('processamento:', m.texto);
  }
}

const pronta = (l) => l === 'referencia' || !!camadas[l];

function marcarLentes() {
  raiz.querySelectorAll('.lentes button').forEach((b) => {
    b.disabled = !pronta(b.dataset.lente);
    b.classList.toggle('ativa', b.dataset.lente === lente);
  });
}

function trocarLente(nome) {
  if (!pronta(nome)) return;
  lente = nome;
  marcarLentes();
  desenhar();
}

// ---------- pote aceso (barra ou dedo segurando) ----------

/** Índice do pote no ponto (x, y) da tela, ou null fora da imagem. */
function poteEm(x, y) {
  if (!potes) return null;
  const u = (x - vista.x) / (base.width * vista.escala), v = (y - vista.y) / (base.height * vista.escala);
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return null;
  return potes.mapa[Math.floor(v * potes.a) * potes.l + Math.floor(u * potes.l)];
}

function sondar(x, y) {
  const p = poteEm(x, y);
  const mudou = p !== poteSonda;
  const primeira = poteSonda === null;
  poteSonda = p;
  mostrarLupa(x, y, p === null ? null : cores[p]);
  if (mudou) {
    if (p !== null) { vibrar(); if (!primeira) pulsar(); }
    atualizarDestaque();
  }
}

function atualizarDestaque() {
  const aceso = poteSonda ?? poteFixo;
  marcarPote(aceso);
  if (aceso !== null && potes && destaqueDe !== aceso) {
    destaque = camadaDestaque(destaque, potes.mapa, potes.l, potes.a, aceso);
  }
  destaqueDe = aceso !== null && potes ? aceso : null;
  desenhar();
}

// ---------- geometria ----------

/** Área livre da tela (sem a coluna de lentes, a barra de potes e o notch). */
function areaLivre() {
  const r = raiz.getBoundingClientRect();
  const st = getComputedStyle(raiz);
  const n = (v) => parseFloat(st.getPropertyValue(v)) || 0;
  const cima = n('--sat-px') + 6, baixo = n('--sab-px') + 80, dir = n('--sar-px') + 72, esq = n('--sal-px') + 6;
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
  // As camadas têm ~1400 px; são esticadas para o tamanho da referência.
  ctx.drawImage(camadas[lente] || base, 0, 0, base.width, base.height);
  if (destaqueDe !== null && destaque) ctx.drawImage(destaque, 0, 0, base.width, base.height);
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
