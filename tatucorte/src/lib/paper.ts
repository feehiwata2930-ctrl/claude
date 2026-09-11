import type { PaperSize, PaperSizeId } from '../types'

export const PAPER_SIZES: Record<PaperSizeId, PaperSize> = {
  a4: { id: 'a4', label: 'A4 (210 × 297 mm)', widthMm: 210, heightMm: 297 },
  a5: { id: 'a5', label: 'A5 (148 × 210 mm)', widthMm: 148, heightMm: 210 },
  letter: { id: 'letter', label: 'Carta / Letter (215,9 × 279,4 mm)', widthMm: 215.9, heightMm: 279.4 },
  a3: { id: 'a3', label: 'A3 (297 × 420 mm)', widthMm: 297, heightMm: 420 },
}

export function paperDims(id: PaperSizeId, orientation: 'portrait' | 'landscape') {
  const p = PAPER_SIZES[id]
  return orientation === 'portrait'
    ? { widthMm: p.widthMm, heightMm: p.heightMm }
    : { widthMm: p.heightMm, heightMm: p.widthMm }
}
