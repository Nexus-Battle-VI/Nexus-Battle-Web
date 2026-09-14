import { useEffect, useState } from 'react'
import clsx from 'clsx'

import { httpClient } from '@/lib/http'
import { API_BASE_URL } from '@/lib/apiBase'
import { useSession } from '@/shared/session'

export interface ProductThumbProps {
  readonly src: string | null
  readonly alt: string
  readonly className?: string
}

/**
 * Decide si `src` es una ruta de nuestra API (necesita el testimonio) o una
 * URL externa (se carga sin credenciales). Misma logica que
 * `components/ui/ProductImage`, que resuelve el mismo problema para la
 * Vitrina de Commerce.
 */
const resolveSource = (src: string): { path: string | null; direct: string | null } => {
  try {
    const url = new URL(src, globalThis.location.origin)

    if (url.origin === globalThis.location.origin && url.pathname.startsWith(`${API_BASE_URL}/`)) {
      return { path: `${url.pathname.slice(API_BASE_URL.length)}${url.search}`, direct: null }
    }

    if (
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && url.origin === globalThis.location.origin)
    ) {
      return { path: null, direct: url.href }
    }
  } catch {
    /* Una URL invalida no impide mostrar el marcador neutro. */
  }

  return { path: null, direct: null }
}

/**
 * Miniatura de un producto a partir de la `imageUrl` que publica Catalog.
 *
 * El endpoint de contenido de Catalog exige testimonio Bearer
 * (AUTH_MODE=jwt): un `<img src>` plano no puede llevarlo -el navegador no
 * permite adjuntar cabeceras a una carga de imagen-, asi que esta miniatura
 * descarga el contenido con `httpClient` (que si lo adjunta) y lo muestra
 * como URL de objeto, igual que `components/ui/ProductImage`. Sin esto,
 * cualquier imagen real de Catalog en el inventario fallaba con 401 en
 * silencio y solo se veia el marcador neutro.
 *
 * No usa la biblioteca visual de EN-026 porque sus identificadores
 * (`{heroe}--{categoria}--{nombre}`) son independientes del `sku`/`productId` de
 * Catalog y no hay un mapeo demostrado entre ambos. Si no hay URL o la imagen
 * no carga, se muestra un marcador neutro; nunca se inventa una ilustracion.
 */
export const ProductThumb = ({ src, alt, className }: ProductThumbProps): React.JSX.Element => {
  const subject = useSession((state) => state.subject)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<{
    src: string
    subject: string | null
    url: string
  } | null>(null)

  const { path, direct } =
    src !== null && src !== '' ? resolveSource(src) : { path: null, direct: null }

  useEffect(() => {
    if (path === null || src === null) return

    const controller = new AbortController()
    let objectUrl: string | null = null

    void httpClient
      .download(path, controller.signal)
      .then(({ content, mediaType }) => {
        if (controller.signal.aborted || !mediaType.startsWith('image/')) return
        objectUrl = URL.createObjectURL(content)
        setLoaded({ src, subject, url: objectUrl })
      })
      .catch(() => {
        /* La alternativa visible permanece cuando falla la imagen. */
      })

    return () => {
      controller.abort()
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `path` se deriva de `src`, incluirlo duplicaria la dependencia.
  }, [src, subject])

  const resolvedUrl =
    direct ??
    (loaded !== null && loaded.src === src && loaded.subject === subject ? loaded.url : null)

  const box = clsx(
    'flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-surface',
    className,
  )

  if (src === null || src === '' || resolvedUrl === null || failedUrl === resolvedUrl) {
    return (
      <div className={box} role="img" aria-label={alt}>
        <span aria-hidden="true" className="text-2xl text-muted">
          ▧
        </span>
      </div>
    )
  }

  return (
    <div className={box}>
      <img
        src={resolvedUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-contain"
        onError={() => {
          setFailedUrl(resolvedUrl)
        }}
      />
    </div>
  )
}
