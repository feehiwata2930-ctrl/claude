const CLIENT_ID_KEY = 'tatucorte.googleClientId'

export function getGoogleClientId(): string | null {
  return localStorage.getItem(CLIENT_ID_KEY)
}

export function setGoogleClientId(clientId: string) {
  localStorage.setItem(CLIENT_ID_KEY, clientId)
}

export function clearGoogleClientId() {
  localStorage.removeItem(CLIENT_ID_KEY)
}
