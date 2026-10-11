import clsx from 'clsx'

import { useTheme } from '@/shared/theme'

import { notificationIconSrc, type NotificationIconName } from './notificationIcons'

/**
 * Icono de PixelLab de una familia de notificaciones (EN-031). Decorativo
 * (`aria-hidden`, `alt=""`): la fila lleva la etiqueta del tipo como texto.
 */
export const NotificationPixelIcon = ({
  icon,
  size = 32,
  className,
}: {
  readonly icon: NotificationIconName
  readonly size?: number
  readonly className?: string | undefined
}): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  return (
    <img
      src={notificationIconSrc(icon, theme)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={clsx('nb-notice-icon', className)}
    />
  )
}
