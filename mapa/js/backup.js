// backup.js — exporta e restaura todos os projetos e ajustes num único arquivo (.json).
// As imagens vão dentro do arquivo (em base64), então ele é tudo o que precisa guardar.

import { listarProjetos, lerImagem, salvarProjeto, lerConfig, salvarConfig } from './db.js';

function paraBase64(buf) {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}

function deBase64(b64) {
  const bin = atob(b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}

/** Monta o arquivo de backup (Blob). Vai montando aos pedaços para não estourar a memória. */
export async function criarBackup() {
  const projetos = await listarProjetos();
  const ajustes = await lerConfig('ajustes', {});
  const partes = [`{"app":"mapa-execucao","versao":1,"exportadoEm":${JSON.stringify(new Date().toISOString())},"ajustes":${JSON.stringify(ajustes)},"projetos":[`];
  for (let i = 0; i < projetos.length; i++) {
    const p = projetos[i], img = await lerImagem(p.id);
    const obj = {
      ...p,
      mini: { dados: paraBase64(p.mini.dados), tipo: p.mini.tipo },
      imagem: { dados: paraBase64(img.dados), tipo: img.tipo },
    };
    partes.push((i ? ',' : '') + JSON.stringify(obj));
  }
  partes.push(']}');
  return { blob: new Blob(partes, { type: 'application/json' }), quantidade: projetos.length };
}

/** Entrega o arquivo: folha de compartilhar do iPhone (Salvar em Arquivos) ou download. */
export async function entregarBackup(blob) {
  const nome = `mapa-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const arquivo = new File([blob], nome, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo] }); return 'compartilhado'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelado'; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'baixado';
}

/** Lê um arquivo de backup e grava os projetos (mesmo id = substitui). Devolve quantos entraram. */
export async function restaurarBackup(arquivo) {
  const dados = JSON.parse(await arquivo.text());
  if (dados.app !== 'mapa-execucao' || !Array.isArray(dados.projetos)) throw new Error('arquivo inválido');
  let n = 0;
  for (const p of dados.projetos) {
    const { imagem, ...resto } = p;
    resto.mini = { dados: deBase64(p.mini.dados), tipo: p.mini.tipo };
    await salvarProjeto(resto, { dados: deBase64(imagem.dados), tipo: imagem.tipo });
    n++;
  }
  if (dados.ajustes && Object.keys(dados.ajustes).length) await salvarConfig('ajustes', dados.ajustes);
  return n;
}
