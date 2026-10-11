import clsx from 'clsx'

import { useTheme } from '@/shared/theme'

import { adminIcons, type AdminIconName } from './adminConsoleAssets'

export type AdminPixelIconSize = 'sm' | 'md' | 'lg' | 'xl'

/** Mismo criterio que los demas iconos de PixelLab: solo se fija el ALTO. */
const HEIGHT_PX: Readonly<Record<AdminPixelIconSize, number>> = {
  sm: 18,
  md: 24,
  lg: 36,
  xl: 52,
}

/**
 * Icono de PixelLab de una seccion de administracion (EN-031). Decorativo
 * (`aria-hidden`, `alt=""`): el control que lo acompana lleva su propio texto.
 */
export const AdminPixelIcon = ({
  icon,
  size = 'md',
  className,
}: {
  readonly icon: AdminIconName
  readonly size?: AdminPixelIconSize
  readonly className?: string | undefined
}): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  return (
    <img
      src={adminIcons[icon][theme]}
      alt=""
      aria-hidden="true"
      style={{ height: HEIGHT_PX[size], width: 'auto' }}
      className={clsx('ak-icon', className)}
    />
  )
}
