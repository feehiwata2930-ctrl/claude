export interface SampledFrame {
  time: number
  base64: string
  mediaType: 'image/jpeg'
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      video.removeEventListener('seeked', onSeeked)
      clearTimeout(timer)
      resolve()
    }
    const onSeeked = () => settle()
    // Some browsers never fire 'seeked' (e.g. seeking to a time that rounds
    // to the current position, or certain variable-frame-rate files) — a
    // timeout keeps this from hanging the whole analysis forever.
    const timer = setTimeout(settle, 2000)
    video.addEventListener('seeked', onSeeked)
    video.currentTime = time
  })
}

function waitForMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('error', onError)
      clearTimeout(timer)
    }
    const onLoaded = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }
    const onError = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('Não foi possível carregar o vídeo para extrair frames.'))
    }
    // iOS Safari in particular can silently stall metadata loading on a
    // <video> that was never attached to the DOM, with neither
    // loadedmetadata nor error ever firing — bound the wait instead of
    // hanging the whole analysis forever.
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('Tempo esgotado ao carregar o vídeo para extrair frames.'))
    }, 8000)
    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('error', onError)
  })
}

interface SampleOptions {
  maxFrames?: number
  maxWidth?: number
}

export async function sampleFrames(
  clipUrl: string,
  rangeStart: number,
  rangeEnd: number,
  opts: SampleOptions = {},
): Promise<SampledFrame[]> {
  const { maxFrames = 24, maxWidth = 480 } = opts

  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  // iOS Safari needs the element actually in the render tree to reliably
  // load metadata and honor seeks — visually hidden, not display:none.
  video.style.position = 'fixed'
  video.style.width = '1px'
  video.style.height = '1px'
  video.style.opacity = '0'
  video.style.pointerEvents = 'none'
  video.setAttribute('aria-hidden', 'true')
  document.body.appendChild(video)

  try {
    video.src = clipUrl
    await waitForMetadata(video)

    const rangeDuration = Math.max(0.1, rangeEnd - rangeStart)
    const frameCount = Math.max(2, Math.min(maxFrames, Math.ceil(rangeDuration)))
    const step = rangeDuration / frameCount

    const vw = video.videoWidth || 640
    const vh = video.videoHeight || 360
    const scale = Math.min(1, maxWidth / vw)
    const w = Math.max(1, Math.round(vw * scale))
    const h = Math.max(1, Math.round(vh * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return []

    const frames: SampledFrame[] = []
    for (let i = 0; i < frameCount; i++) {
      const t = Math.min(rangeEnd - 0.02, rangeStart + i * step)
      try {
        await seekTo(video, Math.max(0, t))
      } catch {
        // keep going with whatever frame is currently displayed
      }
      try {
        ctx.drawImage(video, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
        const base64 = dataUrl.split(',')[1] ?? ''
        if (base64) frames.push({ time: t, base64, mediaType: 'image/jpeg' })
      } catch {
        // skip a frame that failed to draw/encode rather than aborting the batch
      }
    }

    return frames
  } finally {
    video.src = ''
    video.remove()
  }
}
