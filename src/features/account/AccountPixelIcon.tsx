import clsx from 'clsx'

import { useTheme } from '@/shared/theme'
import { accountSectionIcons, type AccountSectionIconName } from './accountRemasterAssets'

export type AccountPixelIconSize = 'sm' | 'md' | 'lg'

export interface AccountPixelIconProps {
  readonly icon: AccountSectionIconName
  readonly size?: AccountPixelIconSize
  readonly className?: string
}

/** Mismo criterio que `BattlePixelIcon`/`MarketplacePixelIcon`: solo se fija
 * el ALTO, el ancho es `auto`, para no deformar un recorte que no es cuadrado. */
const HEIGHT_PX: Readonly<Record<AccountPixelIconSize, number>> = {
  sm: 22,
  md: 32,
  lg: 44,
}

/**
 * Icono de sección real del remaster de "Mi Cuenta" (Sprint 3). Siempre
 * decorativo (`aria-hidden`, `alt=""`): el elemento que lo usa conserva su
 * propio texto visible — los iconos nunca sustituyen al label (regla
 * explícita del brief de Mi Cuenta, sección 16/48).
 */
export const AccountPixelIcon = ({
  icon,
  size = 'md',
  className,
}: AccountPixelIconProps): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  const heightPx = HEIGHT_PX[size]

  return (
    <img
      src={accountSectionIcons[icon][theme]}
      alt=""
      aria-hidden="true"
      style={{ height: heightPx, width: 'auto' }}
      className={clsx('account-pixel-icon shrink-0', className)}
    />
  )
}
