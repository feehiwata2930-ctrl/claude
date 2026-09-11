import { useEffect, useMemo, useState } from 'react'
import { Download, Save, Scissors, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { PAPER_SIZES, paperDims } from '../lib/paper'
import type { PaperSizeId } from '../types'
import { buildTilingPdf } from '../lib/pdf'
import { loadImage } from '../lib/stencil'
import { createTiling, deleteTiling } from '../lib/data'

export default function TilingStudio() {
  const session = useApp((s) => s.session)
  const decalques = useApp((s) => s.decalques)
  const tilings = useApp((s) => s.tilings)
  const refreshTilings = useApp((s) => s.refreshTilings)
  const activeDecalqueForTiling = useApp((s) => s.activeDecalqueForTiling)
  const setActiveDecalqueForTiling = useApp((s) => s.setActiveDecalqueForTiling)

  const [decalqueId, setDecalqueId] = useState<string>('')
  const [targetWidthMm, setTargetWidthMm] = useState(300)
  const [targetHeightMm, setTargetHeightMm] = useState(300)
  const [paperSize, setPaperSize] = useState<PaperSizeId>('a4')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (activeDecalqueForTiling) {
      setDecalqueId(activeDecalqueForTiling)
      const d = decalques.find((x) => x.id === activeDecalqueForTiling)
      if (d) {
        setTargetWidthMm(Math.max(d.width_mm, 200))
        setTargetHeightMm(Math.max(d.height_mm, 200))
      }
      setActiveDecalqueForTiling(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDecalqueForTiling])

  const decalque = decalques.find((d) => d.id === decalqueId)
  const dims = paperDims(paperSize, 'portrait')
  const grid = useMemo(() => {
    const margin = 12
    const usableW = dims.widthMm - 2 * margin
    const usableH = dims.heightMm - 2 * margin
    return { cols: Math.max(1, Math.ceil(targetWidthMm / usableW)), rows: Math.max(1, Math.ceil(targetHeightMm / usableH)) }
  }, [targetWidthMm, targetHeightMm, dims])

  async function handleExport() {
    if (!decalque?.imageUrl) return
    setBusy(true)
    setError(null)
    try {
      const img = await loadImage(await (await fetch(decalque.imageUrl)).blob())
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      const { doc } = buildTilingPdf(canvas, targetWidthMm, targetHeightMm, dims.widthMm, dims.heightMm)
      doc.save(`${decalque.name}-mosaico.pdf`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar o PDF.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    if (!session || !decalqueId) return
    setBusy(true)
    setError(null)
    try {
      await createTiling({ userId: session.user.id, decalqueId, targetWidthMm, targetHeightMm, paperSize })
      await refreshTilings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-1 text-lg font-semibold text-zinc-100">Ampliar & cortar em várias folhas</h1>
      <p className="mb-5 text-sm text-zinc-400">
        Para tatuagens grandes: defina o tamanho real da peça e o sistema divide o desenho em várias folhas para imprimir e montar, com
        marcas de corte.
      </p>

      <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">Decalque</label>
          <select
            value={decalqueId}
            onChange={(e) => setDecalqueId(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-pink-500"
          >
            <option value="">Selecione…</option>
            {decalques.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Largura final (mm)</label>
          <input
            type="number"
            value={targetWidthMm}
            onChange={(e) => setTargetWidthMm(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-pink-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Altura final (mm)</label>
          <input
            type="number"
            value={targetHeightMm}
            onChange={(e) => setTargetHeightMm(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-pink-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">Papel para impressão</label>
          <select
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value as PaperSizeId)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-pink-500"
          >
            {Object.values(PAPER_SIZES).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {decalque && (
        <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row">
          <img src={decalque.imageUrl} className="h-40 w-40 rounded-lg bg-white object-contain p-2" />
          <div className="text-sm text-zinc-300">
            <p className="mb-1 flex items-center gap-1.5 font-medium text-zinc-100">
              <Scissors size={14} /> {grid.cols} × {grid.rows} = {grid.cols * grid.rows} folha(s) necessárias
            </p>
            <p className="text-zinc-500">
              Papel: {PAPER_SIZES[paperSize].label} · resultado impresso: {targetWidthMm} × {targetHeightMm} mm
            </p>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleExport}
          disabled={!decalqueId || busy}
          className="flex items-center gap-1.5 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500 disabled:opacity-50"
        >
          <Download size={14} /> Exportar PDF para impressão
        </button>
        <button
          onClick={handleSave}
          disabled={!decalqueId || busy}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
        >
          <Save size={14} /> Salvar configuração
        </button>
      </div>

      {tilings.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-zinc-300">Configurações salvas</h2>
          <div className="space-y-2">
            {tilings.map((t) => {
              const d = decalques.find((x) => x.id === t.decalque_id)
              return (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-sm">
                  <span className="text-zinc-300">
                    {d?.name ?? 'Decalque removido'} · {t.target_width_mm} × {t.target_height_mm} mm · {PAPER_SIZES[t.paper_size].label}
                  </span>
                  <button
                    onClick={async () => {
                      await deleteTiling(t.id)
                      await refreshTilings()
                    }}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-950 hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
