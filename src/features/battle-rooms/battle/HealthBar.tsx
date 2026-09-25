import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { healthFraction, healthTone, type HealthTone } from './presentation'
import type { HealthView } from './types'

const TONE_CLASS: Readonly<Record<HealthTone, string>> = {
  high: 'bg-success',
  medium: 'bg-warning',
  low: 'bg-danger',
}

export interface HealthBarProps {
  readonly name: string
  /** La Vida que publica Combat; `null` si el participante no tiene perfil de combate. */
  readonly health: HealthView | null
}

/**
 * Vida de un combatiente (HU-18): texto `32 / 44` + barra. El TEXTO es lo que comunica
 * la Vida; el color (verde por encima del 60 %, amarillo entre el 40 % y el 60 %, rojo por
 * debajo del 40 %, §7.6 del documento oficial) solo la refuerza y nunca es el unico medio.
 *
 * La barra es un `meter` accesible con su valor y su texto. El cambio de ancho se anima
 * solo si el usuario no pidio movimiento reducido (`motion-safe`). Pinta lo que Combat
 * publico: no calcula ni resta Vida.
 */
export const HealthBar = ({ name, health }: HealthBarProps): React.JSX.Element => {
  const { t } = useTranslation()

  if (health === null) {
    return <p className="text-center text-xs text-muted">{t('battle:health.unavailable')}</p>
  }

  const tone = healthTone(health)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-muted">{t('battle:health.label')}</span>
        <span className="font-semibold tabular-nums text-ink">
          {health.current} / {health.max}
        </span>
      </div>
      <div
        role="meter"
        aria-label={t('battle:health.of', { name })}
        aria-valuemin={0}
        aria-valuemax={health.max}
        aria-valuenow={health.current}
        aria-valuetext={t('battle:health.spoken', {
          current: String(health.current),
          max: String(health.max),
        })}
        className="h-2.5 w-full overflow-hidden rounded-full border border-muted bg-surface"
      >
        <div
          className={clsx(
            'h-full rounded-full',
            TONE_CLASS[tone],
            'motion-safe:transition-[width] motion-safe:duration-500',
          )}
          style={{ width: `${String(healthFraction(health) * 100)}%` }}
        />
      </div>
      {health.current === 0 && (
        <p className="text-center text-xs font-semibold text-danger">{t('battle:health.none')}</p>
      )}
    </div>
  )
}
