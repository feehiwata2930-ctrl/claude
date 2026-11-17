// gestos.js — traduz os dedos na tela em gestos simples:
//   arrastar (1 dedo), pinça (2 dedos), toque, toque duplo e segurar.
// Tolerâncias largas de propósito: o app é usado de luva.

const TEMPO_SEGURAR = 380;   // ms parado para virar "segurar"
const FOLGA = 14;            // px que o dedo pode tremer sem virar arrasto
const TEMPO_DUPLO = 340;     // ms entre os dois toques do toque duplo
const RAIO_DUPLO = 48;       // px de distância máxima entre os dois toques

/**
 * @param {HTMLElement} el
 * @param {object} cb  funções opcionais:
 *   aoArrastar(dx, dy) · aoPinca(fator, cx, cy, dx, dy) · aoToque(x, y) · aoToqueDuplo(x, y)
 *   aoSegurar(x, y) · aoSegurarMover(x, y) · aoSoltar()
 */
export function ligarGestos(el, cb) {
  const dedos = new Map();          // id -> {x, y}
  let modo = null;                  // 'arrasto' | 'pinca' | 'segurar'
  let inicio = null, moveu = false, relogio = 0;
  let distAnt = 0, centroAnt = null;
  let ultimoToque = { t: 0, x: 0, y: 0 };

  const pos = (e) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const doisDedos = () => {
    const [a, b] = [...dedos.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, centro: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };

  el.addEventListener('pointerdown', (e) => {
    try { el.setPointerCapture(e.pointerId); } catch { /* alguns navegadores recusam; segue sem */ }
    const p = pos(e);
    dedos.set(e.pointerId, p);
    clearTimeout(relogio);
    if (dedos.size === 1) {
      modo = 'arrasto'; inicio = { ...p, t: performance.now() }; moveu = false;
      relogio = setTimeout(() => {
        if (dedos.size === 1 && !moveu) { modo = 'segurar'; cb.aoSegurar?.(inicio.x, inicio.y); }
      }, TEMPO_SEGURAR);
    } else if (dedos.size === 2) {
      if (modo === 'segurar') cb.aoSoltar?.();
      modo = 'pinca'; moveu = true;
      ({ dist: distAnt, centro: centroAnt } = doisDedos());
    }
  });

  el.addEventListener('pointermove', (e) => {
    const ant = dedos.get(e.pointerId);
    if (!ant) return;
    const p = pos(e);
    dedos.set(e.pointerId, p);
    if (modo === 'segurar') { cb.aoSegurarMover?.(p.x, p.y); return; }
    if (modo === 'pinca' && dedos.size >= 2) {
      const { dist, centro } = doisDedos();
      cb.aoPinca?.(dist / distAnt, centro.x, centro.y, centro.x - centroAnt.x, centro.y - centroAnt.y);
      distAnt = dist; centroAnt = centro;
      return;
    }
    if (modo === 'arrasto') {
      if (!moveu) {
        if (Math.hypot(p.x - inicio.x, p.y - inicio.y) < FOLGA) return;
        moveu = true; clearTimeout(relogio);
        cb.aoArrastar?.(p.x - inicio.x, p.y - inicio.y);   // inclui o que ficou pendente
      } else {
        cb.aoArrastar?.(p.x - ant.x, p.y - ant.y);
      }
    }
  });

  const fim = (e) => {
    if (!dedos.has(e.pointerId)) return;
    const p = dedos.get(e.pointerId);
    dedos.delete(e.pointerId);
    clearTimeout(relogio);
    if (modo === 'segurar') {
      if (dedos.size === 0) { cb.aoSoltar?.(); modo = null; }
      return;
    }
    if (modo === 'pinca') {
      // Sobrou um dedo: continua como arrasto, sem contar como toque.
      modo = dedos.size >= 1 ? 'arrasto' : null; moveu = true;
      if (dedos.size >= 2) ({ dist: distAnt, centro: centroAnt } = doisDedos());
      return;
    }
    if (modo === 'arrasto' && !moveu && e.type === 'pointerup') {
      const agora = performance.now();
      const duplo = agora - ultimoToque.t < TEMPO_DUPLO &&
        Math.hypot(p.x - ultimoToque.x, p.y - ultimoToque.y) < RAIO_DUPLO;
      if (duplo) { ultimoToque.t = 0; cb.aoToqueDuplo?.(p.x, p.y); }
      else { ultimoToque = { t: agora, x: p.x, y: p.y }; cb.aoToque?.(p.x, p.y); }
    }
    if (dedos.size === 0) modo = null;
  };
  el.addEventListener('pointerup', fim);
  el.addEventListener('pointercancel', fim);

  // Impede o zoom de página do Safari e o menu de contexto.
  for (const ev of ['gesturestart', 'gesturechange', 'contextmenu']) {
    el.addEventListener(ev, (e) => e.preventDefault());
  }
}
