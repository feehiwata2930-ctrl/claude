// lupa.js — o círculo que aparece ao SEGURAR o dedo: mostra a cor do pote daquele ponto.
// Fica acima do dedo para a luva não esconder.

let el, miolo;
const TAM = 104, AFASTA = 92;

export function iniciarLupa(pai) {
  el = document.createElement('div');
  el.className = 'lupa';
  el.hidden = true;
  el.innerHTML = '<div class="lupa-cor"></div><div class="lupa-ponto"></div>';
  miolo = el.firstChild;
  pai.appendChild(el);
}

/** (x, y) = posição do dedo na tela; cor = [r,g,b] do pote (ou null fora da imagem). */
export function mostrarLupa(x, y, cor) {
  // perto do topo não cabe acima: vai para o lado
  const cima = y - AFASTA - TAM / 2 > 8;
  const cx = cima ? x : (x > TAM + AFASTA ? x - AFASTA : x + AFASTA);
  const cy = cima ? y - AFASTA : y;
  el.style.transform = `translate(${cx - TAM / 2}px, ${cy - TAM / 2}px)`;
  miolo.style.background = cor ? `rgb(${cor.join(',')})` : 'transparent';
  el.classList.toggle('vazia', !cor);
  // ponto que marca exatamente onde o dedo está medindo
  el.lastChild.style.transform = `translate(${x - cx}px, ${y - cy}px)`;
  if (el.hidden) { el.hidden = false; pulsar(); }
}

/** Pisca o círculo: é o retorno visual garantido (a vibração pode faltar no iPhone). */
export function pulsar() {
  el.classList.remove('pulso');
  void el.offsetWidth;   // reinicia a animação
  el.classList.add('pulso');
}

export function esconderLupa() { el.hidden = true; }
