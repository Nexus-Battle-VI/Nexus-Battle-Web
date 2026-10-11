import clsx from 'clsx'

import { useTheme } from '@/shared/theme'

import { missionIcons, type MissionIconName } from './missionsRemasterAssets'

export type MissionPixelIconSize = 'sm' | 'md' | 'lg' | 'xl'

/** Mismo criterio que `BattlePixelIcon`: solo se fija el ALTO. */
const HEIGHT_PX: Readonly<Record<MissionPixelIconSize, number>> = {
  sm: 18,
  md: 24,
  lg: 36,
  xl: 52,
}

/**
 * Icono de PixelLab de Misiones (remaster EN-031). Puramente decorativo
 * (`aria-hidden`, `alt=""`): el elemento que lo acompaña lleva su propio
 * texto.
 */
export const MissionPixelIcon = ({
  icon,
  size = 'md',
  className,
}: {
  readonly icon: MissionIconName
  readonly size?: MissionPixelIconSize
  readonly className?: string | undefined
}): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  return (
    <img
      src={missionIcons[icon][theme]}
      alt=""
      aria-hidden="true"
      style={{ height: HEIGHT_PX[size], width: 'auto' }}
      className={clsx('msn-icon', className)}
    />
  )
}
