import clsx from 'clsx'

import { useTheme } from '@/shared/theme'

import { navIcons, type NavIconName } from './shellRemasterAssets'

export type NavPixelIconSize = 'sm' | 'md' | 'lg' | 'xl'

/** Mismo criterio que `MissionPixelIcon`: solo se fija el ALTO. */
const HEIGHT_PX: Readonly<Record<NavPixelIconSize, number>> = {
  sm: 18,
  md: 24,
  lg: 36,
  xl: 52,
}

/**
 * Icono de PixelLab del armazon (navegacion, cajon movil, sonido). Puramente
 * decorativo (`aria-hidden`, `alt=""`): el control que lo acompana lleva su
 * propio nombre accesible.
 */
export const NavPixelIcon = ({
  icon,
  size = 'md',
  className,
}: {
  readonly icon: NavIconName
  readonly size?: NavPixelIconSize
  readonly className?: string | undefined
}): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  return (
    <img
      src={navIcons[icon][theme]}
      alt=""
      aria-hidden="true"
      style={{ height: HEIGHT_PX[size], width: 'auto' }}
      className={clsx('nb-pixel-icon', className)}
    />
  )
}
