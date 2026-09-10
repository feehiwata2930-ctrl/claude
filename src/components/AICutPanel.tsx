import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, RotateCcw, Sparkles, Wand2 } from 'lucide-react'
import { useProjectStore } from '../store'
import { AI_MODELS, estimateCostUsd, estimateFrameCount, type AIModelId } from '../lib/aiModels'
import { getStoredApiKey, setStoredApiKey } from '../lib/apiKeyStorage'
import { uid } from '../lib/id'
import type { Clip } from '../types'

const DURATIONS = [15, 30, 60]

export default function AICutPanel() {
  const clips = useProjectStore((s) => s.clips)
  const originalClips = useProjectStore((s) => s.originalClips)
  const applyAutoCut = useProjectStore((s) => s.applyAutoCut)
  const restoreOriginalClips = useProjectStore((s) => s.restoreOriginalClips)

  const [expanded, setExpanded] = useState(false)
  const [apiKey, setApiKey] = useState(() => getStoredApiKey())
  const [model, setModel] = useState<AIModelId>('claude-opus-5')
  const [target, setTarget] = useState(30)
  const [running, setRunning] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resultCount, setResultCount] = useState<number | null>(null)

  const estimatedCost = useMemo(() => {
    const total = clips.reduce((sum, c) => {
      const frames = estimateFrameCount(Math.max(0.1, c.trimEnd - c.trimStart))
      return sum + estimateCostUsd(frames, model)
    }, 0)
    return total
  }, [clips, model])

  const saveKey = (value: string) => {
    setApiKey(value)
    setStoredApiKey(value)
  }

  const handleRun = async () => {
    if (!apiKey.trim()) {
      setError('Informe sua chave de API da Anthropic para usar o corte com IA.')
      return
    }
    setRunning(true)
    setError(null)
    setResultCount(null)
    const { analyzeClipWithAI, friendlyAIError } = await import('../lib/aiAnalysis')
    try {
      const sourceClips = originalClips ?? clips
      const totalSourceDuration =
        sourceClips.reduce((sum, c) => sum + Math.max(0, c.trimEnd - c.trimStart), 0) || 1

      const results: Clip[] = []
      for (let i = 0; i < sourceClips.length; i++) {
        const clip = sourceClips[i]
        const clipDuration = Math.max(0.1, clip.trimEnd - clip.trimStart)
        const clipTarget = Math.max(3, (clipDuration / totalSourceDuration) * target)

        const segments = await analyzeClipWithAI({
          clip,
          targetDuration: clipTarget,
          apiKey,
          model,
          onProgress: (stage) =>
            setStatusText(
              stage === 'extracting'
                ? `Extraindo frames do vídeo ${i + 1}/${sourceClips.length}...`
                : `Claude analisando o vídeo ${i + 1}/${sourceClips.length}...`,
            ),
        })

        segments.forEach((seg, segIdx) => {
          results.push({
            ...clip,
            id: uid(),
            name: segments.length > 1 ? `${clip.name} (corte IA ${segIdx + 1}/${segments.length})` : clip.name,
            trimStart: seg.start,
            trimEnd: seg.end,
            aiReason: seg.reason,
          })
        })
      }

      if (results.length === 0) {
        throw new Error('A IA não encontrou momentos para recomendar. Tente uma duração alvo diferente.')
      }

      applyAutoCut(results)
      setResultCount(results.length)
    } catch (err) {
      setError(friendlyAIError(err))
    } finally {
      setRunning(false)
      setStatusText('')
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-600/10 to-indigo-600/10 p-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-start gap-2">
          <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
          <div>
            <p className="text-sm font-semibold text-zinc-100">Corte com IA (entende a cena)</p>
            <p className="mt-0.5 text-xs text-zinc-400">
              O Claude analisa os frames do vídeo e escolhe os cortes com base na narrativa — gancho,
              clímax, reação — não só picos de áudio/movimento. Usa a API paga da Anthropic com a sua
              própria chave.
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-zinc-500" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-zinc-400">Sua chave de API da Anthropic</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => saveKey(e.target.value)}
              placeholder="sk-ant-..."
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Fica salva só no seu navegador (localStorage) e é usada direto do seu navegador para a
              Anthropic — nunca passa por nós. Crie uma em{' '}
              <span className="text-zinc-400">console.anthropic.com</span>.
            </p>
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
                    target === d ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-300'
                  } disabled:opacity-50`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">Modelo</span>
            <div className="flex flex-col gap-1.5">
              {AI_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  disabled={running}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                    model === m.id
                      ? 'border-violet-500 bg-violet-500/10 text-zinc-100'
                      : 'border-zinc-800 text-zinc-400'
                  } disabled:opacity-50`}
                >
                  <span>{m.label}</span>
                  <span className="text-zinc-500">
                    ${m.inPrice}/${m.outPrice} por milhão de tokens
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Custo estimado desta análise: <span className="text-zinc-300">~${estimatedCost.toFixed(3)}</span>{' '}
            na sua conta Anthropic (varia com a duração dos vídeos).
          </p>

          <button
            onClick={handleRun}
            disabled={running || clips.length === 0}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {statusText || 'Analisando...'}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Gerar corte com IA
              </>
            )}
          </button>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {resultCount !== null && !running && originalClips && (
            <p className="text-xs text-emerald-400">
              {resultCount} corte{resultCount === 1 ? '' : 's'} gerado{resultCount === 1 ? '' : 's'} pela
              IA. Veja o motivo de cada corte na lista abaixo.
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
      )}
    </div>
  )
}
