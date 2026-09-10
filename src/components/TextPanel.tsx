import { useMemo } from 'react'
import { AlignCenter, AlignLeft, AlignRight, Plus, Trash2, Type } from 'lucide-react'
import { useProjectStore } from '../store'
import { formatTime } from '../lib/media'
import { getTotalDuration } from '../lib/timeline'
import type { TextAlign } from '../types'

const COLORS = ['#ffffff', '#000000', '#facc15', '#ec4899', '#22d3ee', '#4ade80', '#f87171']

export default function TextPanel() {
  const textOverlays = useProjectStore((s) => s.textOverlays)
  const selectedTextId = useProjectStore((s) => s.selectedTextId)
  const selectText = useProjectStore((s) => s.selectText)
  const addTextOverlay = useProjectStore((s) => s.addTextOverlay)
  const updateTextOverlay = useProjectStore((s) => s.updateTextOverlay)
  const removeTextOverlay = useProjectStore((s) => s.removeTextOverlay)
  const clips = useProjectStore((s) => s.clips)
  const totalDuration = useMemo(() => getTotalDuration(clips), [clips])

  const selected = textOverlays.find((t) => t.id === selectedTextId)

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => addTextOverlay(0)}
        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 py-3 text-sm font-medium text-white hover:opacity-90"
      >
        <Plus className="h-4 w-4" /> Adicionar texto
      </button>

      {textOverlays.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Type className="h-4 w-4" /> Nenhum texto ainda. Adicione legendas, títulos ou CTAs.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {textOverlays.map((t) => (
          <button
            key={t.id}
            onClick={() => selectText(t.id)}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
              selectedTextId === t.id
                ? 'border-pink-500/70 bg-pink-500/5 text-zinc-100'
                : 'border-zinc-800 bg-zinc-900/60 text-zinc-300'
            }`}
          >
            <span className="truncate">{t.text || '(vazio)'}</span>
            <span className="ml-2 shrink-0 text-xs text-zinc-500">
              {formatTime(t.start)}–{formatTime(t.end)}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Editar texto</span>
            <button
              onClick={() => removeTextOverlay(selected.id)}
              className="rounded p-1 text-zinc-400 hover:bg-red-500/20 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <textarea
            value={selected.text}
            onChange={(e) => updateTextOverlay(selected.id, { text: e.target.value })}
            rows={2}
            className="resize-none rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm text-zinc-100 outline-none focus:border-pink-500"
            placeholder="Digite o texto..."
          />

          <div className="flex items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => updateTextOverlay(selected.id, { color: c })}
                className={`h-6 w-6 rounded-full border-2 ${
                  selected.color === c ? 'border-pink-500' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={selected.color}
              onChange={(e) => updateTextOverlay(selected.id, { color: e.target.value })}
              className="h-6 w-6 cursor-pointer rounded-full bg-transparent"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-zinc-400">Tamanho</span>
            <input
              type="range"
              min={24}
              max={120}
              step={2}
              value={selected.fontSize}
              onChange={(e) => updateTextOverlay(selected.id, { fontSize: Number(e.target.value) })}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-zinc-400">Estilo</span>
            <div className="flex gap-1.5">
              {([400, 700, 900] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => updateTextOverlay(selected.id, { weight: w })}
                  className={`rounded-md px-3 py-1 text-xs ${
                    selected.weight === w ? 'bg-pink-600 text-white' : 'bg-zinc-800 text-zinc-300'
                  }`}
                  style={{ fontWeight: w }}
                >
                  {w === 400 ? 'Normal' : w === 700 ? 'Negrito' : 'Extra'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-zinc-400">Alinhar</span>
            <div className="flex gap-1.5">
              {(
                [
                  { v: 'left' as TextAlign, icon: AlignLeft },
                  { v: 'center' as TextAlign, icon: AlignCenter },
                  { v: 'right' as TextAlign, icon: AlignRight },
                ] as const
              ).map(({ v, icon: Icon }) => (
                <button
                  key={v}
                  onClick={() => updateTextOverlay(selected.id, { align: v })}
                  className={`rounded-md p-1.5 ${
                    selected.align === v ? 'bg-pink-600 text-white' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
            <label className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={selected.background}
                onChange={(e) => updateTextOverlay(selected.id, { background: e.target.checked })}
              />
              Fundo
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Aparece em: {formatTime(selected.start)}</span>
              <span>Some em: {formatTime(selected.end)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={totalDuration || 1}
              step={0.1}
              value={selected.start}
              onChange={(e) => {
                const v = Math.min(Number(e.target.value), selected.end - 0.1)
                updateTextOverlay(selected.id, { start: Math.max(0, v) })
              }}
              className="h-1 cursor-pointer appearance-none rounded-full bg-zinc-700"
            />
            <input
              type="range"
              min={0}
              max={totalDuration || 1}
              step={0.1}
              value={selected.end}
              onChange={(e) => {
                const v = Math.max(Number(e.target.value), selected.start + 0.1)
                updateTextOverlay(selected.id, { end: Math.min(totalDuration || v, v) })
              }}
              className="h-1 cursor-pointer appearance-none rounded-full bg-zinc-700"
            />
          </div>
        </div>
      )}
    </div>
  )
}
