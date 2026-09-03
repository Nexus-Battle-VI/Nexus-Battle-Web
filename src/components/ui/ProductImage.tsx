import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'

import { httpClient } from '@/lib/http'
import { API_BASE_URL } from '@/lib/apiBase'
import { useSession } from '@/shared/session'

interface ProductImageProps {
  readonly source?: string
  readonly name: string
  readonly className?: string
}

/** El token solo se envia a nuestra API. Una URL externa se carga sin credenciales de la app. */
export const ProductImage = ({
  source,
  name,
  className = 'h-40 w-full rounded object-contain',
}: ProductImageProps): React.JSX.Element => {
  const subject = useSession((state) => state.subject)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<{
    source: string
    subject: string | null
    url: string
  } | null>(null)
  let direct: string | null = null
  let path: string | null = null
  if (source) {
    try {
      const url = new URL(source, globalThis.location.origin)
      if (
        url.origin === globalThis.location.origin &&
        url.pathname.startsWith(`${API_BASE_URL}/`)
      ) {
        path = `${url.pathname.slice(API_BASE_URL.length)}${url.search}`
      } else if (
        url.protocol === 'https:' ||
        (url.protocol === 'http:' && url.origin === globalThis.location.origin)
      ) {
        direct = url.href
      }
    } catch {
      /* Una imagen invalida no impide consultar el producto. */
    }
  }

  useEffect(() => {
    if (path === null || source === undefined) return
    const controller = new AbortController()
    let objectUrl: string | null = null
    void httpClient
      .download(path, controller.signal)
      .then(({ content, mediaType }) => {
        if (controller.signal.aborted || !mediaType.startsWith('image/')) return
        objectUrl = URL.createObjectURL(content)
        setLoaded({ source, subject, url: objectUrl })
      })
      .catch(() => {
        /* La alternativa visible permanece cuando falla la imagen. */
      })
    return () => {
      controller.abort()
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl)
    }
  }, [path, source, subject])

  const url =
    direct ?? (loaded?.source === source && loaded?.subject === subject ? loaded.url : null)
  return url === null || failedUrl === url ? (
    <span
      role="img"
      aria-label={`Imagen no disponible de ${name}`}
      title={`Imagen no disponible de ${name}`}
      className={`flex items-center justify-center bg-surface text-xs text-muted ${className}`}
    >
      <ImageOff aria-hidden="true" className="size-5 shrink-0" />
    </span>
  ) : (
    <img
      src={url}
      alt={name}
      className={className}
      loading="lazy"
      onError={() => {
        setFailedUrl(url)
      }}
    />
  )
}
