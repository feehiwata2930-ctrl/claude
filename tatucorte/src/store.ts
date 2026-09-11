import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { Client, Decalque, Sheet, Tiling } from './types'
import * as data from './lib/data'

export type View = 'estudio' | 'biblioteca' | 'folha' | 'ampliar' | 'clientes' | 'config'

interface AppState {
  session: Session | null
  setSession: (s: Session | null) => void

  view: View
  setView: (v: View) => void

  clients: Client[]
  decalques: Decalque[]
  sheets: Sheet[]
  tilings: Tiling[]
  loaded: boolean

  activeSheetId: string | null
  setActiveSheetId: (id: string | null) => void
  activeDecalqueForTiling: string | null
  setActiveDecalqueForTiling: (id: string | null) => void

  refreshAll: () => Promise<void>
  refreshClients: () => Promise<void>
  refreshDecalques: () => Promise<void>
  refreshSheets: () => Promise<void>
  refreshTilings: () => Promise<void>
}

export const useApp = create<AppState>((set, get) => ({
  session: null,
  setSession: (s) => set({ session: s }),

  view: 'estudio',
  setView: (v) => set({ view: v }),

  clients: [],
  decalques: [],
  sheets: [],
  tilings: [],
  loaded: false,

  activeSheetId: null,
  setActiveSheetId: (id) => set({ activeSheetId: id }),
  activeDecalqueForTiling: null,
  setActiveDecalqueForTiling: (id) => set({ activeDecalqueForTiling: id }),

  refreshAll: async () => {
    await Promise.all([get().refreshClients(), get().refreshDecalques(), get().refreshSheets(), get().refreshTilings()])
    set({ loaded: true })
  },
  refreshClients: async () => set({ clients: await data.listClients() }),
  refreshDecalques: async () => set({ decalques: await data.listDecalques() }),
  refreshSheets: async () => set({ sheets: await data.listSheets() }),
  refreshTilings: async () => set({ tilings: await data.listTilings() }),
}))
