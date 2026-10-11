import clsx from 'clsx'

import { HERO_IDS, HeroSprite, type SpriteDirection } from '@/shared/visual-library/heroes'

/**
 * Como esta el formulario al que acompana el desfile. Es lo UNICO que el
 * desfile sabe: nunca recibe valores, campos ni el motivo de un error, asi que
 * no puede revelar que dato fallo ni reflejar nada de lo que se escribe.
 */
export type HeroParadeMood = 'idle' | 'typing' | 'error' | 'success'

export interface HeroParadeProps {
  readonly mood: HeroParadeMood
  /**
   * Contador que sube con cada momento (una pulsacion, un intento fallido).
   * Con el se elige a que heroe le toca reaccionar, de forma determinista.
   */
  readonly beat: number
  readonly className?: string
}

/** Vida simbolica: bajarla dispara la animacion de golpe que ya trae `HeroSprite`. */
const BASE_HEALTH = 100

/**
 * Desfile de los ocho heroes de la biblioteca visual (EN-026) al pie de las
 * pantallas de Login y Registro (remaster EN-031).
 *
 * - Al escribir, un heroe se gira hacia quien escribe.
 * - Ante un error, todos acusan el golpe (la animacion `hit` del sprite).
 * - Al terminar, celebran con un salto.
 *
 * Es decorativo (`aria-hidden`): no aporta informacion que no este en el
 * formulario. Con movimiento reducido no hay salto, y `HeroSprite` ya detiene
 * sus propias animaciones.
 */
export const HeroParade = ({ mood, beat, className }: HeroParadeProps): React.JSX.Element => {
  const watcher = mood === 'typing' ? beat % HERO_IDS.length : -1
  const health = mood === 'error' ? BASE_HEALTH - (beat % BASE_HEALTH) - 1 : BASE_HEALTH

  return (
    <div
      aria-hidden="true"
      data-mood={mood}
      className={clsx('auth-parade', mood === 'success' && 'auth-parade--celebrate', className)}
    >
      {HERO_IDS.map((heroId, index) => {
        const direction: SpriteDirection = index === watcher ? 'south' : 'south-east'
        return (
          <div
            key={heroId}
            className="auth-parade-hero"
            data-watching={index === watcher}
            style={{ animationDelay: `${String(index * 70)}ms` }}
          >
            <HeroSprite heroId={heroId} direction={direction} health={health} />
          </div>
        )
      })}
    </div>
  )
}
