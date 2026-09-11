import { getGoogleClientId } from './googleConfig'

// Carregado dinamicamente via <script>, não existe pacote oficial de tipos —
// tratamos a API do Google Identity Services como `any` mesmo.
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => void
          }): { requestAccessToken: (opts?: { prompt?: string }) => void }
          revoke(token: string, done: () => void): void
        }
      }
    }
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email'
const TOKEN_KEY = 'tatucorte.googleToken'

interface StoredToken {
  access_token: string
  expires_at: number // epoch ms
}

let gisLoadPromise: Promise<void> | null = null

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisLoadPromise) return gisLoadPromise
  gisLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Não foi possível carregar o script do Google Identity Services.'))
    document.head.appendChild(script)
  })
  return gisLoadPromise
}

function getStoredToken(): StoredToken | null {
  const raw = sessionStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredToken
    if (parsed.expires_at > Date.now() + 60_000) return parsed
  } catch {
    // ignore
  }
  return null
}

function storeToken(token: StoredToken) {
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token))
}

export function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

export function getCachedAccessToken(): string | null {
  return getStoredToken()?.access_token ?? null
}

/**
 * Garante um access token válido. Por padrão pede interação do usuário
 * (`interactive=true`) — use assim em resposta direta a um clique. Com
 * `interactive=false` tenta renovar silenciosamente (útil ao recarregar a
 * página); se falhar, retorna null e a tela de login volta a aparecer.
 */
export async function ensureAccessToken(interactive: boolean): Promise<string> {
  const cached = getStoredToken()
  if (cached) return cached.access_token

  const clientId = getGoogleClientId()
  if (!clientId) throw new Error('Configure o Client ID do Google primeiro.')

  await loadGis()
  if (!window.google) throw new Error('Google Identity Services não carregou.')

  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || 'Não foi possível obter acesso ao Google Drive.'))
          return
        }
        const expiresIn = resp.expires_in ?? 3600
        storeToken({ access_token: resp.access_token, expires_at: Date.now() + expiresIn * 1000 })
        resolve(resp.access_token)
      },
    })
    tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' })
  })
}

export async function signOut() {
  const token = getCachedAccessToken()
  clearStoredToken()
  if (token && window.google) {
    await new Promise<void>((resolve) => window.google!.accounts.oauth2.revoke(token, () => resolve()))
  }
}

export interface GoogleUserInfo {
  email: string
  name?: string
  picture?: string
}

export async function fetchUserInfo(token: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Não foi possível obter os dados da conta Google.')
  return res.json()
}
