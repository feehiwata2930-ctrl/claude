import { create } from 'zustand'
import type { Client, Decalque, LocalDb, PaperSizeId, Sheet, SheetItem, StencilSettings, Tiling } from './types'
import { EMPTY_DB } from './types'
import { newId } from './lib/id'
import { deleteImage, forgetImageObjectUrl, loadDb, saveDb, saveImage } from './lib/localdb'

export type View = 'estudio' | 'biblioteca' | 'folha' | 'ampliar' | 'clientes'

interface AppState {
  loaded: boolean
  db: LocalDb

  view: View
  setView: (v: View) => void

  activeSheetId: string | null
  setActiveSheetId: (id: string | null) => void
  activeDecalqueForTiling: string | null
  setActiveDecalqueForTiling: (id: string | null) => void

  init: () => Promise<void>

  addClient: (name: string, notes: string) => Promise<void>
  removeClient: (id: string) => Promise<void>

  addDecalque: (input: {
    name: string
    clientId: string | null
    blob: Blob
    widthMm: number
    heightMm: number
    settings: StencilSettings
  }) => Promise<void>
  removeDecalque: (id: string) => Promise<void>

  createSheet: (name: string, paperSize: PaperSizeId, orientation: 'portrait' | 'landscape') => Promise<string>
  updateSheetMeta: (id: string, patch: Partial<Pick<Sheet, 'name' | 'paper_size' | 'orientation'>>) => Promise<void>
  removeSheet: (id: string) => Promise<void>
  replaceSheetItems: (sheetId: string, items: Omit<SheetItem, 'id' | 'sheet_id'>[]) => Promise<void>

  addTiling: (input: { decalqueId: string; targetWidthMm: number; targetHeightMm: number; paperSize: PaperSizeId }) => Promise<void>
  removeTiling: (id: string) => Promise<void>
}

export const useApp = create<AppState>((set, get) => ({
  loaded: false,
  db: EMPTY_DB,

  view: 'estudio',
  setView: (v) => set({ view: v }),

  activeSheetId: null,
  setActiveSheetId: (id) => set({ activeSheetId: id }),
  activeDecalqueForTiling: null,
  setActiveDecalqueForTiling: (id) => set({ activeDecalqueForTiling: id }),

  init: async () => {
    const db = await loadDb()
    set({ db: { ...EMPTY_DB, ...db }, loaded: true })
  },

  addClient: async (name, notes) => {
    const record: Client = { id: newId(), name, notes: notes || null, created_at: new Date().toISOString() }
    await mutate(get, set, (db) => ({ ...db, clients: [...db.clients, record] }))
  },
  removeClient: async (id) => {
    await mutate(get, set, (db) => ({
      ...db,
      clients: db.clients.filter((c) => c.id !== id),
      decalques: db.decalques.map((d) => (d.client_id === id ? { ...d, client_id: null } : d)),
    }))
  },

  addDecalque: async ({ name, clientId, blob, widthMm, heightMm, settings }) => {
    const imageId = newId()
    await saveImage(imageId, blob)
    const record: Decalque = {
      id: newId(),
      client_id: clientId,
      name,
      image_id: imageId,
      width_mm: widthMm,
      height_mm: heightMm,
      settings,
      created_at: new Date().toISOString(),
    }
    await mutate(get, set, (db) => ({ ...db, decalques: [record, ...db.decalques] }))
  },
  removeDecalque: async (id) => {
    const record = get().db.decalques.find((d) => d.id === id)
    if (!record) return
    await deleteImage(record.image_id)
    forgetImageObjectUrl(record.image_id)
    await mutate(get, set, (db) => ({
      ...db,
      decalques: db.decalques.filter((d) => d.id !== id),
      sheet_items: db.sheet_items.filter((i) => i.decalque_id !== id),
      tilings: db.tilings.filter((t) => t.decalque_id !== id),
    }))
  },

  createSheet: async (name, paperSize, orientation) => {
    const id = newId()
    const now = new Date().toISOString()
    const record: Sheet = { id, name, paper_size: paperSize, orientation, created_at: now, updated_at: now }
    await mutate(get, set, (db) => ({ ...db, sheets: [record, ...db.sheets] }))
    return id
  },
  updateSheetMeta: async (id, patch) => {
    await mutate(get, set, (db) => ({
      ...db,
      sheets: db.sheets.map((s) => (s.id === id ? { ...s, ...patch, updated_at: new Date().toISOString() } : s)),
    }))
  },
  removeSheet: async (id) => {
    await mutate(get, set, (db) => ({
      ...db,
      sheets: db.sheets.filter((s) => s.id !== id),
      sheet_items: db.sheet_items.filter((i) => i.sheet_id !== id),
    }))
  },
  replaceSheetItems: async (sheetId, items) => {
    const withIds: SheetItem[] = items.map((item) => ({ ...item, id: newId(), sheet_id: sheetId }))
    await mutate(get, set, (db) => ({
      ...db,
      sheet_items: [...db.sheet_items.filter((i) => i.sheet_id !== sheetId), ...withIds],
    }))
  },

  addTiling: async ({ decalqueId, targetWidthMm, targetHeightMm, paperSize }) => {
    const record: Tiling = {
      id: newId(),
      decalque_id: decalqueId,
      target_width_mm: targetWidthMm,
      target_height_mm: targetHeightMm,
      paper_size: paperSize,
      created_at: new Date().toISOString(),
    }
    await mutate(get, set, (db) => ({ ...db, tilings: [record, ...db.tilings] }))
  },
  removeTiling: async (id) => {
    await mutate(get, set, (db) => ({ ...db, tilings: db.tilings.filter((t) => t.id !== id) }))
  },
}))

async function mutate(get: () => AppState, set: (partial: Partial<AppState>) => void, updater: (db: LocalDb) => LocalDb) {
  const nextDb = updater(get().db)
  set({ db: nextDb })
  await saveDb(nextDb)
}
