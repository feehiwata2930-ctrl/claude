// energia.js — mantém a tela acesa durante a sessão (Wake Lock API).
// Se o iPhone não deixar (versões antigas, modo de bateria baixa...), avisa pelo callback
// para o visualizador mostrar o ícone discreto.

let trava = null, ativo = false, aviso = () => {};

async function pedir() {
  try {
    if (!('wakeLock' in navigator)) throw new Error('sem Wake Lock');
    trava = await navigator.wakeLock.request('screen');
    trava.addEventListener('release', () => { trava = null; if (ativo && document.visibilityState === 'visible') pedir(); });
    aviso(true);
  } catch {
    trava = null;
    aviso(false);
  }
}

// Ao voltar para o app (ex.: depois de uma notificação) a trava precisa ser pedida de novo.
document.addEventListener('visibilitychange', () => {
  if (ativo && document.visibilityState === 'visible' && !trava) pedir();
});

/** Começa a manter a tela acesa. `fn(true|false)` informa se conseguiu. */
export function manterAcesa(fn) { ativo = true; aviso = fn; return pedir(); }

/** Para de manter a tela acesa. */
export function soltarTela() {
  ativo = false;
  if (trava) { trava.release().catch(() => {}); trava = null; }
}

/** Tenta de novo (toque no ícone de aviso). */
export function tentarDeNovo() { return pedir(); }
