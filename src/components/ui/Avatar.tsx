import { useEffect, useState } from 'react'
import clsx from 'clsx'

import { httpClient } from '@/lib/http'

/**
 * Avatar reutilizable (HU-15.3).
 *
 * Sustituye los circulos de inicial ad-hoc que existian en `SessionControl` y
 * `AccountSummary` (duplicados, cada uno con su propio tamano/estilo). Ahora
 * que Account expone `GET /accounts/:id/avatar` (protegido por JWT,
 * `AccountDto.avatarUrl` trae la ruta relativa `/accounts/{id}/avatar` o
 * `null`), este componente decide entre imagen real y la inicial de
 * respaldo — pero NUNCA calcula la inicial por su cuenta: cada consumidor
 * sigue derivandola con su propia regla (una letra en la cabecera de sesion,
 * dos iniciales en el resumen de cuenta), exactamente como antes, para no
 * cambiar un comportamiento ya probado.
 *
 * La imagen exige testimonio (`GET /accounts/:id/avatar` esta detras del
 * mismo guardia que el resto de la API), asi que un `<img src="...">` directo
 * no podria enviar el header `Authorization`. Se descarga con `httpClient`
 * (mismo patron que `ProductImage.tsx`) y se expone como Object URL, que se
 * libera al desmontar o al cambiar de avatar.
 */
export interface AvatarProps {
  /** Ruta relativa devuelta por el contrato (`/accounts/{id}/avatar`), o `null` sin avatar. */
  readonly avatarUrl: string | null
  /** Nombre accesible de la imagen cuando SI hay avatar real. */
  readonly alt: string
  /** Inicial(es) de respaldo; la calcula quien usa este componente. */
  readonly initials: string
  readonly size?: 'sm' | 'md' | 'lg'
  readonly className?: string
}

const SIZE_CLASS: Readonly<Record<NonNullable<AvatarProps['size']>, string>> = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-16 w-16 text-xl',
}

export const Avatar = ({
  avatarUrl,
  alt,
  initials,
  size = 'md',
  className,
}: AvatarProps): React.JSX.Element => {
  // Ningun `setState` sincrono al inicio del efecto: en vez de "resetear"
  // el estado cuando cambia `avatarUrl`, se guarda CON que url se obtuvo y
  // se deriva si sigue vigente comparando contra la prop actual (mismo
  // patron que `ProductImage.tsx`). Un `avatarUrl` nuevo simplemente deja de
  // coincidir con `loaded.avatarUrl`, sin necesitar un `setState` de reset.
  const [loaded, setLoaded] = useState<{ avatarUrl: string; url: string } | null>(null)
  // Un solo intento: si la imagen falla al cargar (o el recurso no es una
  // imagen), se cae a la inicial y no se vuelve a intentar - sin bucle.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (avatarUrl === null) {
      return
    }

    const controller = new AbortController()
    let createdUrl: string | null = null

    void httpClient
      .download(avatarUrl, controller.signal)
      .then(({ content, mediaType }) => {
        if (controller.signal.aborted || !mediaType.startsWith('image/')) {
          return
        }

        createdUrl = URL.createObjectURL(content)
        setLoaded({ avatarUrl, url: createdUrl })
      })
      .catch(() => {
        // La inicial de respaldo permanece visible; no hay nada mas que hacer.
      })

    return () => {
      controller.abort()
      if (createdUrl !== null) {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [avatarUrl])

  const objectUrl = loaded?.avatarUrl === avatarUrl ? loaded.url : null
  const showImage = objectUrl !== null && failedUrl !== objectUrl

  return showImage ? (
    <img
      src={objectUrl}
      alt={alt}
      onError={() => {
        setFailedUrl(objectUrl)
      }}
      className={clsx(
        'aspect-square shrink-0 rounded-full object-cover',
        SIZE_CLASS[size],
        className,
      )}
    />
  ) : (
    <span
      aria-hidden="true"
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-full bg-brand/15 font-semibold text-brand',
        SIZE_CLASS[size],
        className,
      )}
    >
      {initials}
    </span>
  )
}
