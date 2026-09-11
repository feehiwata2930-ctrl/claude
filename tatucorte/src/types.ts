export type PaperSizeId = 'a4' | 'a5' | 'letter' | 'a3'

export interface PaperSize {
  id: PaperSizeId
  label: string
  widthMm: number
  heightMm: number
}

export interface StencilSettings {
  threshold: number // 0-255
  contrast: number // -100..100
  lineThickness: number // 0-3, dilation passes
  invert: boolean
}

export interface Client {
  id: string
  user_id: string
  name: string
  notes: string | null
  created_at: string
}

export interface Decalque {
  id: string
  user_id: string
  client_id: string | null
  name: string
  image_path: string
  width_mm: number
  height_mm: number
  settings: StencilSettings
  created_at: string
  // resolved at runtime, not stored
  imageUrl?: string
}

export interface Sheet {
  id: string
  user_id: string
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
  user_id: string
  decalque_id: string
  target_width_mm: number
  target_height_mm: number
  paper_size: PaperSizeId
  created_at: string
}
