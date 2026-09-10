import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { useProjectStore } from '../store'
import { ASPECT_DIMENSIONS } from '../types'
import { formatTime } from '../lib/media'
import { getClipOffsets, getTotalDuration } from '../lib/timeline'

export default function PreviewStage() {
  const clips = useProjectStore((s) => s.clips)
  const clipOffsets = useMemo(() => getClipOffsets(clips), [clips])
  const totalDuration = useMemo(() => getTotalDuration(clips), [clips])
  const aspectRatio = useProjectStore((s) => s.aspectRatio)
  const textOverlays = useProjectStore((s) => s.textOverlays)
  const selectedTextId = useProjectStore((s) => s.selectedTextId)
  const selectText = useProjectStore((s) => s.selectText)
  const updateTextOverlay = useProjectStore((s) => s.updateTextOverlay)
  const originalVolume = useProjectStore((s) => s.originalVolume)

  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [globalTime, setGlobalTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const seekingRef = useRef(false)

  const dims = ASPECT_DIMENSIONS[aspectRatio]
  const ratio = dims.w / dims.h

  const activeEntry = clipOffsets[activeIndex]

  useEffect(() => {
    setActiveIndex(0)
    setGlobalTime(0)
  }, [clips.length])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !activeEntry) return
    video.volume = Math.min(1, Math.max(0, activeEntry.clip.volume * originalVolume))
  }, [activeEntry, originalVolume])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !activeEntry) return

    const onLoaded = () => {
      video.currentTime = activeEntry.clip.trimStart
      if (playing) video.play().catch(() => {})
    }
    video.addEventListener('loadedmetadata', onLoaded)
    return () => video.removeEventListener('loadedmetadata', onLoaded)
  }, [activeEntry, playing])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !activeEntry) return

    const onTimeUpdate = () => {
      if (seekingRef.current) return
      const local = video.currentTime - activeEntry.clip.trimStart
      setGlobalTime(activeEntry.start + Math.max(0, local))
      if (video.currentTime >= activeEntry.clip.trimEnd) {
        if (activeIndex < clips.length - 1) {
          setActiveIndex((i) => i + 1)
        } else {
          video.pause()
          setPlaying(false)
        }
      }
    }
    video.addEventListener('timeupdate', onTimeUpdate)
    return () => video.removeEventListener('timeupdate', onTimeUpdate)
  }, [activeEntry, activeIndex, clips.length])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (playing) {
      video.pause()
      setPlaying(false)
    } else {
      if (globalTime >= totalDuration - 0.05) {
        setActiveIndex(0)
        setGlobalTime(0)
      }
      video.play().catch(() => {})
      setPlaying(true)
    }
  }

  const seekTo = (time: number) => {
    const clamped = Math.min(Math.max(0, time), totalDuration)
    const idx = clipOffsets.findIndex((e) => clamped >= e.start && clamped <= e.end)
    const targetIdx = idx === -1 ? clipOffsets.length - 1 : idx
    const entry = clipOffsets[targetIdx]
    if (!entry) return
    seekingRef.current = true
    setGlobalTime(clamped)
    if (targetIdx !== activeIndex) {
      setActiveIndex(targetIdx)
      requestAnimationFrame(() => {
        const video = videoRef.current
        if (video) video.currentTime = entry.clip.trimStart + (clamped - entry.start)
        seekingRef.current = false
      })
    } else if (videoRef.current) {
      videoRef.current.currentTime = entry.clip.trimStart + (clamped - entry.start)
      seekingRef.current = false
    }
  }

  const visibleTexts = useMemo(
    () => textOverlays.filter((t) => globalTime >= t.start && globalTime <= t.end),
    [textOverlays, globalTime],
  )

  const dragState = useRef<{ id: string; pointerId: number } | null>(null)

  const onOverlayPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    selectText(id)
    dragState.current = { id, pointerId: e.pointerId }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onOverlayPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current || dragState.current.pointerId !== e.pointerId) return
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100))
    updateTextOverlay(dragState.current.id, { x, y })
  }

  const onOverlayPointerUp = (e: React.PointerEvent) => {
    if (dragState.current?.pointerId === e.pointerId) dragState.current = null
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 overflow-hidden p-4">
      <div
        ref={stageRef}
        className="relative max-h-full overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-zinc-800"
        style={{
          aspectRatio: ratio,
          height: '100%',
          maxWidth: '100%',
          containerType: 'inline-size',
        }}
        onClick={() => selectText(null)}
      >
        {activeEntry && (
          <video
            ref={videoRef}
            src={activeEntry.clip.url}
            className="h-full w-full object-cover"
            playsInline
            onClick={togglePlay}
          />
        )}

        {visibleTexts.map((t) => (
          <div
            key={t.id}
            onPointerDown={(e) => onOverlayPointerDown(e, t.id)}
            onPointerMove={onOverlayPointerMove}
            onPointerUp={onOverlayPointerUp}
            className={`absolute max-w-[90%] -translate-x-1/2 -translate-y-1/2 cursor-move select-none px-3 py-1 leading-tight whitespace-pre-wrap ${
              t.background ? 'rounded-md bg-black/50' : ''
            } ${selectedTextId === t.id ? 'outline outline-2 outline-pink-500 outline-offset-2' : ''}`}
            style={{
              left: `${t.x}%`,
              top: `${t.y}%`,
              color: t.color,
              fontSize: `${(t.fontSize / 1080) * 100}cqw`,
              fontWeight: t.weight,
              textAlign: t.align,
            }}
          >
            {t.text || ' '}
          </div>
        ))}

        {!activeEntry && (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
            Sem vídeo
          </div>
        )}

        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100"
        >
          <span className="rounded-full bg-black/50 p-4">
            {playing ? <Pause className="h-8 w-8 text-white" /> : <Play className="h-8 w-8 text-white" />}
          </span>
        </button>
      </div>

      <div className="flex w-full max-w-md items-center gap-3 px-2">
        <button
          onClick={togglePlay}
          className="rounded-full bg-zinc-800 p-2 text-zinc-100 hover:bg-zinc-700"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={totalDuration || 0}
          step={0.01}
          value={globalTime}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700"
        />
        <span className="w-24 shrink-0 text-right text-xs tabular-nums text-zinc-400">
          {formatTime(globalTime)} / {formatTime(totalDuration)}
        </span>
      </div>
    </div>
  )
}
