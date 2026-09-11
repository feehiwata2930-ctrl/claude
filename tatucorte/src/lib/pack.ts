export interface PackInput {
  id: string
  widthMm: number
  heightMm: number
}

export interface PackedRect {
  id: string
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
}

/**
 * Empacotamento simples em "prateleiras" (shelf packing): organiza os itens
 * automaticamente dentro da folha para aproveitar melhor o papel. Não é o
 * empacotamento ótimo, mas é previsível e rápido — o usuário pode ajustar
 * manualmente depois.
 */
export function shelfPack(items: PackInput[], sheetWidthMm: number, sheetHeightMm: number, gapMm = 4): PackedRect[] {
  const sorted = [...items].sort((a, b) => b.heightMm - a.heightMm)
  const result: PackedRect[] = []
  let cursorX = gapMm
  let cursorY = gapMm
  let shelfHeight = 0

  for (const item of sorted) {
    if (cursorX + item.widthMm + gapMm > sheetWidthMm) {
      cursorX = gapMm
      cursorY += shelfHeight + gapMm
      shelfHeight = 0
    }
    if (cursorY + item.heightMm + gapMm > sheetHeightMm) {
      // sem espaço; deixa no canto para o usuário reposicionar manualmente
      result.push({ id: item.id, xMm: gapMm, yMm: gapMm, widthMm: item.widthMm, heightMm: item.heightMm })
      continue
    }
    result.push({ id: item.id, xMm: cursorX, yMm: cursorY, widthMm: item.widthMm, heightMm: item.heightMm })
    cursorX += item.widthMm + gapMm
    shelfHeight = Math.max(shelfHeight, item.heightMm)
  }

  return result
}
