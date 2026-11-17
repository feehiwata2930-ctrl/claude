// main.js — ponto de partida: liga as telas entre si.

import { pedirPersistencia } from './db.js';
import { carregarAjustes, apresentacaoJaVista, marcarApresentacaoVista } from './ajustes.js';
import { iniciarGaleria, atualizarGaleria } from './galeria.js';
import { iniciarNovo, abrirNovo } from './novo.js';
import { iniciarVisualizador, abrirProjeto, fecharProjeto, reaplicarAjustes } from './visualizador.js';
import { iniciarTelaAjustes, abrirTelaAjustes } from './ajustes-tela.js';
import { iniciarApresentacao } from './apresentacao.js';

const telas = {
  galeria: document.getElementById('tela-galeria'),
  novo: document.getElementById('tela-novo'),
  visualizador: document.getElementById('tela-visualizador'),
  ajustes: document.getElementById('tela-ajustes'),
  apresentacao: document.getElementById('tela-apresentacao'),
};

let atual = 'galeria';
let precisaRecarregar = false;   // uma versão nova do app foi instalada em segundo plano

function mostrar(nome) {
  atual = nome;
  for (const [n, el] of Object.entries(telas)) el.hidden = n !== nome;
  // Só troca para a versão nova quando está na galeria (nunca no meio de uma sessão).
  if (nome === 'galeria' && precisaRecarregar) location.reload();
}

async function abrir(id) {
  mostrar('visualizador');
  await abrirProjeto(id);
}

async function voltarParaGaleria() {
  fecharProjeto();
  mostrar('galeria');
  await atualizarGaleria();
}

// Ajustes abrem por cima e voltam para onde estavam (galeria ou visualizador).
let origemAjustes = 'galeria';
async function irParaAjustes(idProjeto) {
  origemAjustes = idProjeto ? 'visualizador' : 'galeria';
  await abrirTelaAjustes(idProjeto);
  mostrar('ajustes');
}

// Apresentação: abre sozinha uma vez; depois, só pelos ajustes.
let origemApresentacao = 'galeria';
function irParaApresentacao(de) { origemApresentacao = de; mostrar('apresentacao'); }

iniciarGaleria(telas.galeria, {
  aoAbrir: abrir,
  aoEscolherImagem: (arquivo) => { abrirNovo(arquivo); mostrar('novo'); },
  aoAjustes: () => irParaAjustes(null),
});
iniciarNovo(telas.novo, { aoCriar: abrir, aoCancelar: voltarParaGaleria });
iniciarVisualizador(telas.visualizador, { aoVoltar: voltarParaGaleria, aoAjustes: irParaAjustes });
iniciarTelaAjustes(telas.ajustes, {
  aoFechar: async (mudou) => {
    if (origemAjustes === 'visualizador') { mostrar('visualizador'); if (mudou) await reaplicarAjustes(); }
    else { mostrar('galeria'); await atualizarGaleria(); }
  },
  aoApresentacao: () => irParaApresentacao('ajustes'),
  aoImportar: () => atualizarGaleria(),
});
iniciarApresentacao(telas.apresentacao, async () => {
  await marcarApresentacaoVista();
  mostrar(origemApresentacao);
});

// ---- Instalação offline (service worker) ----
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    // procura versão nova toda vez que o app volta para a frente
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  // Havia um service worker antes e agora entrou outro: é uma atualização.
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (atual === 'galeria') location.reload(); else precisaRecarregar = true;
    });
  }
}

pedirPersistencia();
await carregarAjustes();
if (!(await apresentacaoJaVista())) irParaApresentacao('galeria');
atualizarGaleria();
