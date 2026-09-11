import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Copy, Dices, History, Trash2, Wand2 } from 'lucide-react'
import {
  ASPECT_RATIOS,
  AVOID_OPTIONS,
  FRAMINGS,
  LIGHTING,
  MOODS,
  PLACEMENTS,
  REALISM_STYLES,
  SECONDARY_ELEMENTS,
  SHADING_TECHNIQUES,
  SUBJECTS,
  TONAL_PRESETS,
  type PromptOption,
} from '../lib/promptData'
import {
  buildPrompt,
  defaultSelections,
  randomSelections,
  randomizeField,
  resolveAspect,
  type PromptSelections,
} from '../lib/promptBuilder'
import { loadPromptHistory, removePromptFromHistory, savePromptToHistory, type SavedPrompt } from '../lib/promptHistory'

const STEPS = ['Tema', 'Corpo & composição', 'Estilo, luz & tom', 'Atmosfera & técnica', 'Resultado'] as const

export default function PromptStudio() {
  const [sel, setSel] = useState<PromptSelections>(defaultSelections())
  const [step, setStep] = useState(0)
  const [history, setHistory] = useState<SavedPrompt[]>(() => loadPromptHistory())
  const [copied, setCopied] = useState<'mj' | 'chat' | string | null>(null)

  const result = useMemo(() => buildPrompt(sel), [sel])
  const canAdvanceFromTheme = !!sel.subjectId

  function update<K extends keyof PromptSelections>(key: K, value: PromptSelections[K]) {
    setSel((s) => ({ ...s, [key]: value }))
  }

  function shuffleField(field: keyof PromptSelections) {
    setSel((s) => randomizeField(s, field))
  }

  function shuffleAll() {
    setSel((s) => randomSelections(s))
  }

  function toggleElement(id: string) {
    setSel((s) => ({
      ...s,
      elementIds: s.elementIds.includes(id) ? s.elementIds.filter((e) => e !== id) : [...s.elementIds, id],
    }))
  }

  function toggleAvoid(id: string) {
    setSel((s) => ({
      ...s,
      avoidIds: s.avoidIds.includes(id) ? s.avoidIds.filter((a) => a !== id) : [...s.avoidIds, id],
    }))
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500)
    } catch {
      // clipboard indisponível — usuário pode selecionar o texto manualmente
    }
  }

  function handleSave() {
    if (!result) return
    setHistory(savePromptToHistory(result))
  }

  function handleRemoveHistory(id: string) {
    setHistory(removePromptFromHistory(id))
  }

  function goNext() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Gerador de Prompt · Realismo P&B</h1>
          <p className="text-sm text-zinc-500">Responda as perguntas (ou sorteie) e receba um prompt pronto para ChatGPT e Midjourney.</p>
        </div>
        <button
          onClick={shuffleAll}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-pink-500 hover:text-pink-400"
        >
          <Dices size={15} /> Sortear tudo
        </button>
      </div>

      <ol className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              onClick={() => setStep(i)}
              disabled={i > 0 && !canAdvanceFromTheme}
              className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                step === i ? 'bg-pink-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6">
        {step === 0 && (
          <div className="space-y-6">
            <Section title="Qual é o tema principal?" onShuffle={() => shuffleField('subjectId')}>
              <Chips options={SUBJECTS} selected={sel.subjectId ? [sel.subjectId] : []} onToggle={(id) => update('subjectId', id)} />
            </Section>
            <Section title="Elementos complementares (opcional, escolha quantos quiser)" onShuffle={() => shuffleField('elementIds')}>
              <Chips options={SECONDARY_ELEMENTS} selected={sel.elementIds} onToggle={toggleElement} multi />
            </Section>
            {!canAdvanceFromTheme && <p className="text-xs text-amber-400">Escolha um tema para continuar.</p>}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <Section title="Onde vai ser tatuado?" onShuffle={() => shuffleField('placementId')}>
              <Chips options={PLACEMENTS} selected={[sel.placementId]} onToggle={(id) => update('placementId', id)} />
            </Section>
            <Section title="Enquadramento" onShuffle={() => shuffleField('framingId')}>
              <Chips options={FRAMINGS} selected={[sel.framingId]} onToggle={(id) => update('framingId', id)} />
            </Section>
            <Section title="Proporção da imagem">
              <p className="mb-2 text-xs text-zinc-500">
                Padrão sugerido pelo local do corpo:{' '}
                <span className="text-zinc-300">{ASPECT_RATIOS.find((a) => a.id === resolveAspect(sel))?.label}</span>. Pode trocar abaixo.
              </p>
              <select
                value={sel.aspectId ?? ''}
                onChange={(e) => update('aspectId', e.target.value || null)}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-pink-500"
              >
                <option value="">Usar padrão do local do corpo</option>
                {ASPECT_RATIOS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Section>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Section title="Subestilo de realismo" onShuffle={() => shuffleField('styleId')}>
              <Chips options={REALISM_STYLES} selected={[sel.styleId]} onToggle={(id) => update('styleId', id)} />
            </Section>
            <Section title="Iluminação" onShuffle={() => shuffleField('lightingId')}>
              <Chips options={LIGHTING} selected={[sel.lightingId]} onToggle={(id) => update('lightingId', id)} />
            </Section>
            <Section title="Tonalidade e contraste" onShuffle={() => shuffleField('tonalId')}>
              <div className="grid gap-2 sm:grid-cols-2">
                {TONAL_PRESETS.map((t) => {
                  const active = sel.tonalId === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => update('tonalId', t.id)}
                      className={`rounded-xl border p-3 text-left text-sm transition ${
                        active ? 'border-pink-500 bg-pink-500/10 text-zinc-100' : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      <p className="font-medium">{t.pt}</p>
                      <p className="mt-1 text-xs text-zinc-500">{t.ptDetail}</p>
                    </button>
                  )
                })}
              </div>
            </Section>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <Section title="Atmosfera" onShuffle={() => shuffleField('moodId')}>
              <Chips options={MOODS} selected={[sel.moodId]} onToggle={(id) => update('moodId', id)} />
            </Section>
            <Section title="Técnica de sombreamento" onShuffle={() => shuffleField('shadingId')}>
              <Chips options={SHADING_TECHNIQUES} selected={[sel.shadingId]} onToggle={(id) => update('shadingId', id)} />
            </Section>
            <Section title="Evitar no resultado">
              <div className="flex flex-wrap gap-2">
                {AVOID_OPTIONS.map((a) => {
                  const active = sel.avoidIds.includes(a.id)
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleAvoid(a.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        active ? 'border-pink-500 bg-pink-500/10 text-pink-300' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
                      }`}
                    >
                      {a.pt}
                    </button>
                  )
                })}
              </div>
            </Section>
            <Section title="Detalhes extras (opcional)">
              <textarea
                value={sel.extra}
                onChange={(e) => update('extra', e.target.value)}
                placeholder="Ex.: referência de outro tatuador, detalhe específico do cliente, texto ou nome a incluir..."
                rows={3}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-pink-500"
              />
            </Section>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            {!result && <p className="text-sm text-amber-400">Volte ao passo 1 e escolha um tema para gerar o prompt.</p>}
            {result && (
              <>
                <PromptBlock
                  label="Prompt para Midjourney"
                  text={result.midjourney}
                  copied={copied === 'mj'}
                  onCopy={() => copy(result.midjourney, 'mj')}
                />
                <PromptBlock
                  label="Prompt para ChatGPT / DALL·E"
                  text={result.chatgpt}
                  copied={copied === 'chat'}
                  onCopy={() => copy(result.chatgpt, 'chat')}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500"
                  >
                    <Wand2 size={14} /> Salvar no histórico
                  </button>
                </div>
              </>
            )}

            <div className="border-t border-zinc-800 pt-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-300">
                <History size={14} /> Histórico salvo
              </h2>
              {history.length === 0 && <p className="text-sm text-zinc-500">Nenhum prompt salvo ainda.</p>}
              <div className="space-y-2">
                {history.map((h) => (
                  <details key={h.id} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                    <summary className="flex cursor-pointer items-center justify-between text-sm text-zinc-300">
                      <span>
                        {h.title} <span className="text-zinc-600">· {new Date(h.createdAt).toLocaleString('pt-BR')}</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          handleRemoveHistory(h.id)
                        }}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-950 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </summary>
                    <div className="mt-2 space-y-2">
                      <PromptBlock label="Midjourney" text={h.midjourney} copied={copied === h.id + 'mj'} onCopy={() => copy(h.midjourney, h.id + 'mj')} compact />
                      <PromptBlock label="ChatGPT" text={h.chatgpt} copied={copied === h.id + 'chat'} onCopy={() => copy(h.chatgpt, h.id + 'chat')} compact />
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={step === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
        >
          <ChevronLeft size={16} /> Voltar
        </button>
        {step < STEPS.length - 1 && (
          <button
            onClick={goNext}
            disabled={!canAdvanceFromTheme}
            className="flex items-center gap-1 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500 disabled:opacity-40"
          >
            Avançar <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ title, onShuffle, children }: { title: string; onShuffle?: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
        {onShuffle && (
          <button onClick={onShuffle} title="Sugerir uma opção" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-pink-400">
            <Dices size={14} />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function Chips({
  options,
  selected,
  onToggle,
  multi,
}: {
  options: PromptOption[]
  selected: string[]
  onToggle: (id: string) => void
  multi?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.id)
        return (
          <button
            key={opt.id}
            onClick={() => onToggle(opt.id)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              active
                ? multi
                  ? 'border-pink-500 bg-pink-500/10 text-pink-300'
                  : 'border-pink-500 bg-pink-600 text-white'
                : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
            }`}
          >
            {opt.pt}
          </button>
        )
      })}
    </div>
  )
}

function PromptBlock({
  label,
  text,
  copied,
  onCopy,
  compact,
}: {
  label: string
  text: string
  copied: boolean
  onCopy: () => void
  compact?: boolean
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className={`font-medium text-zinc-400 ${compact ? 'text-xs' : 'text-sm'}`}>{label}</span>
        <button onClick={onCopy} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
          {copied ? (
            <>
              <Check size={13} /> Copiado
            </>
          ) : (
            <>
              <Copy size={13} /> Copiar
            </>
          )}
        </button>
      </div>
      <p className={`whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-zinc-300 ${compact ? 'text-xs' : 'text-sm'}`}>{text}</p>
    </div>
  )
}
