import { getSupabase } from './supabaseClient'
import { newId } from './id'
import type { Client, Decalque, PaperSizeId, Sheet, SheetItem, StencilSettings, Tiling } from '../types'

function sb() {
  const client = getSupabase()
  if (!client) throw new Error('Configure a conexão com o Supabase primeiro.')
  return client
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string) {
  const { data, error } = await sb().auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await sb().auth.signOut()
  if (error) throw error
}

// ─── Clientes ──────────────────────────────────────────────────────────────

export async function listClients(): Promise<Client[]> {
  const { data, error } = await sb().from('clients').select('*').order('name')
  if (error) throw error
  return data as Client[]
}

export async function createClient(userId: string, name: string, notes: string): Promise<Client> {
  const { data, error } = await sb()
    .from('clients')
    .insert({ user_id: userId, name, notes: notes || null })
    .select()
    .single()
  if (error) throw error
  return data as Client
}

export async function deleteClient(id: string) {
  const { error } = await sb().from('clients').delete().eq('id', id)
  if (error) throw error
}

// ─── Decalques ─────────────────────────────────────────────────────────────

export function decalqueImageUrl(path: string): string {
  return sb().storage.from('decalques').getPublicUrl(path).data.publicUrl
}

export async function uploadDecalqueImage(userId: string, blob: Blob): Promise<string> {
  const path = `${userId}/${newId()}.png`
  const { error } = await sb().storage.from('decalques').upload(path, blob, {
    contentType: 'image/png',
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function listDecalques(): Promise<Decalque[]> {
  const { data, error } = await sb().from('decalques').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as Decalque[]).map((d) => ({ ...d, imageUrl: decalqueImageUrl(d.image_path) }))
}

export async function createDecalque(input: {
  userId: string
  clientId: string | null
  name: string
  imagePath: string
  widthMm: number
  heightMm: number
  settings: StencilSettings
}): Promise<Decalque> {
  const { data, error } = await sb()
    .from('decalques')
    .insert({
      user_id: input.userId,
      client_id: input.clientId,
      name: input.name,
      image_path: input.imagePath,
      width_mm: input.widthMm,
      height_mm: input.heightMm,
      settings: input.settings,
    })
    .select()
    .single()
  if (error) throw error
  return { ...(data as Decalque), imageUrl: decalqueImageUrl((data as Decalque).image_path) }
}

export async function deleteDecalque(id: string, imagePath: string) {
  const { error } = await sb().from('decalques').delete().eq('id', id)
  if (error) throw error
  await sb().storage.from('decalques').remove([imagePath])
}

// ─── Folhas ────────────────────────────────────────────────────────────────

export async function listSheets(): Promise<Sheet[]> {
  const { data, error } = await sb().from('sheets').select('*').order('updated_at', { ascending: false })
  if (error) throw error
  return data as Sheet[]
}

export async function createSheet(userId: string, name: string, paperSize: PaperSizeId, orientation: 'portrait' | 'landscape'): Promise<Sheet> {
  const { data, error } = await sb()
    .from('sheets')
    .insert({ user_id: userId, name, paper_size: paperSize, orientation })
    .select()
    .single()
  if (error) throw error
  return data as Sheet
}

export async function updateSheet(id: string, patch: Partial<Pick<Sheet, 'name' | 'paper_size' | 'orientation'>>) {
  const { error } = await sb()
    .from('sheets')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteSheet(id: string) {
  const { error } = await sb().from('sheets').delete().eq('id', id)
  if (error) throw error
}

export async function listSheetItems(sheetId: string): Promise<SheetItem[]> {
  const { data, error } = await sb().from('sheet_items').select('*').eq('sheet_id', sheetId)
  if (error) throw error
  return data as SheetItem[]
}

export async function replaceSheetItems(sheetId: string, items: Omit<SheetItem, 'id' | 'sheet_id'>[]) {
  const { error: delError } = await sb().from('sheet_items').delete().eq('sheet_id', sheetId)
  if (delError) throw delError
  if (items.length === 0) return
  const { error } = await sb()
    .from('sheet_items')
    .insert(items.map((item) => ({ ...item, sheet_id: sheetId })))
  if (error) throw error
}

// ─── Ampliações / mosaicos ──────────────────────────────────────────────────

export async function listTilings(): Promise<Tiling[]> {
  const { data, error } = await sb().from('tilings').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data as Tiling[]
}

export async function createTiling(input: {
  userId: string
  decalqueId: string
  targetWidthMm: number
  targetHeightMm: number
  paperSize: PaperSizeId
}): Promise<Tiling> {
  const { data, error } = await sb()
    .from('tilings')
    .insert({
      user_id: input.userId,
      decalque_id: input.decalqueId,
      target_width_mm: input.targetWidthMm,
      target_height_mm: input.targetHeightMm,
      paper_size: input.paperSize,
    })
    .select()
    .single()
  if (error) throw error
  return data as Tiling
}

export async function deleteTiling(id: string) {
  const { error } = await sb().from('tilings').delete().eq('id', id)
  if (error) throw error
}
