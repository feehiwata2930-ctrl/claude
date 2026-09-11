import type { StencilSettings } from '../types'

export const DEFAULT_STENCIL_SETTINGS: StencilSettings = {
  threshold: 110,
  contrast: 20,
  lineThickness: 1,
  invert: false,
}

export async function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Converte uma imagem em um decalque (stencil) preto e branco: escala de cinza,
 * detecção de bordas (Sobel), limiar (threshold) e espessura de linha ajustáveis.
 * Roda inteiramente no navegador via Canvas — a foto nunca sai do dispositivo
 * nesta etapa.
 */
export function generateStencil(
  img: HTMLImageElement,
  settings: StencilSettings,
  maxDimension = 2000,
): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))

  const src = document.createElement('canvas')
  src.width = w
  src.height = h
  const sctx = src.getContext('2d')!
  sctx.drawImage(img, 0, 0, w, h)
  const { data } = sctx.getImageData(0, 0, w, h)

  const gray = new Float32Array(w * h)
  const contrastFactor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast))
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    let lum = 0.299 * r + 0.587 * g + 0.114 * b
    lum = contrastFactor * (lum - 128) + 128
    gray[i] = Math.min(255, Math.max(0, lum))
  }

  // Sobel edge detection
  const edges = new Float32Array(w * h)
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sx = 0
      let sy = 0
      let k = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const v = gray[(y + dy) * w + (x + dx)]
          sx += v * gx[k]
          sy += v * gy[k]
          k++
        }
      }
      edges[y * w + x] = Math.sqrt(sx * sx + sy * sy)
    }
  }

  // Threshold -> binary (1 = line)
  let line = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    line[i] = edges[i] >= settings.threshold ? 1 : 0
  }

  // Dilate to thicken lines
  for (let pass = 0; pass < settings.lineThickness; pass++) {
    const next = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let on = 0
        for (let dy = -1; dy <= 1 && !on; dy++) {
          for (let dx = -1; dx <= 1 && !on; dx++) {
            const ny = y + dy
            const nx = x + dx
            if (ny >= 0 && ny < h && nx >= 0 && nx < w && line[ny * w + nx]) on = 1
          }
        }
        next[y * w + x] = on
      }
    }
    line = next
  }

  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const octx = out.getContext('2d')!
  const outData = octx.createImageData(w, h)
  const inkColor = settings.invert ? [255, 255, 255] : [15, 15, 20]
  const bgColor = settings.invert ? [15, 15, 20] : [255, 255, 255]
  for (let i = 0; i < w * h; i++) {
    const isLine = line[i] === 1
    const [r, g, b] = isLine ? inkColor : bgColor
    outData.data[i * 4] = r
    outData.data[i * 4 + 1] = g
    outData.data[i * 4 + 2] = b
    outData.data[i * 4 + 3] = isLine ? 255 : settings.invert ? 255 : 0
  }
  octx.putImageData(outData, 0, 0)
  return out
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Falha ao gerar imagem'))
    }, 'image/png')
  })
}
