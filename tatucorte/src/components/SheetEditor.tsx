import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Grid2x2, Plus, RotateCw, Save, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { PAPER_SIZES, paperDims } from '../lib/paper'
import type { Decalque, PaperSizeId, SheetItem } from '../types'
import { createSheet, deleteSheet, listSheetItems, replaceSheetItems, updateSheet } from '../lib/data'
import { shelfPack } from '../lib/pack'
import { buildSheetPdf, rotateCanvas } from '../lib/pdf'
import { loadImage } from '../lib/stencil'

const STAGE_WIDTH_PX = 640

type EditableItem = Omit<SheetItem, 'sheet_id'> & { decalque?: Decalque }

export default function SheetEditor() {
  const session = useApp((s) => s.session)
  const decalques = useApp((s) => s.decalques)
  const sheets = useApp((s) => s.sheets)
  const activeSheetId = useApp((s) => s.activeSheetId)
  const setActiveSheetId = useApp((s) => s.setActiveSheetId)
  const refreshSheets = useApp((s) => s.refreshSheets)

  const [name, setName] = useState('Folha sem nome')
  const [paperSize, setPaperSize] = useState<PaperSizeId>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [items, setItems] = useState<EditableItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stageRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ id: string; mode: 'move' | 'resize'; startX: number; startY: number; item: EditableItem; ratio: number } | null>(null)

  const dims = paperDims(paperSize, orientation)
  const scale = STAGE_WIDTH_PX / dims.widthMm
  const stageHeightPx = dims.heightMm * scale

  useEffect(() => {
    if (!activeSheetId) return
    const sheet = sheets.find((s) => s.id === activeSheetId)
    if (!sheet) return
    setName(sheet.name)
    setPaperSize(sheet.paper_size)
    setOrientation(sheet.orientation)
    listSheetItems(sheet.id).then((rows) => {
      setItems(rows.map((r) => ({ ...r, decalque: decalques.find((d) => d.id === r.decalque_id) })))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSheetId])

  function addDecalque(d: Decalque) {
    const maxW = dims.widthMm - 10
    const scaleDown = d.width_mm > maxW ? maxW / d.width_mm : 1
    const newItem: EditableItem = {
      id: crypto.randomUUID(),
      decalque_id: d.id,
      x_mm: 5,
      y_mm: 5,
      width_mm: Math.round(d.width_mm * scaleDown),
      height_mm: Math.round(d.height_mm * scaleDown),
      rotation: 0,
      decalque: d,
    }
    setItems((prev) => [...prev, newItem])
    setPickerOpen(false)
    setSelectedId(newItem.id)
  }

  function handleAutoArrange() {
    const packed = shelfPack(
      items.map((i) => ({ id: i.id, widthMm: i.width_mm, heightMm: i.height_mm })),
      dims.widthMm,
      dims.heightMm,
    )
    setItems((prev) => prev.map((it) => {
      const p = packed.find((r) => r.id === it.id)
      return p ? { ...it, x_mm: p.xMm, y_mm: p.yMm } : it
    }))
  }

  function handlePointerDownMove(e: React.PointerEvent, item: EditableItem) {
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setSelectedId(item.id)
    dragState.current = { id: item.id, mode: 'move', startX: e.clientX, startY: e.clientY, item, ratio: item.width_mm / item.height_mm }
  }

  function handlePointerDownResize(e: React.PointerEvent, item: EditableItem) {
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setSelectedId(item.id)
    dragState.current = { id: item.id, mode: 'resize', startX: e.clientX, startY: e.clientY, item, ratio: item.width_mm / item.height_mm }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragState.current
    if (!drag) return
    const dxMm = (e.clientX - drag.startX) / scale
    const dyMm = (e.clientY - drag.startY) / scale

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== drag.id) return it
        if (drag.mode === 'move') {
          const x = Math.min(Math.max(0, drag.item.x_mm + dxMm), dims.widthMm - it.width_mm)
          const y = Math.min(Math.max(0, drag.item.y_mm + dyMm), dims.heightMm - it.height_mm)
          return { ...it, x_mm: x, y_mm: y }
        }
        const newWidth = Math.max(10, Math.min(dims.widthMm - it.x_mm, drag.item.width_mm + dxMm))
        const newHeight = newWidth / drag.ratio
        return { ...it, width_mm: newWidth, height_mm: newHeight }
      }),
    )
  }

  function handlePointerUp() {
    dragState.current = null
  }

  function rotateItem(id: string) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, rotation: (it.rotation + 90) % 360, width_mm: it.height_mm, height_mm: it.width_mm }
          : it,
      ),
    )
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  async function handleSave() {
    if (!session) return
    setSaving(true)
    setError(null)
    try {
      let sheetId = activeSheetId
      if (!sheetId) {
        const created = await createSheet(session.user.id, name, paperSize, orientation)
        sheetId = created.id
        setActiveSheetId(sheetId)
      } else {
        await updateSheet(sheetId, { name, paper_size: paperSize, orientation })
      }
      await replaceSheetItems(
        sheetId,
        items.map((it) => ({
          decalque_id: it.decalque_id,
          x_mm: it.x_mm,
          y_mm: it.y_mm,
          width_mm: it.width_mm,
          height_mm: it.height_mm,
          rotation: it.rotation,
        })),
      )
      await refreshSheets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar a folha.')
    } finally {
      setSaving(false)
    }
  }

  async function handleExportPdf() {
    setExporting(true)
    setError(null)
    try {
      const pdfItems = await Promise.all(
        items.map(async (it) => {
          const url = it.decalque?.imageUrl
          if (!url) throw new Error('Decalque sem imagem.')
          const img = await loadImage(await (await fetch(url)).blob())
          let canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          canvas.getContext('2d')!.drawImage(img, 0, 0)
          const rot = (it.rotation % 360) as 0 | 90 | 180 | 270
          if (rot !== 0) canvas = rotateCanvas(canvas, rot)
          return { dataUrl: canvas.toDataURL('image/png'), xMm: it.x_mm, yMm: it.y_mm, widthMm: it.width_mm, heightMm: it.height_mm }
        }),
      )
      const doc = buildSheetPdf(pdfItems, dims.widthMm, dims.heightMm)
      doc.save(`${name || 'folha'}.pdf`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao exportar PDF.')
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteSheet() {
    if (!activeSheetId) return
    if (!confirm('Excluir esta folha salva?')) return
    await deleteSheet(activeSheetId)
    setActiveSheetId(null)
    setItems([])
    setName('Folha sem nome')
    await refreshSheets()
  }

  const availableDecalques = useMemo(() => decalques, [decalques])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={activeSheetId ?? ''}
          onChange={(e) => setActiveSheetId(e.target.value || null)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-300 outline-none"
        >
          <option value="">+ Nova folha</option>
          {sheets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-pink-500"
        />
        <select
          value={paperSize}
          onChange={(e) => setPaperSize(e.target.value as PaperSizeId)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-300 outline-none"
        >
          {Object.values(PAPER_SIZES).map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={orientation}
          onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-300 outline-none"
        >
          <option value="portrait">Retrato</option>
          <option value="landscape">Paisagem</option>
        </select>

        <div className="ml-auto flex gap-2">
          <button onClick={() => setPickerOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700">
            <Plus size={14} /> Adicionar decalque
          </button>
          <button onClick={handleAutoArrange} disabled={items.length === 0} className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50">
            <Grid2x2 size={14} /> Organizar automaticamente
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-pink-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-pink-500 disabled:opacity-50">
            <Save size={14} /> {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <button onClick={handleExportPdf} disabled={exporting || items.length === 0} className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50">
            <Download size={14} /> {exporting ? 'Gerando…' : 'Exportar PDF'}
          </button>
          {activeSheetId && (
            <button onClick={handleDeleteSheet} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-red-400 hover:bg-red-950">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="overflow-auto rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div
          ref={stageRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ width: STAGE_WIDTH_PX, height: stageHeightPx }}
          className="relative mx-auto bg-white shadow-inner"
        >
          {items.map((it) => (
            <div
              key={it.id}
              onPointerDown={(e) => handlePointerDownMove(e, it)}
              style={{
                position: 'absolute',
                left: it.x_mm * scale,
                top: it.y_mm * scale,
                width: it.width_mm * scale,
                height: it.height_mm * scale,
              }}
              className={`cursor-move touch-none select-none ${selectedId === it.id ? 'outline outline-2 outline-pink-500' : 'outline outline-1 outline-zinc-300'}`}
            >
              <div
                className="pointer-events-none h-full w-full"
                style={{
                  transform: `rotate(${it.rotation}deg)`,
                  ...(it.rotation % 180 !== 0
                    ? { width: `${(it.height_mm * scale)}px`, height: `${it.width_mm * scale}px`, marginLeft: `${(it.width_mm - it.height_mm) * scale / 2}px`, marginTop: `${(it.height_mm - it.width_mm) * scale / 2}px` }
                    : {}),
                }}
              >
                {it.decalque?.imageUrl && <img src={it.decalque.imageUrl} className="h-full w-full object-contain" draggable={false} />}
              </div>

              {selectedId === it.id && (
                <>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => rotateItem(it.id)}
                    className="absolute -top-3 -right-3 grid h-6 w-6 place-items-center rounded-full bg-pink-600 text-white"
                    title="Girar 90°"
                  >
                    <RotateCw size={12} />
                  </button>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => removeItem(it.id)}
                    className="absolute -top-3 -left-3 grid h-6 w-6 place-items-center rounded-full bg-zinc-800 text-red-400"
                    title="Remover"
                  >
                    <Trash2 size={12} />
                  </button>
                  <div
                    onPointerDown={(e) => handlePointerDownResize(e, it)}
                    className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-se-resize rounded-full border-2 border-pink-600 bg-white"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setPickerOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="mb-3 text-sm font-semibold text-zinc-200">Escolha um decalque</h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {availableDecalques.map((d) => (
                <button key={d.id} onClick={() => addDecalque(d)} className="rounded-lg border border-zinc-800 bg-white p-2 hover:border-pink-500">
                  <img src={d.imageUrl} className="aspect-square w-full object-contain" />
                  <p className="mt-1 truncate text-xs text-zinc-700">{d.name}</p>
                </button>
              ))}
              {availableDecalques.length === 0 && <p className="col-span-full text-sm text-zinc-500">Nenhum decalque salvo ainda.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
