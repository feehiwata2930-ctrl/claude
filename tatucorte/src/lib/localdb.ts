import type { LocalDb } from '../types'
import { EMPTY_DB } from '../types'

const DB_NAME = 'tatucorte'
const DB_VERSION = 1
const STORE_KV = 'kv'
const STORE_IMAGES = 'images'
const DB_KEY = 'db'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV)
      if (!db.objectStoreNames.contains(STORE_IMAGES)) db.createObjectStore(STORE_IMAGES)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(storeName, mode)
        const store = t.objectStore(storeName)
        const req = run(store)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function loadDb(): Promise<LocalDb> {
  const stored = await tx<LocalDb | undefined>(STORE_KV, 'readonly', (s) => s.get(DB_KEY))
  return stored ? { ...EMPTY_DB, ...stored } : EMPTY_DB
}

export async function saveDb(db: LocalDb): Promise<void> {
  await tx(STORE_KV, 'readwrite', (s) => s.put(db, DB_KEY))
}

export async function saveImage(id: string, blob: Blob): Promise<void> {
  await tx(STORE_IMAGES, 'readwrite', (s) => s.put(blob, id))
}

export async function getImage(id: string): Promise<Blob | undefined> {
  return tx(STORE_IMAGES, 'readonly', (s) => s.get(id))
}

export async function deleteImage(id: string): Promise<void> {
  await tx(STORE_IMAGES, 'readwrite', (s) => s.delete(id))
}

const objectUrlCache = new Map<string, string>()

/** Busca a imagem no IndexedDB e memoriza como object URL local (evita recarregar toda hora). */
export async function getImageObjectUrl(id: string): Promise<string> {
  const cached = objectUrlCache.get(id)
  if (cached) return cached
  const blob = await getImage(id)
  if (!blob) throw new Error('Imagem não encontrada.')
  const url = URL.createObjectURL(blob)
  objectUrlCache.set(id, url)
  return url
}

export function forgetImageObjectUrl(id: string) {
  const url = objectUrlCache.get(id)
  if (url) URL.revokeObjectURL(url)
  objectUrlCache.delete(id)
}
