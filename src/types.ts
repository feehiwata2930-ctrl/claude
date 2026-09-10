export type AspectRatio = '9:16' | '1:1' | '4:5' | '16:9'

export const ASPECT_DIMENSIONS: Record<AspectRatio, { w: number; h: number; label: string }> = {
  '9:16': { w: 1080, h: 1920, label: 'Stories / Reels' },
  '4:5': { w: 1080, h: 1350, label: 'Feed vertical' },
  '1:1': { w: 1080, h: 1080, label: 'Quadrado' },
  '16:9': { w: 1920, h: 1080, label: 'Paisagem' },
}

export interface Clip {
  id: string
  file: File
  url: string
  name: string
  duration: number
  trimStart: number
  trimEnd: number
  volume: number
  hasAudio: boolean
  aiReason?: string
}

export type TextAlign = 'left' | 'center' | 'right'

export interface TextOverlay {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  weight: 400 | 700 | 900
  align: TextAlign
  start: number
  end: number
  background: boolean
}

export interface MusicTrack {
  file: File
  url: string
  name: string
  duration: number
  volume: number
}
