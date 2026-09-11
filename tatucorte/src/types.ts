export type PaperSizeId = 'a4' | 'a5' | 'letter' | 'a3'

export interface PaperSize {
  id: PaperSizeId
  label: string
  widthMm: number
  heightMm: number
}

export interface StencilSettings {
  threshold: number // limiar "alto" do Canny (sensibilidade do contorno)
  contrast: number // -100..100
  blur: number // 0-4, raio do desfoque para reduzir ruído antes da detecção de bordas
  lineThickness: number // 0-3, dilation passes
  invert: boolean
}

export interface Client {
  id: string
  name: string
  notes: string | null
  created_at: string
}

export interface Decalque {
  id: string
  client_id: string | null
  name: string
  image_file_id: string
  width_mm: number
  height_mm: number
  settings: StencilSettings
  created_at: string
}

export interface Sheet {
  id: string
  name: string
  paper_size: PaperSizeId
  orientation: 'portrait' | 'landscape'
  created_at: string
  updated_at: string
}

export interface SheetItem {
  id: string
  sheet_id: string
  decalque_id: string
  x_mm: number
  y_mm: number
  width_mm: number
  height_mm: number
  rotation: number
}

export interface Tiling {
  id: string
  decalque_id: string
  target_width_mm: number
  target_height_mm: number
  paper_size: PaperSizeId
  created_at: string
}

export interface DriveDb {
  clients: Client[]
  decalques: Decalque[]
  sheets: Sheet[]
  sheet_items: SheetItem[]
  tilings: Tiling[]
}

export const EMPTY_DB: DriveDb = { clients: [], decalques: [], sheets: [], sheet_items: [], tilings: [] }
