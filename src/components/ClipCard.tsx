import { useRef } from 'react'
import { ChevronDown, ChevronUp, Trash2, Volume2, VolumeX } from 'lucide-react'
import type { Clip } from '../types'
import { useProjectStore } from '../store'
import { formatTime } from '../lib/media'

interface Props {
  clip: Clip
  index: number
  total: number
}

const MIN_LENGTH = 0.3

export default function ClipCard({ clip, index, total }: Props) {
  const setTrim = useProjectStore((s) => s.setTrim)
  const setClipVolume = useProjectStore((s) => s.setClipVolume)
  const removeClip = useProjectStore((s) => s.removeClip)
  const moveClip = useProjectStore((s) => s.moveClip)
  const selectClip = useProjectStore((s) => s.selectClip)
  const selectedClipId = useProjectStore((s) => s.selectedClipId)

  const barRef = useRef<HTMLDivElement>(null)
  const dragHandle = useRef<'start' | 'end' | null>(null)

  const pctStart = (clip.trimStart / clip.duration) * 100
  const pctEnd = (clip.trimEnd / clip.duration) * 100

  const timeFromEvent = (clientX: number) => {
    const bar = barRef.current
    if (!bar) return 0
    const rect = bar.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return pct * clip.duration
  }

  const onPointerDown = (handle: 'start' | 'end') => (e: React.PointerEvent) => {
    dragHandle.current = handle
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragHandle.current) return
    const t = timeFromEvent(e.clientX)
    if (dragHandle.current === 'start') {
      setTrim(clip.id, Math.min(t, clip.trimEnd - MIN_LENGTH), clip.trimEnd)
    } else {
      setTrim(clip.id, clip.trimStart, Math.max(t, clip.trimStart + MIN_LENGTH))
    }
  }

  const onPointerUp = () => {
    dragHandle.current = null
  }

  const isSelected = selectedClipId === clip.id
  const length = clip.trimEnd - clip.trimStart

  return (
    <div
      onClick={() => selectClip(clip.id)}
      className={`rounded-xl border p-3 transition-colors ${
        isSelected ? 'border-pink-500/70 bg-pink-500/5' : 'border-zinc-800 bg-zinc-900/60'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">
            {index + 1}. {clip.name}
          </p>
          <p className="text-xs text-zinc-500">
            {formatTime(length)} selecionado de {formatTime(clip.duration)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation()
              moveClip(clip.id, -1)
            }}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            disabled={index === total - 1}
            onClick={(e) => {
              e.stopPropagation()
              moveClip(clip.id, 1)
            }}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeClip(clip.id)
            }}
            className="rounded p-1 text-zinc-400 hover:bg-red-500/20 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={barRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative h-10 touch-none rounded-lg bg-zinc-800"
      >
        <div
          className="absolute inset-y-0 rounded-lg bg-gradient-to-r from-pink-600/70 to-violet-600/70"
          style={{ left: `${pctStart}%`, width: `${Math.max(0, pctEnd - pctStart)}%` }}
        />
        <div
          onPointerDown={onPointerDown('start')}
          className="absolute top-0 bottom-0 w-3 -translate-x-1/2 cursor-ew-resize rounded bg-white shadow"
          style={{ left: `${pctStart}%` }}
        />
        <div
          onPointerDown={onPointerDown('end')}
          className="absolute top-0 bottom-0 w-3 -translate-x-1/2 cursor-ew-resize rounded bg-white shadow"
          style={{ left: `${pctEnd}%` }}
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        {clip.volume > 0 ? (
          <Volume2 className="h-3.5 w-3.5 text-zinc-500" />
        ) : (
          <VolumeX className="h-3.5 w-3.5 text-zinc-500" />
        )}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={clip.volume}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setClipVolume(clip.id, Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700"
        />
      </div>
    </div>
  )
}
