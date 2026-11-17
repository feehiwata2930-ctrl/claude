// luz.js — classifica cada pixel do mapa de potes para a lente Luz:
//   0 = tinta (área que recebe tinta)
//   1 = luz   (pele limpa DENTRO da peça: aparece com listras azuis)
//   2 = fundo (pele limpa conectada à borda da imagem; ou, se o fundo da referência
//              for escuro, o pote escuro conectado à borda) — aparece escurecido

/**
 * @param mapa  índice do pote de cada pixel
 * @param limpo flags por pote: 1 = pele limpa (0 % de tinta)
 */
export function classificarLuz(mapa, l, a, limpo, nPotes) {
  const n = l * a;

  // 1) Qual pote domina a borda da imagem? (decide se o fundo é claro ou escuro)
  const cont = new Int32Array(nPotes);
  let perimetro = 0;
  const conta = (p) => { cont[mapa[p]]++; perimetro++; };
  for (let x = 0; x < l; x++) { conta(x); conta((a - 1) * l + x); }
  for (let y = 1; y < a - 1; y++) { conta(y * l); conta(y * l + l - 1); }
  let dominante = 0;
  for (let k = 1; k < nPotes; k++) if (cont[k] > cont[dominante]) dominante = k;
  const fundoEscuro = !limpo[dominante] && cont[dominante] >= perimetro * 0.5;

  // 2) Inundação a partir da borda: entra pele limpa (e, em fundo escuro, o pote escuro do fundo)
  // Fundo claro: a pele limpa que toca a borda. Fundo escuro: só o pote escuro do fundo
  // (pele limpa encostada na borda, como a ponta de um focinho, continua sendo luz da peça).
  const serve = fundoEscuro ? (p) => mapa[p] === dominante : (p) => limpo[mapa[p]] === 1;
  const fundo = new Uint8Array(n);
  const fila = new Int32Array(n);
  let ini = 0, fim = 0;
  const semente = (p) => { if (!fundo[p] && serve(p)) { fundo[p] = 1; fila[fim++] = p; } };
  for (let x = 0; x < l; x++) { semente(x); semente((a - 1) * l + x); }
  for (let y = 1; y < a - 1; y++) { semente(y * l); semente(y * l + l - 1); }
  while (ini < fim) {
    const p = fila[ini++], x = p % l;
    let q;
    if (x > 0 && !fundo[q = p - 1] && serve(q)) { fundo[q] = 1; fila[fim++] = q; }
    if (x < l - 1 && !fundo[q = p + 1] && serve(q)) { fundo[q] = 1; fila[fim++] = q; }
    if (p >= l && !fundo[q = p - l] && serve(q)) { fundo[q] = 1; fila[fim++] = q; }
    if (p < n - l && !fundo[q = p + l] && serve(q)) { fundo[q] = 1; fila[fim++] = q; }
  }

  // 3) Classes finais
  const cls = new Uint8Array(n);
  for (let p = 0; p < n; p++) cls[p] = fundo[p] ? 2 : (limpo[mapa[p]] ? 1 : 0);
  return cls;
}
