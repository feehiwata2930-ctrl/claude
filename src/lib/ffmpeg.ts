import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { Clip, MusicTrack, TextOverlay } from '../types'

const CORE_VERSION = '0.12.6'
// Try a couple of CDNs in order in case one is unreachable on the user's network.
const CORE_BASES = [
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
]

let ffmpegInstance: FFmpeg | null = null
let loadingPromise: Promise<FFmpeg> | null = null
let progressHandler: ((ratio: number) => void) | null = null
let logHandler: ((message: string) => void) | null = null

async function loadCoreFrom(ffmpeg: FFmpeg, base: string) {
  const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript')
  const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm')
  await ffmpeg.load({ coreURL, wasmURL })
}

async function ensureFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance
  if (!loadingPromise) {
    loadingPromise = (async () => {
      const ffmpeg = new FFmpeg()
      ffmpeg.on('progress', ({ progress }) => {
        if (progressHandler && Number.isFinite(progress)) {
          progressHandler(Math.min(1, Math.max(0, progress)))
        }
      })
      ffmpeg.on('log', ({ message }) => logHandler?.(message))

      let lastError: unknown = null
      for (const base of CORE_BASES) {
        try {
          await loadCoreFrom(ffmpeg, base)
          ffmpegInstance = ffmpeg
          return ffmpeg
        } catch (err) {
          lastError = err
        }
      }
      throw new Error(
        'Não foi possível carregar o motor de edição de vídeo. Verifique sua conexão com a internet e tente novamente.',
        { cause: lastError },
      )
    })()
  }
  try {
    return await loadingPromise
  } catch (err) {
    loadingPromise = null
    throw err
  }
}

function escapeDrawtext(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function fontFileFor(weight: number): string {
  return weight >= 700 ? 'InstrumentSans-Bold.ttf' : 'InstrumentSans-Regular.ttf'
}

interface ExportParams {
  clips: Clip[]
  dims: { w: number; h: number }
  textOverlays: TextOverlay[]
  music: MusicTrack | null
  originalVolume: number
}

export type ExportStage = 'loading' | 'preparing' | 'encoding' | 'finishing'

interface ExportCallbacks {
  onStage?: (stage: ExportStage) => void
  onProgress?: (ratio: number) => void
  onLog?: (message: string) => void
}

export async function exportProject(
  { clips, dims, textOverlays, music, originalVolume }: ExportParams,
  { onStage, onProgress, onLog }: ExportCallbacks = {},
): Promise<Blob> {
  if (clips.length === 0) throw new Error('Adicione ao menos um vídeo antes de exportar.')

  const logBuffer: string[] = []
  logHandler = (message) => {
    logBuffer.push(message)
    if (logBuffer.length > 40) logBuffer.shift()
    onLog?.(message)
  }
  progressHandler = null

  onStage?.('loading')
  const ffmpeg = await ensureFFmpeg()

  onStage?.('preparing')
  const clipNames: string[] = []
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const name = `clip${i}.input`
    await ffmpeg.writeFile(name, await fetchFile(clip.file))
    clipNames.push(name)
  }

  await ffmpeg.writeFile(
    'InstrumentSans-Regular.ttf',
    await fetchFile(`${window.location.origin}/fonts/InstrumentSans-Regular.ttf`),
  )
  await ffmpeg.writeFile(
    'InstrumentSans-Bold.ttf',
    await fetchFile(`${window.location.origin}/fonts/InstrumentSans-Bold.ttf`),
  )

  let musicName: string | null = null
  if (music) {
    musicName = 'music.input'
    await ffmpeg.writeFile(musicName, await fetchFile(music.file))
  }

  const args: string[] = []
  clipNames.forEach((name) => {
    args.push('-i', name)
  })

  // Clips without a detected audio stream get a synthetic silent track so the
  // filtergraph always has an [i:a] pad to reference — real videos vary here.
  const silentInputIndex = new Map<number, number>()
  let nextInputIndex = clipNames.length
  clips.forEach((clip, i) => {
    if (!clip.hasAudio) {
      args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100')
      silentInputIndex.set(i, nextInputIndex)
      nextInputIndex += 1
    }
  })

  let musicInputIndex: number | null = null
  if (musicName) {
    args.push('-i', musicName)
    musicInputIndex = nextInputIndex
    nextInputIndex += 1
  }

  const filterParts: string[] = []

  let cursor = 0
  clips.forEach((clip, i) => {
    const start = clip.trimStart.toFixed(3)
    const end = clip.trimEnd.toFixed(3)
    const vol = Math.min(1, Math.max(0, clip.volume * originalVolume)).toFixed(3)
    const vLabel = `v${i}`
    const aLabel = `a${i}`
    filterParts.push(
      `[${i}:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS,scale=${dims.w}:${dims.h}:force_original_aspect_ratio=increase,crop=${dims.w}:${dims.h},fps=30,format=yuv420p,setsar=1[${vLabel}]`,
    )
    const aSourceIndex = clip.hasAudio ? i : silentInputIndex.get(i)!
    const aStart = clip.hasAudio ? start : '0.000'
    const aEnd = clip.hasAudio ? end : (clip.trimEnd - clip.trimStart).toFixed(3)
    filterParts.push(
      `[${aSourceIndex}:a]atrim=start=${aStart}:end=${aEnd},asetpts=PTS-STARTPTS,volume=${vol}[${aLabel}]`,
    )
    cursor += Math.max(0, clip.trimEnd - clip.trimStart)
  })
  const totalDuration = cursor

  const concatInputs = clips.map((_, i) => `[v${i}][a${i}]`).join('')
  filterParts.push(`${concatInputs}concat=n=${clips.length}:v=1:a=1[vconcat][aconcat]`)

  let videoOut = 'vconcat'
  textOverlays.forEach((t, idx) => {
    if (!t.text.trim()) return
    const fs = Math.max(8, Math.round((t.fontSize / 1080) * dims.w))
    const xFrac = (t.x / 100).toFixed(4)
    const yFrac = (t.y / 100).toFixed(4)
    const xExpr =
      t.align === 'left'
        ? `(w*${xFrac})`
        : t.align === 'right'
          ? `(w*${xFrac})-text_w`
          : `(w*${xFrac})-text_w/2`
    const yExpr = `(h*${yFrac})-text_h/2`
    const out = `vt${idx}`
    const box = t.background ? ':box=1:boxcolor=black@0.45:boxborderw=16' : ''
    filterParts.push(
      `[${videoOut}]drawtext=fontfile=${fontFileFor(t.weight)}:text='${escapeDrawtext(t.text)}':fontsize=${fs}:fontcolor=${t.color}:x=${xExpr}:y=${yExpr}:enable='between(t,${t.start.toFixed(3)},${t.end.toFixed(3)})'${box}[${out}]`,
    )
    videoOut = out
  })

  let audioOut = 'aconcat'
  if (musicName && musicInputIndex !== null) {
    const musicIndex = musicInputIndex
    const musicVol = Math.min(1, Math.max(0, music!.volume)).toFixed(3)
    filterParts.push(
      `[${musicIndex}:a]aloop=loop=-1:size=2147483647,atrim=start=0:end=${totalDuration.toFixed(3)},asetpts=PTS-STARTPTS,volume=${musicVol}[music]`,
    )
    filterParts.push(`[${audioOut}][music]amix=inputs=2:duration=first:dropout_transition=0[amixed]`)
    audioOut = 'amixed'
  }

  args.push(
    '-filter_complex',
    filterParts.join(';'),
    '-map',
    `[${videoOut}]`,
    '-map',
    `[${audioOut}]`,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-movflags',
    '+faststart',
    'output.mp4',
  )

  onStage?.('encoding')
  progressHandler = (ratio) => onProgress?.(ratio)

  try {
    await ffmpeg.exec(args)
  } catch (err) {
    const tail = logBuffer.slice(-6).join(' | ')
    throw new Error(
      `Falha ao renderizar o vídeo.${tail ? ` Detalhes: ${tail}` : err instanceof Error ? ` ${err.message}` : ''}`,
    )
  } finally {
    for (const name of clipNames) await ffmpeg.deleteFile(name).catch(() => {})
    if (musicName) await ffmpeg.deleteFile(musicName).catch(() => {})
  }

  onStage?.('finishing')
  const data = await ffmpeg.readFile('output.mp4')
  const blob = new Blob([data as Uint8Array<ArrayBuffer>], { type: 'video/mp4' })
  await ffmpeg.deleteFile('output.mp4').catch(() => {})

  progressHandler = null
  logHandler = null
  return blob
}
