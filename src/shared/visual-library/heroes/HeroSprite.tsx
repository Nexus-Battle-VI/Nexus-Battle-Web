import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Hero3D } from './Hero3D'
import { HERO_VISUAL_SPECS_BY_ID } from './hero-definitions'
import { heroSpriteSpec, spritePosition, spriteSequence } from './hero-sprite'
import type { HeroSpriteSpec, SpriteDirection } from './hero-sprite'
import './hero-sprite.css'

export interface HeroSpriteProps {
  readonly heroId: string
  readonly direction?: SpriteDirection
  /** Observed health only; visual feedback never determines damage or a result. */
  readonly health?: number | undefined
}
const Sprite = ({
  heroId,
  spec,
  direction,
  health,
}: HeroSpriteProps & { readonly spec: HeroSpriteSpec; readonly direction: SpriteDirection }) => {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const surface = useRef<HTMLSpanElement>(null)
  const previousHealth = useRef(health)
  const idle = spriteSequence(spec, direction, 'idle')
  const hit = spriteSequence(spec, direction, 'hit')

  useEffect(() => {
    const previous = previousHealth.current
    previousHealth.current = health
    if (
      !loaded ||
      health === undefined ||
      previous === undefined ||
      health >= previous ||
      hit === null ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    const frames = Array.from({ length: hit.count + 1 }, (_, index) => ({
      backgroundPosition: spritePosition(spec, hit, Math.min(index, hit.count - 1)),
      offset: index / hit.count,
      easing: 'steps(1, end)',
    }))
    const animation = surface.current?.animate(frames, { duration: (hit.count / 8) * 1000 })
    return () => {
      animation?.cancel()
    }
  }, [health, hit, loaded, spec])

  if (failed || idle === null) return <Hero3D heroId={heroId} />
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

/** Original PNG cells, at eight fps; keeps Hero3D as a safe loading-error fallback. */
export const HeroSprite = ({
  heroId,
  direction = 'south-east',
  health,
}: HeroSpriteProps): React.JSX.Element => {
  const spec = heroSpriteSpec(heroId)
  return spec === null ? (
    <Hero3D heroId={heroId} />
  ) : (
    <Sprite key={heroId} heroId={heroId} spec={spec} direction={direction} health={health} />
  )
}
