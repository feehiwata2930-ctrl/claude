const URL_KEY = 'tatucorte.supabaseUrl'
const ANON_KEY = 'tatucorte.supabaseAnonKey'

export interface SupabaseConfig {
  url: string
  anonKey: string
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = localStorage.getItem(URL_KEY)
  const anonKey = localStorage.getItem(ANON_KEY)
  if (!url || !anonKey) return null
  return { url, anonKey }
}

export function setSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(URL_KEY, config.url)
  localStorage.setItem(ANON_KEY, config.anonKey)
}

export function clearSupabaseConfig() {
  localStorage.removeItem(URL_KEY)
  localStorage.removeItem(ANON_KEY)
}
