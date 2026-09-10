import { useState } from 'react'
import { Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { useProjectStore } from '../store'
import { autoCutClips, type AutoCutProgress } from '../lib/highlights'

const DURATIONS = [15, 30, 60]

export default function AutoCutPanel() {
  const clips = useProjectStore((s) => s.clips)
  const originalClips = useProjectStore((s) => s.originalClips)
  const applyAutoCut = useProjectStore((s) => s.applyAutoCut)
  const restoreOriginalClips = useProjectStore((s) => s.restoreOriginalClips)

  const [target, setTarget] = useState(30)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stageLabel, setStageLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resultCount, setResultCount] = useState<number | null>(null)

  const handleRun = async () => {
    setRunning(true)
    setError(null)
    setResultCount(null)
    setProgress(0)
    try {
      const sourceClips = originalClips ?? clips
      const result = await autoCutClips(sourceClips, {
        targetTotalDuration: target,
        segmentLength: target <= 20 ? 3.5 : target <= 40 ? 5 : 6,
        onProgress: (info: AutoCutProgress) => {
          const perClip = info.stage === 'audio' ? 0.1 : 0.1 + 0.9 * info.progress
          setProgress((info.clipIndex + perClip) / info.clipCount)
          setStageLabel(
            info.stage === 'audio'
              ? `Analisando áudio do clipe ${info.clipIndex + 1}/${info.clipCount}...`
              : `Analisando movimento do clipe ${info.clipIndex + 1}/${info.clipCount}...`,
          )
        },
      })
      applyAutoCut(result)
      setResultCount(result.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível analisar os vídeos.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-pink-500/30 bg-gradient-to-br from-pink-500/10 to-violet-600/10 p-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-pink-400" />
        <div>
          <p className="text-sm font-semibold text-zinc-100">Corte automático</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            Detecta os trechos com mais som (picos de áudio) e movimento em cada vídeo e monta os cortes pra
            você. É uma heurística de áudio/movimento, não uma IA que entende o conteúdo — depois dá pra
            ajustar cada corte manualmente.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400">Duração alvo</span>
        <div className="flex gap-1.5">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setTarget(d)}
              disabled={running}
              className={`rounded-md px-2.5 py-1 text-xs ${
                target === d ? 'bg-pink-600 text-white' : 'bg-zinc-800 text-zinc-300'
              } disabled:opacity-50`}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleRun}
        disabled={running || clips.length === 0}
        className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-600 to-violet-600 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {stageLabel || 'Analisando...'}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Gerar cortes automáticos
          </>
        )}
      </button>

      {running && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {resultCount !== null && !running && originalClips && (
        <p className="text-xs text-emerald-400">
          {resultCount} corte{resultCount === 1 ? '' : 's'} gerado{resultCount === 1 ? '' : 's'} a partir dos
          melhores momentos. Ajuste as alças abaixo se quiser.
        </p>
      )}

      {originalClips && !running && (
        <button
          onClick={() => {
            restoreOriginalClips()
            setResultCount(null)
          }}
          className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Usar vídeo completo (desfazer)
        </button>
      )}
    </div>
  )
}
