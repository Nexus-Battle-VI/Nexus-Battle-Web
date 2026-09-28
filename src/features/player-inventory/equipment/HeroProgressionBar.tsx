import { useTranslation } from 'react-i18next'

import { formatInteger } from '@/shared/i18n/format'

import type { HeroProgression } from '../heroSelectionApi'
import { presentHeroProgression } from './heroProgressionPresentation'

export interface HeroProgressionBarProps {
  /** Progresion INDIVIDUAL del heroe activo (HU-08). Nunca la del jugador. */
  readonly progression: HeroProgression
}

/**
 * Nivel, experiencia acumulada y barra de progreso del heroe activo (HU-08,
 * Task HU-09.5). Presenta EXACTAMENTE lo que Player/Inventory calculo -ningun
 * umbral ni formula se reproduce aqui, ver `heroProgressionPresentation.ts`-.
 *
 * La barra es accesible: `role="progressbar"` con `aria-valuemin/max/now` y un
 * texto visible al lado (`xpToNext`/`maxLevel`) que no depende solo del color
 * ni del ancho para comunicar el progreso.
 */
export const HeroProgressionBar = ({ progression }: HeroProgressionBarProps): React.JSX.Element => {
  const { t } = useTranslation()
  const presentation = presentHeroProgression(progression)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-ink">
          {t('inventory:hero.progression.level', { level: presentation.level })}
        </span>
        <span className="text-muted">
          {presentation.isMaxLevel
            ? t('inventory:hero.progression.maxLevel')
            : t('inventory:hero.progression.xpToNext', {
                current: formatInteger(presentation.xpIntoLevel),
                required: formatInteger(presentation.xpRequiredForLevel ?? 0),
                level: presentation.nextLevel,
              })}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={t('inventory:hero.progression.barLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={presentation.percent}
        className="h-2 w-full overflow-hidden rounded-full bg-border"
      >
        <div
          className="h-full rounded-full bg-brand motion-safe:transition-[width] motion-safe:duration-700"
          style={{ width: `${String(presentation.percent)}%` }}
        />
      </div>

      <p className="text-[11px] text-muted">
        {t('inventory:hero.progression.xpAccumulated', {
          value: formatInteger(presentation.currentXp),
        })}
      </p>
    </div>
  )
}
