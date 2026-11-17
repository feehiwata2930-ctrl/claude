// barra-potes.js — a barra de baixo: um quadrado por pote, na cor de como ele cicatriza.
// Tocar num pote acende só as áreas dele; tocar de novo apaga.

let raiz, aoTocar = () => {};

export function iniciarBarra(el, fn) {
  raiz = el; aoTocar = fn;
  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) aoTocar(Number(b.dataset.i));
  });
}

/** `cores` = lista de [r,g,b], do pote mais escuro ao mais claro. */
export function desenharBarra(cores) {
  raiz.innerHTML = cores.map(([r, g, b], i) =>
    `<button data-i="${i}"><i style="background:rgb(${r},${g},${b})"></i></button>`).join('');
}

/** Marca o pote aceso (ou nenhum, com null). */
export function marcarPote(i) {
  raiz.querySelectorAll('button').forEach((b, k) => b.classList.toggle('aceso', k === i));
  raiz.classList.toggle('tem-aceso', i !== null && i !== undefined);
}
