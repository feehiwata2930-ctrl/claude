import { jsPDF } from 'jspdf'

export interface PdfSheetItem {
  dataUrl: string
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
}

/** Gera um PDF de uma única folha com os decalques posicionados em tamanho real (mm). */
export function buildSheetPdf(items: PdfSheetItem[], paperWidthMm: number, paperHeightMm: number): jsPDF {
  const doc = new jsPDF({
    orientation: paperWidthMm > paperHeightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [paperWidthMm, paperHeightMm],
  })
  for (const item of items) {
    doc.addImage(item.dataUrl, 'PNG', item.xMm, item.yMm, item.widthMm, item.heightMm, undefined, 'FAST')
  }
  return doc
}

function rotateCanvas(source: HTMLCanvasElement, degrees: 0 | 90 | 180 | 270): HTMLCanvasElement {
  if (degrees === 0) return source
  const swap = degrees === 90 || degrees === 270
  const out = document.createElement('canvas')
  out.width = swap ? source.height : source.width
  out.height = swap ? source.width : source.height
  const ctx = out.getContext('2d')!
  ctx.translate(out.width / 2, out.height / 2)
  ctx.rotate((degrees * Math.PI) / 180)
  ctx.drawImage(source, -source.width / 2, -source.height / 2)
  return out
}

export { rotateCanvas }

const MM_PER_INCH = 25.4

/**
 * Gera um PDF com o decalque dividido (mosaico) em várias folhas no tamanho real
 * desejado — o "corte de folha" para imprimir desenhos maiores que o papel.
 * Cada página traz marcas de corte e a posição (linha/coluna) para montagem.
 */
export function buildTilingPdf(
  source: HTMLCanvasElement,
  targetWidthMm: number,
  targetHeightMm: number,
  paperWidthMm: number,
  paperHeightMm: number,
  marginMm = 12,
  dpi = 200,
): { doc: jsPDF; cols: number; rows: number } {
  const usableW = paperWidthMm - 2 * marginMm
  const usableH = paperHeightMm - 2 * marginMm
  const cols = Math.max(1, Math.ceil(targetWidthMm / usableW))
  const rows = Math.max(1, Math.ceil(targetHeightMm / usableH))
  const tileWidthMm = targetWidthMm / cols
  const tileHeightMm = targetHeightMm / rows

  const doc = new jsPDF({
    orientation: paperWidthMm > paperHeightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [paperWidthMm, paperHeightMm],
  })

  const pxPerMm = dpi / MM_PER_INCH

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r > 0 || c > 0) doc.addPage([paperWidthMm, paperHeightMm], paperWidthMm > paperHeightMm ? 'landscape' : 'portrait')

      const sx = (c / cols) * source.width
      const sy = (r / rows) * source.height
      const sw = source.width / cols
      const sh = source.height / rows

      const tileCanvas = document.createElement('canvas')
      tileCanvas.width = Math.max(1, Math.round(tileWidthMm * pxPerMm))
      tileCanvas.height = Math.max(1, Math.round(tileHeightMm * pxPerMm))
      const tctx = tileCanvas.getContext('2d')!
      tctx.fillStyle = '#ffffff'
      tctx.fillRect(0, 0, tileCanvas.width, tileCanvas.height)
      tctx.drawImage(source, sx, sy, sw, sh, 0, 0, tileCanvas.width, tileCanvas.height)

      const dataUrl = tileCanvas.toDataURL('image/png')
      const x = (paperWidthMm - tileWidthMm) / 2
      const y = (paperHeightMm - tileHeightMm) / 2
      doc.addImage(dataUrl, 'PNG', x, y, tileWidthMm, tileHeightMm, undefined, 'FAST')

      // marcas de corte nos 4 cantos
      const mark = 6
      doc.setDrawColor(160)
      doc.setLineWidth(0.2)
      const corners: [number, number][] = [
        [x, y],
        [x + tileWidthMm, y],
        [x, y + tileHeightMm],
        [x + tileWidthMm, y + tileHeightMm],
      ]
      for (const [cx, cy] of corners) {
        doc.line(cx - mark / 2, cy, cx + mark / 2, cy)
        doc.line(cx, cy - mark / 2, cx, cy + mark / 2)
      }

      doc.setFontSize(8)
      doc.setTextColor(120)
      doc.text(`Folha ${r * cols + c + 1}/${rows * cols} · linha ${r + 1}/${rows} · coluna ${c + 1}/${cols}`, paperWidthMm / 2, paperHeightMm - 4, {
        align: 'center',
      })
    }
  }

  return { doc, cols, rows }
}
