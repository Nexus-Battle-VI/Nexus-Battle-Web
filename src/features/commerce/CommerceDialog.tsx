import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

import { MarketplacePixelIcon } from '@/features/commerce/marketplace/MarketplacePixelIcon'

/** La capa nativa mantiene el foco dentro y lo devuelve al control que la abrió. */
export const CommerceDialog = ({
  title,
  onClose,
  children,
  floating = false,
  locked = false,
  wide = false,
}: {
  readonly title: string
  readonly onClose: () => void
  readonly children: ReactNode
  readonly floating?: boolean
  readonly locked?: boolean
  /**
   * Detalle del producto (7a pasada): el modal por defecto (`min(92vw,
   * 960px)`) seguia sintiendose angosto para el layout de dos columnas que
   * necesita `ProductDetail` -imagen + info principal lado a lado, luego
   * atributos en columnas-. `wide` SOLO ensancha el tope de ese `min()`
   * (`commerce-dialog-wide`, ver `commerce.css`); el resto de dialogos
   * (carrito, checkout, login) no pasan esta prop y no cambian.
   */
  readonly wide?: boolean
}): React.JSX.Element => {
  const dialog = useRef<HTMLDialogElement>(null)
  const { t } = useTranslation()
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => {
      element?.close()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      aria-label={title}
      className={`commerce-dialog${floating ? ' commerce-dialog-cart' : ''}${wide ? ' commerce-dialog-wide' : ''}`}
      onCancel={(event) => {
        event.preventDefault()
        if (!locked) onClose()
      }}
    >
      <div
        className={clsx(
          'flex items-center justify-between gap-3 px-4 py-2',
          floating && 'commerce-dialog-cart-header',
        )}
      >
        <p className="text-xs font-medium text-muted">{title}</p>
        <button
          type="button"
          aria-label={t('commerce:dialog.close', { title })}
          disabled={locked}
          onClick={onClose}
          className="commerce-dialog-close rounded-full text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
        >
          {/*
            Ultimo polish: solo el carrito flotante (unico consumidor real de
            `floating`) sube el icono de "sm" a "md" (26px -> 32px, dentro del
            rango ~28-32px que pidio Richard). El resto de dialogos (detalle,
            checkout, inicio de sesion) no pasan `floating` y no cambian. El
            area de toque sigue fija en 44x44px via `.commerce-dialog-close`.
          */}
          <MarketplacePixelIcon icon="close" size={floating ? 'md' : 'sm'} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
