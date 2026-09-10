export interface SampledFrame {
  time: number
  base64: string
  mediaType: 'image/jpeg'
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }
    video.addEventListener('seeked', onSeeked)
    video.currentTime = time
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
  video.src = clipUrl

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('Não foi possível carregar o vídeo para extrair frames.'))
  })

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
    ctx.drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
    const base64 = dataUrl.split(',')[1] ?? ''
    if (base64) frames.push({ time: t, base64, mediaType: 'image/jpeg' })
  }

  video.src = ''
  return frames
}
