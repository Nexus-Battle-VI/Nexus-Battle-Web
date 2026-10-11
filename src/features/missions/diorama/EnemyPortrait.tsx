import clsx from 'clsx'

import type { ProgressRole } from '../missionPlayApi'
import { enemySpriteFor } from '../missionsRemasterAssets'

const SIZE_PX = { md: 44, lg: 64 } as const

/**
 * Las celdas de PixelLab dejan mucho margen alrededor de la figura: el retrato
 * amplia el primer fotograma y lo centra en la caja.
 */
const ZOOM = 1.6
const OFFSET = (ZOOM - 1) / 2

/**
 * Retrato de un enemigo, jefe o Máster: el primer fotograma de su sprite de
 * PixelLab o, si el nombre no tiene arte propio, el de su rol. Decorativo: el
 * nombre siempre va en el texto de al lado.
 */
export const EnemyPortrait = ({
  name,
  role,
  size = 'md',
}: {
  readonly name: string
  readonly role: ProgressRole
  readonly size?: keyof typeof SIZE_PX
}): React.JSX.Element => {
  const sprite = enemySpriteFor(name, role)
  const px = SIZE_PX[size]
  return (
    <span
      aria-hidden="true"
      data-sprite={sprite.idle}
      className={clsx('msn-tile msn-portrait inline-block shrink-0', `msn-portrait--${role}`)}
      style={{
        width: px,
        height: px,
        backgroundImage: `url("${sprite.idle}")`,
        backgroundSize: `${String(sprite.frames.idle * ZOOM * 100)}% ${String(ZOOM * 100)}%`,
        backgroundPosition: `-${String(px * OFFSET)}px -${String(px * OFFSET)}px`,
      }}
    />
  )
}
