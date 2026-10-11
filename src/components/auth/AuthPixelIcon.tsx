import clsx from 'clsx'

import { useTheme } from '@/shared/theme'

import { authIcons, type AuthIconName } from './authRemasterAssets'

export type AuthPixelIconSize = 'sm' | 'md' | 'lg' | 'xl'

/** Mismo criterio que `MissionPixelIcon`: solo se fija el ALTO. */
const HEIGHT_PX: Readonly<Record<AuthPixelIconSize, number>> = {
  sm: 18,
  md: 24,
  lg: 36,
  xl: 52,
}

/**
 * Icono de PixelLab de Autenticacion (remaster EN-031). Puramente decorativo
 * (`aria-hidden`, `alt=""`): el control que lo acompana lleva su propio texto.
 */
export const AuthPixelIcon = ({
  icon,
  size = 'md',
  className,
}: {
  readonly icon: AuthIconName
  readonly size?: AuthPixelIconSize
  readonly className?: string | undefined
}): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  return (
    <img
      src={authIcons[icon][theme]}
      alt=""
      aria-hidden="true"
      style={{ height: HEIGHT_PX[size], width: 'auto' }}
      className={clsx('auth-icon', className)}
    />
  )
}
