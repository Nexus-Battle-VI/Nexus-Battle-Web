import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import type { BattleRoomMode } from './types'

export type BattleRoomModeFilter = 'ALL' | BattleRoomMode

/** `label` es la clave de traduccion de cada filtro. */
const OPTIONS: readonly { readonly value: BattleRoomModeFilter; readonly label: string }[] = [
  { value: 'ALL', label: 'battle:filters.ALL' },
  { value: 'PVP', label: 'battle:filters.PVP' },
  { value: 'PVE', label: 'battle:filters.PVE' },
]

export interface BattleRoomFiltersProps {
  readonly mode: BattleRoomModeFilter
  readonly onModeChange: (mode: BattleRoomModeFilter) => void
  readonly search: string
  readonly onSearchChange: (value: string) => void
}

/**
 * Filtro por modalidad y busqueda por ID, ambos client-side (HU-14.4,
 * seccion 11 de la auditoria): `GET /v1/combat/rooms` no acepta parametros de
 * consulta, asi que esto nunca dispara una peticion nueva.
 */
export const BattleRoomFilters = ({
  mode,
  onModeChange,
  search,
  onSearchChange,
}: BattleRoomFiltersProps): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div role="group" aria-label={t('battle:filters.label')} className="flex gap-1.5">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={mode === option.value}
            onClick={() => {
              onModeChange(option.value)
            }}
            className={clsx(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              mode === option.value
                ? 'bg-brand text-brand-ink'
                : 'bg-surface text-muted hover:text-ink',
            )}
          >
            {t(option.label)}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-muted">
        <span className="sr-only">{t('battle:filters.search')}</span>
        <input
          type="search"
          value={search}
          placeholder={t('battle:filters.searchPlaceholder')}
          onChange={(event) => {
            onSearchChange(event.target.value)
          }}
          className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand sm:w-56"
        />
      </label>
    </div>
  )
}
