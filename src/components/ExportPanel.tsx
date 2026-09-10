import { useMemo, useState } from 'react'
import { Download, Loader2, Sparkles } from 'lucide-react'
import { useProjectStore } from '../store'
import { exportProject, type ExportStage } from '../lib/ffmpeg'
import { ASPECT_DIMENSIONS } from '../types'
import { formatTime } from '../lib/media'
import { getTotalDuration } from '../lib/timeline'

const STAGE_LABELS: Record<ExportStage, string> = {
  loading: 'Carregando motor de vídeo...',
  preparing: 'Preparando arquivos...',
  encoding: 'Renderizando vídeo...',
  finishing: 'Finalizando...',
}

export default function ExportPanel() {
  const clips = useProjectStore((s) => s.clips)
  const textOverlays = useProjectStore((s) => s.textOverlays)
  const music = useProjectStore((s) => s.music)
  const originalVolume = useProjectStore((s) => s.originalVolume)
  const aspectRatio = useProjectStore((s) => s.aspectRatio)
  const totalDuration = useMemo(() => getTotalDuration(clips), [clips])
  const exporting = useProjectStore((s) => s.exporting)
  const setExporting = useProjectStore((s) => s.setExporting)
  const exportProgress = useProjectStore((s) => s.exportProgress)
  const setExportProgress = useProjectStore((s) => s.setExportProgress)
  const exportError = useProjectStore((s) => s.exportError)
  const setExportError = useProjectStore((s) => s.setExportError)
  const resultUrl = useProjectStore((s) => s.resultUrl)
  const setResultUrl = useProjectStore((s) => s.setResultUrl)

  const [stage, setStage] = useState<ExportStage>('loading')
  const dims = ASPECT_DIMENSIONS[aspectRatio]

  const handleExport = async () => {
    if (clips.length === 0) return
    setExporting(true)
    setExportError(null)
    setResultUrl(null)
    setExportProgress(0)
    try {
      const blob = await exportProject(
        { clips, dims, textOverlays, music, originalVolume },
        {
          onStage: setStage,
          onProgress: setExportProgress,
        },
      )
      setResultUrl(URL.createObjectURL(blob))
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Falha ao exportar o vídeo.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm">
        <div className="flex justify-between py-1 text-zinc-400">
          <span>Clipes</span>
          <span className="text-zinc-200">{clips.length}</span>
        </div>
        <div className="flex justify-between py-1 text-zinc-400">
          <span>Duração</span>
          <span className="text-zinc-200">{formatTime(totalDuration)}</span>
        </div>
        <div className="flex justify-between py-1 text-zinc-400">
          <span>Formato</span>
          <span className="text-zinc-200">
            {aspectRatio} ({dims.w}×{dims.h})
          </span>
        </div>
        <div className="flex justify-between py-1 text-zinc-400">
          <span>Textos</span>
          <span className="text-zinc-200">{textOverlays.length}</span>
        </div>
        <div className="flex justify-between py-1 text-zinc-400">
          <span>Música</span>
          <span className="text-zinc-200">{music ? music.name : '—'}</span>
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting || clips.length === 0}
        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {exporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {STAGE_LABELS[stage]}{' '}
            {stage === 'encoding' ? `${Math.round(exportProgress * 100)}%` : ''}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Exportar vídeo
          </>
        )}
      </button>

      {exporting && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all"
            style={{
              width: `${
                stage === 'loading'
                  ? 5
                  : stage === 'preparing'
                    ? 15
                    : stage === 'encoding'
                      ? 20 + exportProgress * 70
                      : 95
              }%`,
            }}
          />
        </div>
      )}

      {exportError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {exportError}
        </p>
      )}

      {resultUrl && !exporting && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-sm font-medium text-emerald-300">
            Vídeo pronto! Pode baixar e postar no Stories ou Reels.
          </p>
          <video src={resultUrl} controls playsInline className="w-full rounded-lg bg-black" />
          <a
            href={resultUrl}
            download="reelcut-video.mp4"
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <Download className="h-4 w-4" /> Baixar vídeo
          </a>
        </div>
      )}

      <p className="text-center text-xs text-zinc-500">
        A primeira exportação baixa o motor de edição (~30 MB) e pode demorar um pouco mais.
      </p>
    </div>
  )
}
