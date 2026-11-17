// main.js — ponto de partida: liga as telas entre si.

import { pedirPersistencia } from './db.js';
import { carregarAjustes } from './ajustes.js';
import { iniciarGaleria, atualizarGaleria } from './galeria.js';
import { iniciarNovo, abrirNovo } from './novo.js';
import { iniciarVisualizador, abrirProjeto, fecharProjeto } from './visualizador.js';

const telas = {
  galeria: document.getElementById('tela-galeria'),
  novo: document.getElementById('tela-novo'),
  visualizador: document.getElementById('tela-visualizador'),
};

function mostrar(nome) {
  for (const [n, el] of Object.entries(telas)) el.hidden = n !== nome;
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

iniciarGaleria(telas.galeria, {
  aoAbrir: abrir,
  aoEscolherImagem: (arquivo) => { abrirNovo(arquivo); mostrar('novo'); },
});
iniciarNovo(telas.novo, { aoCriar: abrir, aoCancelar: voltarParaGaleria });
iniciarVisualizador(telas.visualizador, { aoVoltar: voltarParaGaleria });

pedirPersistencia();
await carregarAjustes();
atualizarGaleria();
