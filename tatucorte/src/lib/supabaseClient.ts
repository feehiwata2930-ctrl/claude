import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config'

let cached: { client: SupabaseClient; url: string } | null = null

export function getSupabase(): SupabaseClient | null {
  const config = getSupabaseConfig()
  if (!config) return null
  if (cached && cached.url === config.url) return cached.client
  const client = createClient(config.url, config.anonKey)
  cached = { client, url: config.url }
  return client
}

export function resetSupabaseClient() {
  cached = null
}
