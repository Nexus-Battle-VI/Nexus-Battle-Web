import { Hero3D, HERO_VISUAL_SPECS_BY_ID } from '@/shared/visual-library/heroes'

import { heroIdFromReference, heroIdFromSubtype } from './equipment/heroSubtype'
import type { AvailableHero } from './heroSelectionApi'

export interface HeroViewportProps {
  readonly hero: AvailableHero | null
}

/**
 * Escenario del héroe elegido (HU-07).
 *
 * TRES DECISIONES QUE MERECEN EXPLICACIÓN:
 *
 * 1. **El modelo 3D solo se usa cuando existe de verdad.** `heroIdFromSubtype`
 *    devuelve `null` para un héroe que la biblioteca visual no conoce, y en ese
 *    caso se muestra la imagen que publica el catálogo. Forzar un modelo
 *    cualquiera enseñaría un héroe por otro; ocultar el hueco dejaría a un
 *    noveno héroe aprobado sin representación (CA-11).
 * 2. **El tinte del escenario se DERIVA del acento del héroe** en la biblioteca
 *    visual, no de una tabla de colores paralela. El diseño tiñe el viewport de
 *    naranja para el Mago Fuego y de verde para el Pícaro Machete; esos matices
 *    ya viven en `HERO_VISUAL_SPECS_BY_ID`, y duplicarlos aquí daría dos
 *    verdades sobre el color de un mismo héroe.
 * 3. **El nombre va sobre el escenario**, como en el diseño, pero con contraste
 *    real: el prototipo lo pinta casi del color del fondo y ahí no se lee. La
 *    banda sale de `surface`/`ink`, no de un negro fijo, para que funcione en
 *    los dos temas — un `bg-black/45` sería invisible sobre el fondo claro.
 */
export const HeroViewport = ({ hero }: HeroViewportProps): React.JSX.Element => {
  if (hero === null) {
    return (
      <div className="flex min-h-64 flex-1 items-center justify-center bg-surface p-6">
        <p className="max-w-xs text-center text-sm text-muted">
          Elige un héroe del catálogo para verlo y preparar su equipamiento.
        </p>
      </div>
    )
  }

  const modelId = heroIdFromSubtype(hero.subtype) ?? heroIdFromReference(hero.reference)
  const accent =
    modelId === null ? null : (HERO_VISUAL_SPECS_BY_ID.get(modelId)?.accentColor ?? null)

  return (
    <div className="relative flex min-h-64 flex-1 flex-col justify-end overflow-hidden bg-surface">
      <div className="flex flex-1 items-center justify-center p-4">
        {modelId === null ? (
          <img
            src={hero.imageUrl}
            alt={hero.name}
            className="max-h-72 w-auto max-w-full object-contain"
          />
        ) : (
          <Hero3D heroId={modelId} className="w-full max-w-xs" />
        )}
      </div>

      {accent !== null && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20 mix-blend-color"
          style={{ backgroundColor: accent }}
        />
      )}

      <p className="relative bg-surface/85 px-6 pt-6 pb-5 text-2xl font-bold text-ink backdrop-blur-sm">
        {hero.name}
      </p>
    </div>
  )
}
