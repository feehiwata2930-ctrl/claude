import { newId } from './id'
import type { PromptResult } from './promptBuilder'

const STORAGE_KEY = 'tatucorte_prompt_history'
const MAX_ENTRIES = 30

export interface SavedPrompt extends PromptResult {
  id: string
  createdAt: string
}

export function loadPromptHistory(): SavedPrompt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function savePromptToHistory(result: PromptResult): SavedPrompt[] {
  const entry: SavedPrompt = { ...result, id: newId(), createdAt: new Date().toISOString() }
  const next = [entry, ...loadPromptHistory()].slice(0, MAX_ENTRIES)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // localStorage indisponível (modo privado, cheio) — histórico só não persiste
  }
  return next
}

export function removePromptFromHistory(id: string): SavedPrompt[] {
  const next = loadPromptHistory().filter((p) => p.id !== id)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  return next
}
