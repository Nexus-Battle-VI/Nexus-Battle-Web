import clsx from 'clsx'

import { useTheme } from '@/shared/theme'
import { marketplaceIcons, type MarketplaceIconName } from './marketplaceAssets'

export type MarketplacePixelIconSize = 'sm' | 'md' | 'lg' | 'xl'

export interface MarketplacePixelIconProps {
  readonly icon: MarketplaceIconName
  readonly size?: MarketplacePixelIconSize
  readonly className?: string
}

/*
 * 5a pasada (final visual polish): los recortes reales de
 * `public/assets/ecommerce/icons/*.png` NO son todos cuadrados -varian segun
 * cuanto "aire" tenia cada glifo dentro de su celda en la hoja original de
 * PixelLab (algunos Light llegan a ~98x52, casi 2:1-. La 4a pasada fijaba
 * `width` Y `height` al mismo numero, lo que ESTIRABA esos iconos no
 * cuadrados -exactamente lo que el brief de esta pasada prohibe (`no
 * deformes iconos`)-. Ahora solo se fija el ALTO; el ancho es `auto` y el
 * navegador respeta la proporcion real del PNG.
 */
const HEIGHT_PX: Readonly<Record<MarketplacePixelIconSize, number>> = {
  sm: 26,
  md: 32,
  lg: 44,
  xl: 56,
}

/**
 * Icono real de PixelLab (corrección Sprint 3: la 2a pasada solo usaba
 * Lucide dentro de una placa inspirada en PixelLab — esto sustituye esa
 * placa por el sprite aprobado, elegido segun el tema activo).
 *
 * Cada PNG fuente (`Icons/ecommerce-icons-{categories,commerce,utility}-*`)
 * ya trae su propio marco/placa metalica recortado: por eso este componente
 * NO envuelve el `<img>` en otro marco -haria un marco dentro de otro marco-,
 * solo fija tamaño y `image-rendering: pixelated` para que el pixel art no
 * se difumine al escalar.
 *
 * Puramente decorativo (`aria-hidden`, `alt=""`): el elemento que lo usa
 * (boton, label) sigue llevando su propio `aria-label`/texto/`aria-pressed`.
 */
export const MarketplacePixelIcon = ({
  icon,
  size = 'md',
  className,
}: MarketplacePixelIconProps): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  const heightPx = HEIGHT_PX[size]

  return (
    <img
      src={marketplaceIcons[icon][theme]}
      alt=""
      aria-hidden="true"
      style={{ height: heightPx, width: 'auto', imageRendering: 'pixelated' }}
      className={clsx('mk-pixel-icon shrink-0', className)}
    />
  )
}
