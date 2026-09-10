import { useCallback, useRef, useState } from 'react'
import { Film, UploadCloud } from 'lucide-react'
import { useProjectStore } from '../store'
import { getVideoDuration, probeHasAudio } from '../lib/media'

export default function Uploader() {
  const addClips = useProjectStore((s) => s.addClips)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const files = Array.from(fileList).filter((f) => f.type.startsWith('video/'))
      if (files.length === 0) {
        setError('Selecione arquivos de vídeo (mp4, mov, webm...).')
        return
      }
      setError(null)
      setLoading(true)
      try {
        const [durations, hasAudio] = await Promise.all([
          Promise.all(files.map(getVideoDuration)),
          Promise.all(files.map(probeHasAudio)),
        ])
        addClips(files, durations, hasAudio)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar vídeo')
      } finally {
        setLoading(false)
      }
    },
    [addClips],
  )

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex w-full max-w-md cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-colors ${
          dragging ? 'border-pink-500 bg-pink-500/10' : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-500'
        }`}
      >
        <div className="rounded-full bg-gradient-to-br from-pink-500 to-violet-600 p-4">
          {loading ? (
            <Film className="h-8 w-8 animate-pulse text-white" />
          ) : (
            <UploadCloud className="h-8 w-8 text-white" />
          )}
        </div>
        <div>
          <p className="text-lg font-semibold text-zinc-100">
            {loading ? 'Carregando vídeo...' : 'Importe seus vídeos'}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Toque para escolher ou arraste arquivos aqui. Você pode importar vários de uma vez.
          </p>
        </div>
        <span className="rounded-full bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-300">
          MP4 · MOV · WEBM
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="mt-4 max-w-md text-center text-sm text-red-400">{error}</p>}
      <p className="mt-8 max-w-sm text-center text-xs text-zinc-500">
        Tudo acontece no seu navegador — seus vídeos não são enviados para nenhum servidor.
      </p>
    </div>
  )
}
