import { useState } from 'react'
import clsx from 'clsx'

export interface ProductThumbProps {
  readonly src: string | null
  readonly alt: string
  readonly className?: string
}

/**
 * Miniatura de un producto a partir de la `imageUrl` que publica Catalog.
 *
 * No usa la biblioteca visual de EN-026 porque sus identificadores
 * (`{heroe}--{categoria}--{nombre}`) son independientes del `sku`/`productId` de
 * Catalog y no hay un mapeo demostrado entre ambos. Si no hay URL o la imagen
 * no carga, se muestra un marcador neutro; nunca se inventa una ilustracion.
 */
export const ProductThumb = ({ src, alt, className }: ProductThumbProps): React.JSX.Element => {
  const [failed, setFailed] = useState(false)

  const box = clsx(
    'flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-surface',
    className,
  )

  if (src === null || src === '' || failed) {
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
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-contain"
        onError={() => {
          setFailed(true)
        }}
      />
    </div>
  )
}
