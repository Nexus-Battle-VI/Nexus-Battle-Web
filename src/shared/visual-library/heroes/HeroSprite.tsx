import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { HERO_VISUAL_SPECS_BY_ID } from './hero-definitions'
import { heroSpriteSpec, spritePosition, spriteSequence } from './hero-sprite'
import type { HeroSpriteSpec, SpriteDirection, SpriteSequence } from './hero-sprite'
import './hero-sprite.css'

export interface HeroSpriteProps {
  readonly heroId: string
  readonly direction?: SpriteDirection
  /** Observed health only; visual feedback never determines damage or a result. */
  readonly health?: number | undefined
  /**
   * EN-031: cambia (p. ej. el `seq` del ultimo evento) cuando ESTE heroe acaba de
   * actuar; entonces se reproduce su animacion de ataque una vez. Solo presentacion.
   */
  readonly attackSignal?: number | undefined
}

/** Reproduce una secuencia una sola vez sobre el fondo del sprite, sin tocar su bucle de reposo. */
const playOnce = (
  surface: RefObject<HTMLSpanElement | null>,
  spec: HeroSpriteSpec,
  sequence: SpriteSequence,
): (() => void) => {
  const frames = Array.from({ length: sequence.count + 1 }, (_, index) => ({
    backgroundPosition: spritePosition(spec, sequence, Math.min(index, sequence.count - 1)),
    offset: index / sequence.count,
    easing: 'steps(1, end)',
  }))
  const animation = surface.current?.animate(frames, { duration: (sequence.count / 8) * 1000 })
  return () => {
    animation?.cancel()
  }
}

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const Sprite = ({
  heroId,
  spec,
  direction,
  health,
  attackSignal,
}: HeroSpriteProps & { readonly spec: HeroSpriteSpec; readonly direction: SpriteDirection }) => {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const surface = useRef<HTMLSpanElement>(null)
  const previousHealth = useRef(health)
  const previousAttack = useRef(attackSignal)
  const idle = spriteSequence(spec, direction, 'idle')
  const hit = spriteSequence(spec, direction, 'hit')
  const attack = spriteSequence(spec, direction, 'attack')

  useEffect(() => {
    const previous = previousHealth.current
    previousHealth.current = health
    if (
      !loaded ||
      health === undefined ||
      previous === undefined ||
      health >= previous ||
      hit === null ||
      reducedMotion()
    ) {
      return
    }
    return playOnce(surface, spec, hit)
  }, [health, hit, loaded, spec])

  useEffect(() => {
    const previous = previousAttack.current
    previousAttack.current = attackSignal
    if (
      !loaded ||
      attackSignal === undefined ||
      attackSignal === previous ||
      attack === null ||
      reducedMotion()
    ) {
      return
    }
    return playOnce(surface, spec, attack)
  }, [attackSignal, attack, loaded, spec])

  if (failed || idle === null) return <MissingHero heroId={heroId} />
  const style = {
    backgroundImage: `url("${spec.image}")`,
    backgroundSize: `${String((spec.sheet.width / spec.cell.width) * 100)}% ${String((spec.sheet.height / spec.cell.height) * 100)}%`,
    backgroundPosition: spritePosition(spec, idle, 0),
    '--hero-sprite-start': spritePosition(spec, idle, 0),
    '--hero-sprite-end': spritePosition(spec, idle, idle.count),
    '--hero-sprite-duration': `${String(idle.count / 8)}s`,
    '--hero-sprite-count': idle.count,
  } as CSSProperties
  return (
    <div
      className="hero-sprite"
      role="img"
      aria-label={HERO_VISUAL_SPECS_BY_ID.get(heroId)?.displayName ?? spec.name}
      data-hero={heroId}
      data-direction={direction}
      data-defeated={health === 0}
      data-loaded={loaded}
    >
      <img
        src={spec.image}
        alt=""
        hidden
        onLoad={() => {
          setLoaded(true)
        }}
        onError={() => {
          setFailed(true)
        }}
      />
      <span
        ref={surface}
        className="hero-sprite-frame"
        data-animated={idle.count > 1}
        style={style}
        aria-hidden="true"
      />
    </div>
  )
}

/**
 * EN-031: si el PNG no carga (o el heroe no tiene sprite) se muestra un hueco con
 * el nombre accesible, nunca un render 3D (Three.js se retiro).
 */
const MissingHero = ({ heroId }: { readonly heroId: string }): React.JSX.Element => (
  <div
    className="hero-sprite hero-sprite-missing"
    role="img"
    aria-label={HERO_VISUAL_SPECS_BY_ID.get(heroId)?.displayName ?? heroId}
    data-hero={heroId}
  />
)

/** Celdas del PNG (originales del export y las añadidas en EN-031), a ocho fps. */
export const HeroSprite = ({
  heroId,
  direction = 'south-east',
  health,
  attackSignal,
}: HeroSpriteProps): React.JSX.Element => {
  const spec = heroSpriteSpec(heroId)
  return spec === null ? (
    <MissingHero heroId={heroId} />
  ) : (
    <Sprite
      key={heroId}
      heroId={heroId}
      spec={spec}
      direction={direction}
      health={health}
      attackSignal={attackSignal}
    />
  )
}
