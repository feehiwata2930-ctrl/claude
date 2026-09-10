import { create } from 'zustand'
import type { AspectRatio, Clip, MusicTrack, TextOverlay } from './types'
import { getTotalDuration } from './lib/timeline'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

interface ProjectState {
  clips: Clip[]
  textOverlays: TextOverlay[]
  aspectRatio: AspectRatio
  music: MusicTrack | null
  originalVolume: number
  selectedClipId: string | null
  selectedTextId: string | null
  exporting: boolean
  exportProgress: number
  exportError: string | null
  resultUrl: string | null

  addClips: (files: File[], durations: number[], hasAudio: boolean[]) => void
  removeClip: (id: string) => void
  moveClip: (id: string, direction: -1 | 1) => void
  setTrim: (id: string, trimStart: number, trimEnd: number) => void
  setClipVolume: (id: string, volume: number) => void
  selectClip: (id: string | null) => void

  addTextOverlay: (atTime: number) => void
  updateTextOverlay: (id: string, patch: Partial<TextOverlay>) => void
  removeTextOverlay: (id: string) => void
  selectText: (id: string | null) => void

  setAspectRatio: (ratio: AspectRatio) => void

  setMusic: (file: File, duration: number) => void
  removeMusic: () => void
  setMusicVolume: (volume: number) => void
  setOriginalVolume: (volume: number) => void

  setExporting: (exporting: boolean) => void
  setExportProgress: (progress: number) => void
  setExportError: (error: string | null) => void
  setResultUrl: (url: string | null) => void

  reset: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  clips: [],
  textOverlays: [],
  aspectRatio: '9:16',
  music: null,
  originalVolume: 1,
  selectedClipId: null,
  selectedTextId: null,
  exporting: false,
  exportProgress: 0,
  exportError: null,
  resultUrl: null,

  addClips: (files, durations, hasAudio) =>
    set((state) => {
      const newClips: Clip[] = files.map((file, i) => ({
        id: uid(),
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        duration: durations[i] ?? 0,
        trimStart: 0,
        trimEnd: durations[i] ?? 0,
        volume: 1,
        hasAudio: hasAudio[i] ?? true,
      }))
      return {
        clips: [...state.clips, ...newClips],
        selectedClipId: state.selectedClipId ?? newClips[0]?.id ?? null,
      }
    }),

  removeClip: (id) =>
    set((state) => {
      const clip = state.clips.find((c) => c.id === id)
      if (clip) URL.revokeObjectURL(clip.url)
      const clips = state.clips.filter((c) => c.id !== id)
      return {
        clips,
        selectedClipId: state.selectedClipId === id ? (clips[0]?.id ?? null) : state.selectedClipId,
      }
    }),

  moveClip: (id, direction) =>
    set((state) => {
      const idx = state.clips.findIndex((c) => c.id === id)
      const target = idx + direction
      if (idx < 0 || target < 0 || target >= state.clips.length) return {}
      const clips = [...state.clips]
      const [item] = clips.splice(idx, 1)
      clips.splice(target, 0, item)
      return { clips }
    }),

  setTrim: (id, trimStart, trimEnd) =>
    set((state) => ({
      clips: state.clips.map((c) => (c.id === id ? { ...c, trimStart, trimEnd } : c)),
    })),

  setClipVolume: (id, volume) =>
    set((state) => ({
      clips: state.clips.map((c) => (c.id === id ? { ...c, volume } : c)),
    })),

  selectClip: (id) => set({ selectedClipId: id }),

  addTextOverlay: (atTime) =>
    set((state) => {
      const total = getTotalDuration(state.clips)
      const start = Math.max(0, atTime)
      const end = Math.min(total || start + 3, start + 3)
      const overlay: TextOverlay = {
        id: uid(),
        text: 'Seu texto aqui',
        x: 50,
        y: 85,
        fontSize: 56,
        color: '#ffffff',
        weight: 700,
        align: 'center',
        start,
        end: end > start ? end : start + 3,
        background: true,
      }
      return { textOverlays: [...state.textOverlays, overlay], selectedTextId: overlay.id }
    }),

  updateTextOverlay: (id, patch) =>
    set((state) => ({
      textOverlays: state.textOverlays.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  removeTextOverlay: (id) =>
    set((state) => ({
      textOverlays: state.textOverlays.filter((t) => t.id !== id),
      selectedTextId: state.selectedTextId === id ? null : state.selectedTextId,
    })),

  selectText: (id) => set({ selectedTextId: id }),

  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),

  setMusic: (file, duration) =>
    set((state) => {
      if (state.music) URL.revokeObjectURL(state.music.url)
      return { music: { file, url: URL.createObjectURL(file), name: file.name, duration, volume: 0.5 } }
    }),

  removeMusic: () =>
    set((state) => {
      if (state.music) URL.revokeObjectURL(state.music.url)
      return { music: null }
    }),

  setMusicVolume: (volume) =>
    set((state) => (state.music ? { music: { ...state.music, volume } } : {})),

  setOriginalVolume: (volume) => set({ originalVolume: volume }),

  setExporting: (exporting) => set({ exporting }),
  setExportProgress: (progress) => set({ exportProgress: progress }),
  setExportError: (error) => set({ exportError: error }),
  setResultUrl: (url) =>
    set((state) => {
      if (state.resultUrl) URL.revokeObjectURL(state.resultUrl)
      return { resultUrl: url }
    }),

  reset: () =>
    set((state) => {
      state.clips.forEach((c) => URL.revokeObjectURL(c.url))
      if (state.music) URL.revokeObjectURL(state.music.url)
      if (state.resultUrl) URL.revokeObjectURL(state.resultUrl)
      return {
        clips: [],
        textOverlays: [],
        music: null,
        selectedClipId: null,
        selectedTextId: null,
        resultUrl: null,
        exportError: null,
        exportProgress: 0,
      }
    }),
}))
