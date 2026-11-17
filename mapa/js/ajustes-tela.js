// ajustes-tela.js — a tela de ajustes (aqui pode ter texto).
// Tudo grava na hora. A tela avisa se algo que muda o cálculo foi alterado (para reprocessar).

import { ajustes, mudarAjustes, carregarAjustes } from './ajustes.js';
import { TONS_DE_PELE, POTES_PADRAO, corNaPele } from './potes.js';
import { lerProjeto, salvarProjeto } from './db.js';
import { criarBackup, entregarBackup, restaurarBackup } from './backup.js';
import { icones } from './icones.js';

const LIMPEZAS = [1, 1.5, 3, 5];
const virgula = (v) => String(v).replace('.', ',');
let raiz, corpo, acoes = {}, projeto = null, mudou = false;

export function iniciarTelaAjustes(el, a) {
  raiz = el; acoes = a;   // { aoFechar(mudou), aoApresentacao(), aoImportar() }
  raiz.innerHTML = `
    <div class="aj-topo"><button class="bt aj-voltar" aria-label="Voltar">${icones.voltar}</button><h1>Ajustes</h1></div>
    <div class="aj-corpo"></div>
    <input type="file" accept="application/json,.json" hidden class="aj-arquivo">`;
  corpo = raiz.querySelector('.aj-corpo');
  raiz.querySelector('.aj-voltar').addEventListener('click', () => acoes.aoFechar(mudou));
  corpo.addEventListener('click', aoClicar);
  corpo.addEventListener('change', aoMudar);
  corpo.addEventListener('input', (e) => {
    if (e.target.matches('.aj-contraste')) corpo.querySelector('.aj-contraste-valor').textContent = textoContraste(e.target.value / 100);
  });
  raiz.querySelector('.aj-arquivo').addEventListener('change', importar);
}

/** Abre os ajustes. `idProjeto` (se vier do visualizador) libera o campo de largura da peça. */
export async function abrirTelaAjustes(idProjeto) {
  mudou = false;
  projeto = idProjeto ? await lerProjeto(idProjeto) : null;
  await desenhar();
  corpo.scrollTop = 0;
}

const textoContraste = (c) => (c > 0 ? '+' : '') + Math.round(c * 100) + '%';

async function desenhar() {
  const aj = ajustes();
  const pele = TONS_DE_PELE[aj.tomPele];
  corpo.innerHTML = `
    ${projeto ? `<section class="aj-sec"><h2>Largura da peça na pele</h2>
      <p class="aj-dica">Medida real em centímetros. Todas as escalas do app (limpeza, bordas, textura) usam isso.</p>
      <div class="aj-cm"><input class="aj-largura" type="text" inputmode="decimal" value="${virgula(projeto.larguraCm)}"><span>cm</span></div></section>` : ''}
    <section class="aj-sec"><h2>Tom de pele</h2>
      <div class="aj-tons">${TONS_DE_PELE.map((t, i) =>
        `<button data-tom="${i}" class="${i === aj.tomPele ? 'ativa' : ''}" aria-label="Tom ${i + 1}"><i style="background:rgb(${t})"></i></button>`).join('')}</div>
      <button class="aj-linha" data-acao="cic"><span>Cicatrizado (lente Na pele)</span><span class="aj-chave" aria-pressed="${aj.cicatrizado}"></span></button>
    </section>
    <section class="aj-sec"><h2>Nível de limpeza</h2>
      <p class="aj-dica">Manchas de pote menores que isso (em mm na pele) são absorvidas pelo pote vizinho.</p>
      <div class="aj-seg">${LIMPEZAS.map((v) =>
        `<button data-limpeza="${v}" class="${v === aj.limpezaMm ? 'ativa' : ''}">${virgula(v)} mm</button>`).join('')}</div>
    </section>
    <section class="aj-sec"><h2>Contraste da referência <b class="aj-contraste-valor">${textoContraste(aj.contraste)}</b></h2>
      <p class="aj-dica">Vale para as lentes calculadas (Potes, Na pele, Bordas, Textura, Direção, Luz). A lente Referência mostra a imagem original.</p>
      <input class="aj-contraste" type="range" min="-60" max="60" step="5" value="${Math.round(aj.contraste * 100)}">
    </section>
    <section class="aj-sec"><h2>Escala de potes</h2>
      <p class="aj-dica">Porcentagem de escurecimento na pele cicatrizada. A cor do quadrado é como o pote aparece depois de cicatrizar. Mais escuro à esquerda na barra.</p>
      <div class="aj-potes">${aj.potes.map((p, i) => `
        <div class="aj-pote">
          <i style="background:rgb(${corNaPele(p.pct, pele)})"></i>
          <input class="aj-nome" type="text" maxlength="14" value="${p.nome.replace(/"/g, '&quot;')}" aria-label="Nome do pote">
          <input class="aj-pct" type="text" inputmode="numeric" maxlength="3" value="${p.pct}" aria-label="Porcentagem"><span>%</span>
          <button class="bt" data-acao="apagar-pote" data-i="${i}" ${aj.potes.length <= 2 ? 'disabled' : ''} aria-label="Remover pote">${icones.lixeira}</button>
        </div>`).join('')}</div>
      <button class="aj-botao" data-acao="novo-pote">${icones.mais} Adicionar pote</button>
      <button class="aj-botao" data-acao="padrao">Restaurar escala inicial</button>
    </section>
    <section class="aj-sec"><h2>Backup</h2>
      <p class="aj-dica">Guarda todos os projetos e ajustes num arquivo. No iPhone, escolha “Salvar em Arquivos”. Guarde também no iCloud: se o app for apagado da tela inicial, os projetos somem junto.</p>
      <button class="aj-botao principal" data-acao="exportar">Exportar backup</button>
      <button class="aj-botao" data-acao="importar">Restaurar de um arquivo</button>
      <p class="aj-estado" aria-live="polite"></p>
    </section>
    <section class="aj-sec"><h2>Sobre</h2>
      <button class="aj-botao" data-acao="apresentacao">Ver a apresentação de novo</button>
      <button class="aj-botao" data-acao="atualizar">Procurar atualização</button>
      <p class="aj-estado aj-versao"></p>
    </section>`;
  versao();
}

const estado = (txt) => { const e = corpo.querySelector('.aj-estado:not(.aj-versao)'); if (e) e.textContent = txt; };

async function gravar(mudancas) { await mudarAjustes(mudancas); mudou = true; }

async function aoClicar(e) {
  const b = e.target.closest('button');
  if (!b) return;
  const aj = ajustes();
  if (b.dataset.tom !== undefined) { await gravar({ tomPele: Number(b.dataset.tom) }); return desenhar(); }
  if (b.dataset.limpeza !== undefined) { await gravar({ limpezaMm: Number(b.dataset.limpeza) }); return desenhar(); }
  switch (b.dataset.acao) {
    case 'cic': await gravar({ cicatrizado: !aj.cicatrizado }); return desenhar();
    case 'apagar-pote': {
      if (aj.potes.length <= 2) return;
      await gravar({ potes: aj.potes.filter((_, i) => i !== Number(b.dataset.i)) });
      return desenhar();
    }
    case 'novo-pote': await gravar({ potes: [...aj.potes, { nome: 'Novo', pct: 50 }] }); return desenhar();
    case 'padrao': await gravar({ potes: POTES_PADRAO.map((p) => ({ ...p })) }); return desenhar();
    case 'exportar': return exportar(b);
    case 'importar': return raiz.querySelector('.aj-arquivo').click();
    case 'apresentacao': return acoes.aoApresentacao();
    case 'atualizar': return atualizar(b);
  }
}

async function aoMudar(e) {
  const t = e.target;
  if (t.matches('.aj-contraste')) { await gravar({ contraste: Number(t.value) / 100 }); return; }
  if (t.matches('.aj-largura')) {
    const v = parseFloat(t.value.replace(',', '.'));
    if (v >= 1 && v <= 999) { projeto = { ...projeto, larguraCm: Math.round(v * 10) / 10 }; await salvarProjeto(projeto); mudou = true; }
    t.value = virgula(projeto.larguraCm);
    return;
  }
  if (t.matches('.aj-nome, .aj-pct')) {
    // lê todas as linhas e grava a escala inteira (a lista reordena sozinha por %)
    const antigos = ajustes().potes;
    const novos = [...corpo.querySelectorAll('.aj-pote')].map((linha, i) => {
      const pct = parseFloat(linha.querySelector('.aj-pct').value.replace(',', '.'));
      const p = Number.isFinite(pct) ? Math.min(100, Math.max(0, Math.round(pct))) : antigos[i].pct;
      return { nome: linha.querySelector('.aj-nome').value.trim() || `${p}%`, pct: p };
    });
    await gravar({ potes: novos });
    desenhar();
  }
}

async function exportar(b) {
  b.disabled = true; estado('Preparando o arquivo…');
  try {
    const { blob, quantidade } = await criarBackup();
    const r = await entregarBackup(blob);
    estado(r === 'cancelado' ? 'Cancelado.' : `Pronto: ${quantidade} projeto(s) no arquivo.`);
  } catch (erro) { console.error(erro); estado('Não consegui gerar o backup.'); }
  b.disabled = false;
}

async function importar(e) {
  const arq = e.target.files[0];
  e.target.value = '';
  if (!arq) return;
  estado('Restaurando…');
  try {
    const n = await restaurarBackup(arq);
    await carregarAjustes();
    mudou = true;
    await desenhar();
    estado(`Pronto: ${n} projeto(s) restaurado(s).`);
    acoes.aoImportar();
  } catch (erro) { console.error(erro); estado('Esse arquivo não é um backup do Mapa.'); }
}

/** Mostra a versão do app (carimbada na publicação). */
async function versao() {
  const el = corpo.querySelector('.aj-versao');
  try {
    const txt = await (await fetch('sw.js')).text();
    const v = /VERSAO = '([^']*)'/.exec(txt)?.[1] ?? '';
    el.textContent = v && !v.startsWith('__') ? `Versão ${v}` : 'Versão de desenvolvimento';
  } catch { el.textContent = ''; }
}

/** Pede ao navegador para procurar uma versão nova do app e recarrega se houver. */
async function atualizar(b) {
  const el = corpo.querySelector('.aj-versao');
  if (!('serviceWorker' in navigator)) { el.textContent = 'Este navegador não atualiza sozinho.'; return; }
  b.disabled = true; el.textContent = 'Procurando…';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) { el.textContent = 'O app ainda não foi instalado para uso offline.'; b.disabled = false; return; }
    let achou = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { achou = true; el.textContent = 'Atualizando…'; location.reload(); }, { once: true });
    await reg.update();
    setTimeout(() => { if (!achou) { el.textContent = 'Você já está na versão mais recente.'; b.disabled = false; } }, 4000);
  } catch { el.textContent = 'Sem conexão para procurar atualização.'; b.disabled = false; }
}
