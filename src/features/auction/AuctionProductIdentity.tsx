import { useState } from 'react'

import { Package } from '@/components/ui/icons'

export interface AuctionProductIdentityProps {
  readonly name: string
  readonly imageUrl?: string | undefined
  readonly type?: string | undefined
  readonly className?: string | undefined
}

/**
 * Identidad visual compartida de un producto dentro de Auction.
 *
 * Prioriza la imagen canonica de Catalog. El kit Auction actual no contiene
 * una hoja de iconos por tipo, por lo que una URL ausente o que no carga cae
 * en el glifo neutral `Package`; `type` se conserva como dato presentacional
 * para poder adoptar una hoja oficial futura sin inventar asociaciones.
 */
export const AuctionProductIdentity = ({
  name,
  imageUrl,
  type,
  className,
}: AuctionProductIdentityProps): React.JSX.Element => {
  const [imageFailed, setImageFailed] = useState(false)
  const source = imageUrl?.trim()
  const showImage = source !== undefined && source.length > 0 && !imageFailed

  return (
    <span
      className={`auction-product-identity${className === undefined ? '' : ` ${className}`}`}
      data-product-type={type}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={source}
          alt=""
          title={name}
          className="auction-product-identity-image"
          onError={() => {
            setImageFailed(true)
          }}
        />
      ) : (
        <Package className="auction-product-identity-fallback" />
      )}
    </span>
  )
}
