// sw.js — service worker: guarda o app no aparelho para funcionar sem internet.
//
// VERSAO é trocada automaticamente a cada publicação (veja .github/workflows/deploy-pages.yml).
// Quando ela muda, o iPhone baixa os arquivos novos e passa a usá-los na abertura seguinte.
// Se um arquivo novo for criado, ele precisa entrar na lista ARQUIVOS abaixo.

const VERSAO = '__VERSAO__';
const CACHE = 'mapa-' + VERSAO;

const ARQUIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'js/main.js',
  'js/ajustes-tela.js',
  'js/ajustes.js',
  'js/apresentacao.js',
  'js/backup.js',
  'js/barra-potes.js',
  'js/db.js',
  'js/energia.js',
  'js/galeria.js',
  'js/gestos.js',
  'js/icones.js',
  'js/imagem.js',
  'js/lentes.js',
  'js/lupa.js',
  'js/novo.js',
  'js/potes.js',
  'js/processamento.js',
  'js/tatil.js',
  'js/tracinhos.js',
  'js/visualizador.js',
  'js/worker/bordas.js',
  'js/worker/direcao.js',
  'js/worker/filtros.js',
  'js/worker/luz.js',
  'js/worker/mapa-potes.js',
  'js/worker/morfologia.js',
  'js/worker/principal.js',
  'js/worker/textura.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // cache: 'reload' ignora o cache do navegador e baixa a versão nova de verdade
      .then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('mapa-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// Primeiro o que está guardado; se faltar algo, busca na internet.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((guardado) =>
      guardado || fetch(e.request).catch(() =>
        e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())),
  );
});
