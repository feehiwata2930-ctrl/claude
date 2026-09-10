import type { Clip } from '../types'

export interface ClipOffset {
  clip: Clip
  start: number
  end: number
}

export function getClipOffsets(clips: Clip[]): ClipOffset[] {
  let cursor = 0
  return clips.map((clip) => {
    const len = Math.max(0, clip.trimEnd - clip.trimStart)
    const entry = { clip, start: cursor, end: cursor + len }
    cursor += len
    return entry
  })
}

export function getTotalDuration(clips: Clip[]): number {
  return clips.reduce((sum, c) => sum + Math.max(0, c.trimEnd - c.trimStart), 0)
}
