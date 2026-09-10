export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    const url = URL.createObjectURL(file)
    video.src = url
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(video.duration) ? video.duration : 0)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Não foi possível ler o vídeo "${file.name}"`))
    }
  })
}

export function probeHasAudio(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const settle = (value: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(value)
    }
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    const url = URL.createObjectURL(file)
    video.src = url
    // Optimistic default: assume audio is present if we can't determine it in time.
    const timer = setTimeout(() => settle(true), 4000)
    video.onloadeddata = () => {
      try {
        const el = video as HTMLVideoElement & {
          captureStream?: () => MediaStream
          mozCaptureStream?: () => MediaStream
        }
        const capture = el.captureStream ?? el.mozCaptureStream
        const stream = capture?.call(el)
        settle(!!stream && stream.getAudioTracks().length > 0)
      } catch {
        settle(true)
      }
    }
    video.onerror = () => settle(true)
  })
}

export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    const url = URL.createObjectURL(file)
    audio.src = url
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Não foi possível ler o áudio "${file.name}"`))
    }
  })
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds - Math.floor(seconds)) * 10)
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`
}
