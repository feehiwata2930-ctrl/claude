// ajustes.js — os ajustes do app, guardados no aparelho.

import { lerConfig, salvarConfig } from './db.js';
import { POTES_PADRAO, ordenarPotes } from './potes.js';

const PADRAO = {
  potes: POTES_PADRAO,
  contraste: 0,       // -1 … 1
  limpezaMm: 1.5,     // 1 / 1,5 / 3 / 5 mm na pele
  tomPele: 1,         // índice em TONS_DE_PELE
  cicatrizado: false,
};

let atual = { ...PADRAO };

export async function carregarAjustes() {
  const salvo = await lerConfig('ajustes', {});
  atual = { ...PADRAO, ...salvo };
  atual.potes = ordenarPotes(atual.potes);
  return atual;
}

export function ajustes() { return atual; }

export async function mudarAjustes(mudancas) {
  atual = { ...atual, ...mudancas };
  atual.potes = ordenarPotes(atual.potes);
  await salvarConfig('ajustes', atual);
  return atual;
}
