const API_BASE = 'https://www.googleapis.com/drive/v3'
const UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3'

function escapeQ(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

async function driveFetch(url: string, token: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Google Drive: erro ${res.status} — ${text || res.statusText}`)
  }
  return res
}

async function findFile(token: string, query: string): Promise<{ id: string; name: string } | null> {
  const res = await driveFetch(`${API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`, token)
  const data = (await res.json()) as { files?: { id: string; name: string }[] }
  return data.files?.[0] ?? null
}

export async function ensureFolder(token: string, name: string, parentId?: string): Promise<string> {
  const parentClause = parentId ? ` and '${parentId}' in parents` : " and 'root' in parents"
  const query = `name='${escapeQ(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause}`
  const existing = await findFile(token, query)
  if (existing) return existing.id

  const res = await driveFetch(`${API_BASE}/files?fields=id`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId ?? 'root'] }),
  })
  const data = (await res.json()) as { id: string }
  return data.id
}

/** Acha (ou cria com um conteúdo inicial) um arquivo JSON dentro de uma pasta. */
export async function ensureJsonFile<T>(token: string, name: string, parentId: string, initial: T): Promise<string> {
  const query = `name='${escapeQ(name)}' and '${parentId}' in parents and trashed=false`
  const existing = await findFile(token, query)
  if (existing) return existing.id

  const createRes = await driveFetch(`${API_BASE}/files?fields=id`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parents: [parentId], mimeType: 'application/json' }),
  })
  const created = (await createRes.json()) as { id: string }
  await writeJsonFile(token, created.id, initial)
  return created.id
}

export async function readJsonFile<T>(token: string, fileId: string): Promise<T> {
  const res = await driveFetch(`${API_BASE}/files/${fileId}?alt=media`, token)
  return res.json()
}

export async function writeJsonFile(token: string, fileId: string, data: unknown): Promise<void> {
  await driveFetch(`${UPLOAD_BASE}/files/${fileId}?uploadType=media`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function createBinaryFile(token: string, name: string, parentId: string, blob: Blob): Promise<string> {
  const createRes = await driveFetch(`${API_BASE}/files?fields=id`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parents: [parentId] }),
  })
  const created = (await createRes.json()) as { id: string }
  await driveFetch(`${UPLOAD_BASE}/files/${created.id}?uploadType=media`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob,
  })
  return created.id
}

export async function getBinaryBlob(token: string, fileId: string): Promise<Blob> {
  const res = await driveFetch(`${API_BASE}/files/${fileId}?alt=media`, token)
  return res.blob()
}

export async function deleteFile(token: string, fileId: string): Promise<void> {
  await driveFetch(`${API_BASE}/files/${fileId}`, token, { method: 'DELETE' })
}

const objectUrlCache = new Map<string, string>()
const inFlight = new Map<string, Promise<string>>()

/** Busca a imagem do Drive (autenticado) e memoriza como object URL local. */
export async function getImageObjectUrl(token: string, fileId: string): Promise<string> {
  const cached = objectUrlCache.get(fileId)
  if (cached) return cached
  const pending = inFlight.get(fileId)
  if (pending) return pending

  const promise = getBinaryBlob(token, fileId).then((blob) => {
    const url = URL.createObjectURL(blob)
    objectUrlCache.set(fileId, url)
    inFlight.delete(fileId)
    return url
  })
  inFlight.set(fileId, promise)
  return promise
}

export function forgetImageObjectUrl(fileId: string) {
  const url = objectUrlCache.get(fileId)
  if (url) URL.revokeObjectURL(url)
  objectUrlCache.delete(fileId)
}
