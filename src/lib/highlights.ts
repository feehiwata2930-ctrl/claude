import type { Clip } from '../types'
import { uid } from './id'

export interface AutoCutProgress {
  clipIndex: number
  clipCount: number
  stage: 'audio' | 'motion'
  progress: number
}

export interface AutoCutOptions {
  targetTotalDuration: number
  segmentLength?: number
  onProgress?: (info: AutoCutProgress) => void
}

interface Segment {
  start: number
  end: number
  score: number
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

async function computeAudioEnergy(
  file: File,
  rangeStart: number,
  rangeEnd: number,
  step: number,
): Promise<number[]> {
  const numSteps = Math.max(1, Math.ceil((rangeEnd - rangeStart) / step))
  const fallback = new Array(numSteps).fill(0)

  let audioCtx: AudioContext | null = null
  try {
    const AudioContextCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return fallback
    audioCtx = new AudioContextCtor()
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0))
    const channel = audioBuffer.getChannelData(0)
    const sr = audioBuffer.sampleRate

    const energies: number[] = []
    for (let i = 0; i < numSteps; i++) {
      const tStart = rangeStart + i * step
      const tEnd = Math.min(rangeEnd, tStart + step)
      const start = Math.max(0, Math.floor(tStart * sr))
      const end = Math.min(channel.length, Math.floor(tEnd * sr))
      let sumSq = 0
      for (let j = start; j < end; j++) sumSq += channel[j] * channel[j]
      energies.push(end > start ? Math.sqrt(sumSq / (end - start)) : 0)
    }
    return energies
  } catch {
    return fallback
  } finally {
    await audioCtx?.close().catch(() => {})
  }
}

async function computeMotionScores(
  clipUrl: string,
  rangeStart: number,
  rangeEnd: number,
  step: number,
  onProgress?: (ratio: number) => void,
): Promise<number[]> {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = clipUrl

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('failed to load video for motion analysis'))
  })

  const canvas = document.createElement('canvas')
  canvas.width = 48
  canvas.height = 27
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []

  const numSteps = Math.max(1, Math.ceil((rangeEnd - rangeStart) / step))
  const scores: number[] = []
  let prev: Uint8ClampedArray | null = null

  for (let i = 0; i < numSteps; i++) {
    const t = Math.min(rangeEnd - 0.02, rangeStart + i * step)
    try {
      await seekTo(video, Math.max(0, t))
    } catch {
      // ignore seek failures, keep previous frame data
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    if (prev) {
      let diff = 0
      for (let p = 0; p < frame.length; p += 4) {
        const lumaCur = (frame[p] + frame[p + 1] + frame[p + 2]) / 3
        const lumaPrev = (prev[p] + prev[p + 1] + prev[p + 2]) / 3
        diff += Math.abs(lumaCur - lumaPrev)
      }
      scores.push(diff / (frame.length / 4))
    } else {
      scores.push(0)
    }
    prev = frame
    onProgress?.((i + 1) / numSteps)
  }

  video.src = ''
  return scores
}

function normalize(arr: number[]): number[] {
  const max = Math.max(...arr, 1e-6)
  return arr.map((v) => v / max)
}

function smooth(arr: number[], radius: number): number[] {
  return arr.map((_, i) => {
    let sum = 0
    let count = 0
    for (let k = -radius; k <= radius; k++) {
      const idx = i + k
      if (idx >= 0 && idx < arr.length) {
        sum += arr[idx]
        count++
      }
    }
    return count > 0 ? sum / count : 0
  })
}

function combineScores(audio: number[], motion: number[]): number[] {
  const a = normalize(audio)
  const m = normalize(motion)
  const len = Math.max(a.length, m.length)
  const combined: number[] = []
  for (let i = 0; i < len; i++) {
    combined.push(0.6 * (a[i] ?? 0) + 0.4 * (m[i] ?? 0))
  }
  return smooth(combined, 2)
}

function selectSegments(
  scores: number[],
  step: number,
  rangeDuration: number,
  segmentLength: number,
  targetTotal: number,
): Segment[] {
  const covered = new Array(scores.length).fill(false)
  const segments: Segment[] = []
  const segSteps = Math.max(1, Math.round(segmentLength / step))
  let totalPicked = 0

  while (totalPicked < targetTotal) {
    let bestIdx = -1
    let bestScore = -Infinity
    for (let i = 0; i < scores.length; i++) {
      if (covered[i]) continue
      let sum = 0
      let ok = true
      let count = 0
      for (let k = 0; k < segSteps && i + k < scores.length; k++) {
        if (covered[i + k]) {
          ok = false
          break
        }
        sum += scores[i + k]
        count++
      }
      if (!ok || count === 0) continue
      const avg = sum / count
      if (avg > bestScore) {
        bestScore = avg
        bestIdx = i
      }
    }
    if (bestIdx === -1 || bestScore <= 0.03) break

    const start = bestIdx * step
    const end = Math.min(rangeDuration, (bestIdx + segSteps) * step)
    segments.push({ start, end, score: bestScore })
    for (let k = bestIdx; k < bestIdx + segSteps && k < scores.length; k++) covered[k] = true
    totalPicked += end - start
  }

  return segments.sort((a, b) => a.start - b.start)
}

export async function autoCutClips(clips: Clip[], opts: AutoCutOptions): Promise<Clip[]> {
  const { targetTotalDuration, segmentLength = 5, onProgress } = opts
  const totalSourceDuration =
    clips.reduce((sum, c) => sum + Math.max(0, c.trimEnd - c.trimStart), 0) || 1

  const results: Clip[] = []

  for (let ci = 0; ci < clips.length; ci++) {
    const clip = clips[ci]
    const rangeStart = clip.trimStart
    const rangeEnd = clip.trimEnd
    const rangeDuration = Math.max(0.1, rangeEnd - rangeStart)
    const step = Math.max(0.3, rangeDuration / 150)

    const audioEnergies = clip.hasAudio
      ? await computeAudioEnergy(clip.file, rangeStart, rangeEnd, step)
      : new Array(Math.max(1, Math.ceil(rangeDuration / step))).fill(0)
    onProgress?.({ clipIndex: ci, clipCount: clips.length, stage: 'audio', progress: 1 })

    const motionScores = await computeMotionScores(clip.url, rangeStart, rangeEnd, step, (p) =>
      onProgress?.({ clipIndex: ci, clipCount: clips.length, stage: 'motion', progress: p }),
    )

    const combined = combineScores(audioEnergies, motionScores)
    const clipShare = (rangeDuration / totalSourceDuration) * targetTotalDuration
    const segLen = Math.min(segmentLength, rangeDuration)
    const segments = selectSegments(combined, step, rangeDuration, segLen, Math.max(segLen, clipShare))

    if (segments.length === 0) {
      const len = Math.min(rangeDuration, segmentLength)
      const start = Math.max(0, (rangeDuration - len) / 2)
      segments.push({ start, end: start + len, score: 0 })
    }

    segments.forEach((seg, segIdx) => {
      results.push({
        ...clip,
        id: uid(),
        name: segments.length > 1 ? `${clip.name} (corte ${segIdx + 1}/${segments.length})` : clip.name,
        trimStart: rangeStart + seg.start,
        trimEnd: rangeStart + seg.end,
      })
    })
  }

  return results
}
