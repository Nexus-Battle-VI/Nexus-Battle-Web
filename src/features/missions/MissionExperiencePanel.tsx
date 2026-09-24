import { useId } from 'react'
import clsx from 'clsx'

import { Star, TrendingUp } from '@/components/ui/icons'

import type { MissionReportRewardLine } from './api'
import {
  creditedText,
  currentXpText,
  defeatsText,
  describeExperience,
  experienceGainedText,
  levelText,
  levelUpText,
  lineStateText,
} from './experiencePresentation'
import type { MissionExperience } from './missionReport'

export interface MissionExperiencePanelProps {
  readonly experience: MissionExperience | null
  /** Las líneas `EXPERIENCE` del informe, en el orden en que las publica Missions. */
  readonly lines: readonly MissionReportRewardLine[]
}

/**
 * La experiencia de una misión terminada (HU-09, Task HU-09.5), tal como la
 * publica el informe de HU-74.
 *
 * NO CALCULA NADA: la experiencia acreditada, el nivel del héroe y los niveles
 * cruzados llegan resueltos del servicio; aquí solo se eligen las palabras y se
 * elige qué se muestra (el detalle por derrota, dentro de un desplegable).
 *
 * LAS TRES SITUACIONES SE DISTINGUEN A TEXTO, nunca solo por color:
 *
 * - todavía sin acreditar (`PENDING`): las derrotas están registradas y la
 *   experiencia está en camino;
 * - acreditada (`CREDITED`), en todo o en parte;
 * - con alguna derrota sin acreditar (`FAILED`): se dice cuántas, porque una
 *   experiencia que no llegó no puede parecer entregada.
 *
 * `experience === null` (informe de un servicio anterior a esta task) y una misión
 * sin derrotas se dicen por separado: son cosas distintas y ninguna es un error.
 */
export const MissionExperiencePanel = ({
  experience,
  lines,
}: MissionExperiencePanelProps): React.JSX.Element => {
  const headingId = useId()
  const presentation = experience === null ? null : describeExperience(experience)
  const level = experience === null ? null : levelText(experience)
  const levelUp = experience === null ? null : levelUpText(experience)
  const currentXp = experience === null ? null : currentXpText(experience)

  return (
    <section
      aria-labelledby={headingId}
      className={clsx(
        'flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-4',
        'motion-safe:transition-shadow motion-safe:duration-500',
      )}
    >
      <h2 id={headingId} className="text-lg font-semibold text-ink">
        Experiencia
      </h2>

      {experience === null && (
        <p className="text-sm text-muted">Este informe no incluye el resumen de experiencia.</p>
      )}

      {experience !== null && experience.defeats === 0 && (
        <p className="text-sm text-muted">
          Esta misión no registró derrotas: no hay experiencia que acreditar.
        </p>
      )}

      {experience !== null && experience.defeats > 0 && (
        <>
          {/* Un "+0 XP" se leeria como una mision que no dio nada; mientras no haya
              nada acreditado, se dice exactamente eso. */}
          {experience.totalXp > 0 ? (
            <p
              role="status"
              className="flex items-center justify-center gap-2 text-lg font-bold text-ink"
            >
              <Star aria-hidden="true" className="h-5 w-5 text-brand" />
              {experienceGainedText(experience)}
            </p>
          ) : (
            <p role="status" className="text-center text-sm text-muted">
              Todavía no hay experiencia acreditada.
            </p>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Derrotas con experiencia</span>
            <span className="tabular-nums font-semibold text-ink">{creditedText(experience)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Derrotas registradas</span>
            <span className="font-semibold text-ink">{defeatsText(experience)}</span>
          </div>

          {level !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Héroe</span>
              <span className="font-semibold text-ink">{level}</span>
            </div>
          )}

          {currentXp !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Experiencia acumulada</span>
              <span className="tabular-nums font-semibold text-ink">{currentXp}</span>
            </div>
          )}

          {levelUp !== null && (
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-brand">
              <TrendingUp aria-hidden="true" className="h-4 w-4" />
              {levelUp}
            </p>
          )}

          {presentation !== null && (
            <div
              role="status"
              className={clsx(
                'flex flex-col gap-1 rounded-lg border-2 p-3 text-center',
                presentation.state === 'FAILED' ? 'border-danger' : 'border-muted',
              )}
            >
              {/* El color solo refuerza: el titular y el detalle ya dicen lo mismo
                  con palabras. */}
              <p className="font-bold text-ink">{presentation.headline}</p>
              <p className="text-sm text-muted">{presentation.detail}</p>
            </div>
          )}

          {lines.length > 0 && (
            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                Detalle por derrota
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {lines.map((line) => (
                  <li
                    key={line.reference ?? line.name}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-ink">{line.name}</span>
                    <span className="flex items-center gap-2 text-muted">
                      {/* La XP de una línea es su cantidad: Missions la escribe al
                          acreditarla, y la línea pendiente todavía no la tiene. */}
                      <span className="tabular-nums">
                        {line.status === 'CREDITED' ? `+${String(line.quantity)} XP` : '—'}
                      </span>
                      <span>{lineStateText(line.status)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  )
}
