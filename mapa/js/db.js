// db.js — armazenamento no aparelho (IndexedDB).
// Três "gavetas":
//   projetos : dados leves de cada projeto (id, largura em cm, miniatura) — usados na galeria
//   imagens  : a imagem grande de cada projeto (lida só ao abrir o visualizador)
//   config   : ajustes do app (escala de potes, tom de pele etc.)

const NOME = 'mapa-execucao';
const VERSAO = 1;
let promessaBanco = null;

function abrir() {
  if (!promessaBanco) {
    promessaBanco = new Promise((ok, erro) => {
      const req = indexedDB.open(NOME, VERSAO);
      req.onupgradeneeded = () => {
        const b = req.result;
        if (!b.objectStoreNames.contains('projetos')) b.createObjectStore('projetos', { keyPath: 'id' });
        if (!b.objectStoreNames.contains('imagens')) b.createObjectStore('imagens', { keyPath: 'id' });
        if (!b.objectStoreNames.contains('config')) b.createObjectStore('config');
      };
      req.onsuccess = () => ok(req.result);
      req.onerror = () => erro(req.error);
    });
  }
  return promessaBanco;
}

// Executa uma operação e devolve uma Promise que resolve quando a transação termina.
async function transacao(gavetas, modo, fn) {
  const banco = await abrir();
  return new Promise((ok, erro) => {
    const t = banco.transaction(gavetas, modo);
    let resultado;
    t.oncomplete = () => ok(resultado);
    t.onerror = () => erro(t.error);
    t.onabort = () => erro(t.error);
    const r = fn(t);
    if (r) r.onsuccess = () => { resultado = r.result; };
  });
}

/** Lista os projetos (sem a imagem grande), do mais novo para o mais antigo. */
export async function listarProjetos() {
  const lista = await transacao(['projetos'], 'readonly', (t) => t.objectStore('projetos').getAll());
  return lista.sort((a, b) => b.criadoEm - a.criadoEm);
}

/** Salva (ou atualiza) um projeto. Se `imagem` vier, grava também a imagem grande. */
export function salvarProjeto(projeto, imagem) {
  return transacao(['projetos', 'imagens'], 'readwrite', (t) => {
    t.objectStore('projetos').put(projeto);
    if (imagem) t.objectStore('imagens').put({ id: projeto.id, ...imagem });
  });
}

export function lerProjeto(id) {
  return transacao(['projetos'], 'readonly', (t) => t.objectStore('projetos').get(id));
}

/** Devolve { dados: ArrayBuffer, tipo: 'image/jpeg' } da imagem grande. */
export function lerImagem(id) {
  return transacao(['imagens'], 'readonly', (t) => t.objectStore('imagens').get(id));
}

export function apagarProjeto(id) {
  return transacao(['projetos', 'imagens'], 'readwrite', (t) => {
    t.objectStore('projetos').delete(id);
    t.objectStore('imagens').delete(id);
  });
}

export async function lerConfig(chave, padrao) {
  const v = await transacao(['config'], 'readonly', (t) => t.objectStore('config').get(chave));
  return v === undefined ? padrao : v;
}

export function salvarConfig(chave, valor) {
  return transacao(['config'], 'readwrite', (t) => { t.objectStore('config').put(valor, chave); });
}

/** Pede ao navegador para não apagar os dados sozinho (quando ele permite). */
export function pedirPersistencia() {
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
