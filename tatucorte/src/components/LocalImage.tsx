import { useEffect, useState } from 'react'
import { getImageObjectUrl } from '../lib/localdb'

interface Loaded {
  imageId: string
  src: string | null
  failed: boolean
}

/** Imagem cujo conteúdo vem do IndexedDB local (não de uma URL). */
export default function LocalImage({ imageId, alt, className }: { imageId: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState<Loaded>({ imageId, src: null, failed: false })
  // Enquanto o efeito ainda não rodou para o novo imageId, mostra o estado de
  // carregamento em vez do resultado desatualizado do imageId anterior.
  const current = loaded.imageId === imageId ? loaded : { imageId, src: null, failed: false }

  useEffect(() => {
    let cancelled = false
    getImageObjectUrl(imageId)
      .then((url) => {
        if (!cancelled) setLoaded({ imageId, src: url, failed: false })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ imageId, src: null, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [imageId])

  if (current.failed) return <div className={`grid place-items-center bg-zinc-200 text-xs text-zinc-500 ${className ?? ''}`}>erro</div>
  if (!current.src) return <div className={`animate-pulse bg-zinc-200 ${className ?? ''}`} />
  return <img src={current.src} alt={alt} className={className} draggable={false} />
}
