import { useTranslation } from 'react-i18next'

import './battle-rooms.css'
import { BattlePixelIcon, type BattlePixelIconProps } from './BattlePixelIcon'
import type { BattleRoomMode } from './types'

export type BattleRoomModeFilter = 'ALL' | BattleRoomMode

const OPTIONS: readonly {
  readonly value: BattleRoomModeFilter
  readonly label: string
  readonly icon: BattlePixelIconProps['icon']
}[] = [
  { value: 'ALL', label: 'battle:filters.ALL', icon: 'roomList' },
  { value: 'PVP', label: 'battle:filters.PVP', icon: 'pvp' },
  { value: 'PVE', label: 'battle:filters.PVE', icon: 'pve' },
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
 *
 * Remaster visual Sprint 3 (2a pasada, seccion 10 del brief): tres
 * SELECTORES CIRCULARES icon-only (`br-filter-chip`), no pestanas web
 * genericas. El icono es decorativo (`BattlePixelIcon`, `aria-hidden`); el
 * `aria-label`/`title` de cada boton sigue siendo texto real -- nunca se
 * pierde informacion esencial por quitar el texto visible.
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
      <div role="group" aria-label={t('battle:filters.label')} className="flex gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={mode === option.value}
            aria-label={t(option.label)}
            title={t(option.label)}
            onClick={() => {
              onModeChange(option.value)
            }}
            className="br-filter-chip"
          >
            <BattlePixelIcon icon={option.icon} size="sm" />
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--br-muted)' }}>
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
