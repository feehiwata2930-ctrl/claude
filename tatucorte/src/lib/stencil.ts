import type { StencilSettings } from '../types'

export const DEFAULT_STENCIL_SETTINGS: StencilSettings = {
  threshold: 40,
  contrast: 20,
  blur: 1,
  lineThickness: 0,
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

function toGrayscale(data: Uint8ClampedArray, w: number, h: number, contrast: number): Float32Array {
  const gray = new Float32Array(w * h)
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    let lum = 0.299 * r + 0.587 * g + 0.114 * b
    lum = contrastFactor * (lum - 128) + 128
    gray[i] = Math.min(255, Math.max(0, lum))
  }
  return gray
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

/**
 * Suaviza ruído preservando bordas fortes (ao contrário de um blur comum):
 * só mistura um pixel com vizinhos de intensidade parecida. Essencial aqui —
 * um blur gaussiano simples apaga tanto o ruído de textura (pele, JPEG) quanto
 * traços finos legítimos (fios de cabelo, barba), já que ambos são "alta
 * frequência"; o filtro bilateral distingue os dois pelo contraste.
 */
function bilateralFilter(src: Float32Array, w: number, h: number, radius: number, sigmaColor = 28): Float32Array {
  if (radius <= 0) return src
  const sigmaSpace = Math.max(1, radius)
  const spatialDenom = 2 * sigmaSpace * sigmaSpace
  const colorDenom = 2 * sigmaColor * sigmaColor
  const spatial = new Float32Array((radius * 2 + 1) * (radius * 2 + 1))
  let k = 0
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      spatial[k++] = Math.exp(-(dx * dx + dy * dy) / spatialDenom)
    }
  }

  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const center = src[y * w + x]
      let sumWeight = 0
      let sumValue = 0
      k = 0
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = clamp(y + dy, 0, h - 1)
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = clamp(x + dx, 0, w - 1)
          const v = src[ny * w + nx]
          const diff = v - center
          const weight = spatial[k++] * Math.exp(-(diff * diff) / colorDenom)
          sumWeight += weight
          sumValue += weight * v
        }
      }
      out[y * w + x] = sumValue / sumWeight
    }
  }
  return out
}

interface Gradients {
  mag: Float32Array
  dir: Uint8Array // 0=0°(horizontal), 1=45°, 2=90°(vertical), 3=135°
}

function sobelGradients(gray: Float32Array, w: number, h: number): Gradients {
  const mag = new Float32Array(w * h)
  const dir = new Uint8Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const tl = gray[i - w - 1]
      const t = gray[i - w]
      const tr = gray[i - w + 1]
      const l = gray[i - 1]
      const r = gray[i + 1]
      const bl = gray[i + w - 1]
      const b = gray[i + w]
      const br = gray[i + w + 1]

      const gx = tr + 2 * r + br - tl - 2 * l - bl
      const gy = bl + 2 * b + br - tl - 2 * t - tr

      mag[i] = Math.sqrt(gx * gx + gy * gy)

      let angle = (Math.atan2(gy, gx) * 180) / Math.PI
      if (angle < 0) angle += 180
      if (angle < 22.5 || angle >= 157.5) dir[i] = 0
      else if (angle < 67.5) dir[i] = 1
      else if (angle < 112.5) dir[i] = 2
      else dir[i] = 3
    }
  }
  return { mag, dir }
}

/** Mantém só os pixels que são máximo local na direção do gradiente — transforma bordas "grossas" em linhas finas de 1px. */
function nonMaxSuppression(mag: Float32Array, dir: Uint8Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const m = mag[i]
      if (m === 0) continue
      let n1: number
      let n2: number
      switch (dir[i]) {
        case 0:
          n1 = mag[i - 1]
          n2 = mag[i + 1]
          break
        case 1:
          n1 = mag[i - w + 1]
          n2 = mag[i + w - 1]
          break
        case 2:
          n1 = mag[i - w]
          n2 = mag[i + w]
          break
        default:
          n1 = mag[i - w - 1]
          n2 = mag[i + w + 1]
      }
      out[i] = m >= n1 && m >= n2 ? m : 0
    }
  }
  return out
}

/** Limiar duplo + histerese: bordas fracas só sobrevivem se conectadas (8-vizinhança) a uma borda forte. */
function hysteresis(suppressed: Float32Array, w: number, h: number, lowThreshold: number, highThreshold: number): Uint8Array {
  const STRONG = 2
  const WEAK = 1
  const classified = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    if (suppressed[i] >= highThreshold) classified[i] = STRONG
    else if (suppressed[i] >= lowThreshold) classified[i] = WEAK
  }

  const edge = new Uint8Array(w * h)
  const stack: number[] = []
  for (let i = 0; i < w * h; i++) {
    if (classified[i] === STRONG && edge[i] === 0) {
      edge[i] = 1
      stack.push(i)
    }
  }
  while (stack.length > 0) {
    const i = stack.pop()!
    const x = i % w
    const y = (i - x) / w
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
        const ni = ny * w + nx
        if (classified[ni] !== 0 && edge[ni] === 0) {
          edge[ni] = 1
          stack.push(ni)
        }
      }
    }
  }
  return edge
}

/**
 * Converte uma imagem em um decalque (stencil) preto e branco usando um pipeline
 * ao estilo Canny: desfoque (reduz ruído de textura/compressão), Sobel, supressão
 * de não-máximo (afina as bordas) e limiar duplo com histerese (conecta bordas
 * fracas a bordas fortes, descarta ruído isolado) — produz linhas finas e
 * contínuas em vez do "chuvisco" de um limiar simples sobre Sobel bruto.
 * Roda inteiramente no navegador via Canvas — a foto nunca sai do dispositivo
 * nesta etapa.
 */
export function generateStencil(
  img: HTMLImageElement,
  settings: StencilSettings,
  maxDimension = 2000,
  lowThresholdRatio = 0.4,
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

  const gray = toGrayscale(data, w, h, settings.contrast)
  const blurred = bilateralFilter(gray, w, h, settings.blur)
  const { mag, dir } = sobelGradients(blurred, w, h)
  const suppressed = nonMaxSuppression(mag, dir, w, h)

  const highThreshold = settings.threshold
  const lowThreshold = highThreshold * lowThresholdRatio
  let line = hysteresis(suppressed, w, h, lowThreshold, highThreshold)

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
  // Fundo sempre opaco (não transparente): o decalque é sempre exibido/impresso
  // sobre uma folha branca em todo o app, e pixels totalmente transparentes têm
  // o RGB zerado internamente pelo canvas (alpha pré-multiplicado) — mantendo
  // tudo opaco evitamos essa pegadinha por completo.
  const inkColor = settings.invert ? [255, 255, 255] : [15, 15, 20]
  const bgColor = settings.invert ? [15, 15, 20] : [255, 255, 255]
  for (let i = 0; i < w * h; i++) {
    const isLine = line[i] === 1
    const [r, g, b] = isLine ? inkColor : bgColor
    outData.data[i * 4] = r
    outData.data[i * 4 + 1] = g
    outData.data[i * 4 + 2] = b
    outData.data[i * 4 + 3] = 255
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
