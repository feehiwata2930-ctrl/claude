import { useRef } from 'react'
import { Music, Trash2, UploadCloud } from 'lucide-react'
import { useProjectStore } from '../store'
import { getAudioDuration } from '../lib/media'

export default function MusicPanel() {
  const music = useProjectStore((s) => s.music)
  const setMusic = useProjectStore((s) => s.setMusic)
  const removeMusic = useProjectStore((s) => s.removeMusic)
  const setMusicVolume = useProjectStore((s) => s.setMusicVolume)
  const originalVolume = useProjectStore((s) => s.originalVolume)
  const setOriginalVolume = useProjectStore((s) => s.setOriginalVolume)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) return
    const duration = await getAudioDuration(file)
    setMusic(file, duration)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <span className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Áudio original</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={originalVolume}
          onChange={(e) => setOriginalVolume(Number(e.target.value))}
          className="h-1 cursor-pointer appearance-none rounded-full bg-zinc-700"
        />
        <span className="text-right text-xs text-zinc-500">{Math.round(originalVolume * 100)}%</span>
      </div>

      {!music ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 py-8 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        >
          <UploadCloud className="h-6 w-6" />
          <span className="text-sm">Adicionar música de fundo</span>
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Music className="h-4 w-4 shrink-0 text-pink-400" />
              <span className="truncate text-sm text-zinc-100">{music.name}</span>
            </div>
            <button
              onClick={removeMusic}
              className="shrink-0 rounded p-1 text-zinc-400 hover:bg-red-500/20 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div>
            <span className="text-xs text-zinc-400">Volume da música</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={music.volume}
              onChange={(e) => setMusicVolume(Number(e.target.value))}
              className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-full bg-zinc-700"
            />
          </div>
          <p className="text-xs text-zinc-500">
            A música toca em loop ou é cortada para acompanhar a duração do vídeo final.
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files)}
      />
    </div>
  )
}
