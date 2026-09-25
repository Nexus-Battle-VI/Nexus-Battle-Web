import { useId } from 'react'
import clsx from 'clsx'

import type { DifficultyLevel, MissionDifficulty } from './api'
import {
  compositionTexts,
  difficultyName,
  enemyScalingText,
  rewardTierText,
} from './difficultyPresentation'
import { useTranslation } from 'react-i18next'

export interface DifficultySelectorProps {
  readonly items: readonly MissionDifficulty[]
  readonly value: DifficultyLevel | null
  readonly onChange: (level: DifficultyLevel) => void
}

/**
 * Selector de dificultad de una mision (Task HU-75.3).
 *
 * NO DECIDE NADA: si un nivel esta libre o bloqueado, y por que, llega resuelto
 * de Missions (`unlocked`, `lockReason`). Impedir elegir un nivel bloqueado es
 * solo una ayuda: la validacion real ocurre en el servicio al matricular
 * (`422 PROGRESSION_LOCKED`).
 *
 * Cada opcion es un `<button role="radio">`, como `SelectableCard` de Jugar
 * Online: teclado y foco nativos. Un nivel bloqueado usa `aria-disabled` y no
 * `disabled`, para que siga siendo alcanzable con el teclado y el lector de
 * pantalla lea el motivo, enlazado con `aria-describedby`.
 *
 * La rejilla se adapta al ancho con `auto-fit`, sin breakpoints propios
 * (docs/frontend/base-responsive.md). Verificado a 1360x768 contra Missions
 * real: cuatro columnas sin desbordes y contraste AA en todos los textos.
 */
export const DifficultySelector = ({
  items,
  value,
  onChange,
}: DifficultySelectorProps): React.JSX.Element => {
  const labelId = useId()
  const { t } = useTranslation()

  return (
    <div role="radiogroup" aria-labelledby={labelId} className="flex flex-col gap-3">
      <h3 id={labelId} className="text-sm font-semibold text-ink">
        {t('missions:selector.title')}
      </h3>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-3">
        {items.map((item) => (
          <DifficultyOption
            key={item.difficulty}
            item={item}
            selected={value === item.difficulty}
            onSelect={() => {
              onChange(item.difficulty)
            }}
          />
        ))}
      </div>
    </div>
  )
}

interface DifficultyOptionProps {
  readonly item: MissionDifficulty
  readonly selected: boolean
  readonly onSelect: () => void
}

const DifficultyOption = ({
  item,
  selected,
  onSelect,
}: DifficultyOptionProps): React.JSX.Element => {
  const nameId = useId()
  const detailId = useId()
  const { t } = useTranslation()
  const locked = !item.unlocked

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={locked}
      aria-labelledby={nameId}
      aria-describedby={detailId}
      onClick={() => {
        if (!locked) {
          onSelect()
        }
      }}
      className={clsx(
        'flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors motion-safe:duration-150 motion-safe:ease-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        // Sin `opacity`: atenuar toda la tarjeta bajaba el texto pequeno a 3,5:1,
        // por debajo de WCAG AA. El bloqueo se comunica con la etiqueta, el borde
        // discontinuo y el motivo, nunca solo con color ni con transparencia.
        locked && 'cursor-not-allowed border-dashed border-border bg-surface',
        !locked && 'motion-safe:active:scale-[0.98]',
        !locked &&
          (selected
            ? 'border-brand bg-brand/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
            : 'border-border bg-surface hover:border-brand/50 hover:bg-surface-raised'),
      )}
    >
      <span className="flex items-center justify-between gap-2">
        {/* Siempre en tinta: el color de marca sobre su propio tinte no llega a AA.
            La eleccion se ve en el borde y el fondo, y se anuncia con `aria-checked`. */}
        <span id={nameId} className="text-sm font-semibold text-ink">
          {difficultyName(item.difficulty)}
        </span>
        <span
          className={clsx(
            // Tinte de StatusBadge con texto en tinta: su texto de color queda en
            // torno a 2,8:1 en tema claro, por debajo de WCAG AA.
            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-ink',
            locked ? 'bg-warning/15' : 'bg-success/15',
          )}
        >
          {locked ? t('missions:selector.locked') : t('missions:selector.available')}
        </span>
      </span>
      <span id={detailId} className="flex flex-col gap-0.5 text-xs text-muted">
        <span>{enemyScalingText(item.enemyStatMultiplier)}</span>
        {compositionTexts(item).map((text) => (
          <span key={text}>{text}</span>
        ))}
        <span>{rewardTierText(item.rewardTier)}</span>
        {item.lockReason !== null && <span className="text-ink">{item.lockReason}</span>}
      </span>
    </button>
  )
}
