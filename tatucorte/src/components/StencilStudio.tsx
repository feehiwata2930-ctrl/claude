import { useEffect, useRef, useState } from 'react'
import { Save, Upload } from 'lucide-react'
import { DEFAULT_STENCIL_SETTINGS, canvasToBlob, generateStencil, loadImage } from '../lib/stencil'
import type { StencilSettings } from '../types'
import { useApp } from '../store'

export default function StencilStudio() {
  const clients = useApp((s) => s.db.clients)
  const addDecalque = useApp((s) => s.addDecalque)
  const setView = useApp((s) => s.setView)

  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null)
  const [settings, setSettings] = useState<StencilSettings>(DEFAULT_STENCIL_SETTINGS)
  const [name, setName] = useState('')
  const [widthMm, setWidthMm] = useState(100)
  const [heightMm, setHeightMm] = useState(100)
  const [clientId, setClientId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Pré-visualização em resolução reduzida: o filtro bilateral (que preserva
  // traços finos ao suavizar ruído) é pesado o bastante pra travar a interface
  // se rodasse em resolução final a cada ajuste de slider. A versão em alta
  // resolução só é gerada de novo na hora de salvar (handleSave).
  useEffect(() => {
    if (!sourceImg || !canvasRef.current) return
    const timeout = setTimeout(() => {
      const stencilCanvas = generateStencil(sourceImg, settings, 800)
      const display = canvasRef.current
      if (!display) return
      display.width = stencilCanvas.width
      display.height = stencilCanvas.height
      const ctx = display.getContext('2d')!
      ctx.clearRect(0, 0, display.width, display.height)
      ctx.drawImage(stencilCanvas, 0, 0)
    }, 80)
    return () => clearTimeout(timeout)
  }, [sourceImg, settings])

  async function handleFile(file: File) {
    setError(null)
    try {
      const img = await loadImage(file)
      setSourceImg(img)
      if (!name) setName(file.name.replace(/\.[^.]+$/, ''))
      const ratio = img.naturalHeight / img.naturalWidth
      setHeightMm(Math.round(widthMm * ratio))
    } catch {
      setError('Não foi possível abrir essa imagem.')
    }
  }

  async function handleSave() {
    if (!sourceImg) return
    setSaving(true)
    setError(null)
    try {
      // Regenera em resolução final (a pré-visualização roda reduzida por performance).
      const hiResCanvas = generateStencil(sourceImg, settings, 1600)
      const blob = await canvasToBlob(hiResCanvas)
      await addDecalque({
        clientId: clientId || null,
        name: name || 'Decalque sem nome',
        blob,
        widthMm,
        heightMm,
        settings,
      })
      setView('biblioteca')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar o decalque.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        {!sourceImg ? (
          <label className="flex h-96 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-700 text-zinc-400 hover:border-pink-500 hover:text-pink-400">
            <Upload size={28} />
            <span className="text-sm">Envie uma foto do desenho ou referência</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="max-h-[520px] overflow-auto rounded-xl border border-zinc-800 bg-white p-2">
              <canvas ref={canvasRef} className="max-w-full" />
            </div>
            <label className="cursor-pointer text-sm text-pink-400 hover:underline">
              Trocar imagem
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">Ajustes do decalque</h2>
          <div className="space-y-4">
            <SliderField
              label="Sensibilidade do contorno"
              value={settings.threshold}
              min={5}
              max={150}
              onChange={(v) => setSettings((s) => ({ ...s, threshold: v }))}
            />
            <SliderField
              label="Suavização (reduz ruído/textura)"
              value={settings.blur}
              min={0}
              max={3}
              onChange={(v) => setSettings((s) => ({ ...s, blur: v }))}
            />
            <SliderField
              label="Contraste da foto"
              value={settings.contrast}
              min={-100}
              max={100}
              onChange={(v) => setSettings((s) => ({ ...s, contrast: v }))}
            />
            <SliderField
              label="Espessura da linha"
              value={settings.lineThickness}
              min={0}
              max={3}
              onChange={(v) => setSettings((s) => ({ ...s, lineThickness: v }))}
            />
            <label className="flex items-center justify-between text-sm text-zinc-300">
              Inverter (linhas claras / fundo escuro)
              <input
                type="checkbox"
                checked={settings.invert}
                onChange={(e) => setSettings((s) => ({ ...s, invert: e.target.checked }))}
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">Salvar na biblioteca</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-pink-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Largura real (mm)</label>
                <input
                  type="number"
                  value={widthMm}
                  onChange={(e) => setWidthMm(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Altura real (mm)</label>
                <input
                  type="number"
                  value={heightMm}
                  onChange={(e) => setHeightMm(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-pink-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Cliente (opcional)</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-pink-500"
              >
                <option value="">Sem cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={handleSave}
              disabled={!sourceImg || saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500 disabled:opacity-50"
            >
              <Save size={14} /> {saving ? 'Salvando…' : 'Salvar decalque'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SliderField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  )
}
