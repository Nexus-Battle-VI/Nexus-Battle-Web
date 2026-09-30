import clsx from 'clsx'

import { useTheme } from '@/shared/theme'
import { battleIcons, type BattleIconName } from './battleRemasterAssets'

export type BattlePixelIconSize = 'sm' | 'md' | 'lg' | 'xl'

export interface BattlePixelIconProps {
  readonly icon: BattleIconName
  readonly size?: BattlePixelIconSize
  readonly className?: string
}

/** Mismo criterio que `MarketplacePixelIcon` (E-commerce): solo se fija el
 * ALTO, el ancho es `auto`, para no deformar recortes que no son cuadrados. */
const HEIGHT_PX: Readonly<Record<BattlePixelIconSize, number>> = {
  sm: 22,
  md: 28,
  lg: 40,
  xl: 56,
}

/**
 * Icono real de PixelLab para "Jugar Online" (remaster visual Sprint 3).
 * Cada PNG fuente ya trae su propia placa/marco recortado: no se envuelve en
 * otro contenedor. Puramente decorativo (`aria-hidden`, `alt=""`): el
 * elemento que lo usa sigue llevando su propio texto/`aria-label`.
 */
export const BattlePixelIcon = ({
  icon,
  size = 'md',
  className,
}: BattlePixelIconProps): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  const heightPx = HEIGHT_PX[size]

  return (
    <img
      src={battleIcons[icon][theme]}
      alt=""
      aria-hidden="true"
      style={{ height: heightPx, width: 'auto', imageRendering: 'auto' }}
      className={clsx('br-pixel-icon shrink-0', className)}
    />
  )
}
