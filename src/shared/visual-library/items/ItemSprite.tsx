import clsx from 'clsx'
import type { CSSProperties } from 'react'

import type { ItemSpriteSpec } from './item-sprites'
import './item-sprite.css'

export interface ItemSpriteProps {
  readonly spec: ItemSpriteSpec
  /** Nombre accesible (el del producto). */
  readonly label: string
  /** `false` muestra solo el primer fotograma (listas largas, miniaturas). */
  readonly animated?: boolean
  readonly className?: string
}

/** Ritmo de los sprites de objeto: mas pausado que el de los heroes. */
const FPS = 10

/**
 * Sprite animado de un producto, habilidad o epica (EN-031). Solo CSS: la tira
 * se recorre con `steps()` sobre `background-position`, en pixel art nitido. Se
 * pausa con la pestana oculta (`data-page-hidden`, ver `WorldBackdrop`) y con
 * movimiento reducido queda en el primer fotograma.
 */
export const ItemSprite = ({
  spec,
  label,
  animated = true,
  className,
}: ItemSpriteProps): React.JSX.Element => {
  const style = {
    '--item-sprite-image': `url("${spec.image}")`,
    '--item-sprite-count': spec.frames,
    '--item-sprite-duration': `${String(spec.frames / FPS)}s`,
  } as CSSProperties

  return (
    <span role="img" aria-label={label} className={clsx('item-sprite', className)} style={style}>
      <span className="item-sprite-frame" data-animated={animated && spec.frames > 1} />
    </span>
  )
}
