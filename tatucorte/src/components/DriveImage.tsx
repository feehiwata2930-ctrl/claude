import { useEffect, useState } from 'react'
import { getImageObjectUrl } from '../lib/drive'
import { ensureAccessToken } from '../lib/googleAuth'

interface Loaded {
  fileId: string
  src: string | null
  failed: boolean
}

/** Imagem cujo conteúdo vem de um arquivo privado no Google Drive (precisa de token). */
export default function DriveImage({ fileId, alt, className }: { fileId: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState<Loaded>({ fileId, src: null, failed: false })
  // Enquanto o efeito ainda não rodou para o novo fileId, mostra o estado de carregamento
  // em vez do resultado desatualizado do fileId anterior — sem precisar de um setState
  // síncrono logo no início do efeito.
  const current = loaded.fileId === fileId ? loaded : { fileId, src: null, failed: false }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = await ensureAccessToken(false)
        const url = await getImageObjectUrl(token, fileId)
        if (!cancelled) setLoaded({ fileId, src: url, failed: false })
      } catch {
        if (!cancelled) setLoaded({ fileId, src: null, failed: true })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fileId])

  if (current.failed) return <div className={`grid place-items-center bg-zinc-200 text-xs text-zinc-500 ${className ?? ''}`}>erro</div>
  if (!current.src) return <div className={`animate-pulse bg-zinc-200 ${className ?? ''}`} />
  return <img src={current.src} alt={alt} className={className} draggable={false} />
}
