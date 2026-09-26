import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { describeFailure } from '@/shared/i18n/errors'
import { countLabel } from '@/shared/i18n/format'
import { i18n } from '@/shared/i18n/i18n'
import { useLanguage } from '@/shared/i18n/language'
import { Hero3D, HERO_VISUAL_SPECS_BY_ID, type HeroId } from '@/shared/visual-library/heroes'

import type { AvailableHero, HeroReadiness } from '../heroSelectionApi'
import type { EquipmentSlotId } from './api'
import { EQUIPMENT_SLOTS } from './api'
import { slotLabel } from './slots'

export interface HeroManagerPanelProps {
  /** Heroes que el jugador POSEE (`GET /inventories/me/heroes`), sin depender del filtro del inventario. */
  readonly heroes: readonly AvailableHero[]
  readonly heroesLoading: boolean
  readonly heroesError: unknown
  /** Prototipos 3D del juego que el jugador todavia no posee (solo informativo). */
  readonly unavailableModels: readonly HeroId[]
  readonly activeRef: string | null
  readonly preparedRef: string | null
  readonly activeModel: HeroId
  readonly activeName: string | null
  /** Solo cuando el heroe activo es el preparado: elegibilidad que informa el servicio. */
  readonly readiness: HeroReadiness | null
  readonly preparing: boolean
  readonly prepareError: string | null
  readonly onChoose: (reference: string) => void
  readonly onPrepare: () => void
}

const isSlot = (value: string | null): value is EquipmentSlotId =>
  value !== null && (EQUIPMENT_SLOTS as readonly string[]).includes(value)

/**
 * A. Gestion del heroe (HU-07/HU-28).
 *
 * Lista compacta de los heroes propios, el heroe activo en 3D, su estado de
 * preparacion y la UNICA accion de cierre real: «Confirmar para batalla»
 * (`PUT .../heroes/selection`). No hay un «Guardar equipamiento»: cada ranura
 * se persiste al equiparla, y fingir un guardado en bloque mentiria.
 */
export const HeroManagerPanel = ({
  heroes,
  heroesLoading,
  heroesError,
  unavailableModels,
  activeRef,
  preparedRef,
  activeModel,
  activeName,
  readiness,
  preparing,
  prepareError,
  onChoose,
  onPrepare,
}: HeroManagerPanelProps): React.JSX.Element => {
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)
  const isPrepared = activeRef !== null && activeRef === preparedRef

  const blockerText = (blocker: HeroReadiness['blockers'][number]): string => {
    // En español, el detalle del servicio tal cual (nombra el producto); en otro
    // idioma, la descripcion por CODIGO, nunca comparando el texto.
    const key = `inventory:blockers.${blocker.code}`
    if (language === 'es' || !i18n.exists(key)) return blocker.detail
    const slot = isSlot(blocker.slot)
      ? slotLabel(blocker.slot)
      : t('inventory:blockers.unknownSlot')
    return t(key, { slot })
  }

  return (
    <section
      aria-labelledby="hero-manager-title"
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4"
    >
      <div>
        <h2 id="hero-manager-title" className="text-sm font-semibold text-ink">
          {t('inventory:hero.title')}
        </h2>
        <p className="mt-0.5 text-xs text-muted">{t('inventory:hero.subtitle')}</p>
      </div>

      {heroesLoading ? (
        <p role="status" className="text-xs text-muted">
          {t('inventory:hero.loading')}
        </p>
      ) : heroesError !== null && heroesError !== undefined ? (
        <p role="alert" className="text-xs text-danger">
          {describeFailure(heroesError, t, language)}
        </p>
      ) : heroes.length === 0 ? (
        <p className="text-xs text-muted">{t('inventory:hero.none')}</p>
      ) : (
        <ul
          aria-label={t('inventory:hero.listLabel')}
          className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto"
        >
          {heroes.map((hero) => {
            const active = hero.reference === activeRef
            const prepared = hero.reference === preparedRef

            return (
              <li key={hero.reference}>
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={
                    prepared
                      ? t('inventory:hero.selectPrepared', { name: hero.name })
                      : t('inventory:hero.select', { name: hero.name })
                  }
                  title={hero.name}
                  onClick={() => {
                    onChoose(hero.reference)
                  }}
                  className={clsx(
                    'inline-flex min-h-11 max-w-48 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    active
                      ? 'border-brand bg-brand/10 font-medium text-ink ring-1 ring-brand'
                      : 'border-border text-ink hover:border-brand',
                  )}
                >
                  <span className="truncate">{hero.name}</span>
                  {prepared && (
                    <span
                      aria-hidden="true"
                      className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success text-[10px] font-bold text-white"
                    >
                      ✓
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {unavailableModels.length > 0 && (
        <details className="text-xs text-muted">
          <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            {countLabel(t, 'inventory:hero.unavailableSummary', unavailableModels.length)}
          </summary>
          <ul className="mt-1 flex flex-wrap gap-1">
            {unavailableModels.map((id) => {
              const name = HERO_VISUAL_SPECS_BY_ID.get(id)?.displayName ?? id

              return (
                <li key={id}>
                  <button
                    type="button"
                    disabled
                    aria-label={t('inventory:hero.unavailable', { name })}
                    title={t('inventory:hero.unavailableTitle')}
                    className="cursor-not-allowed rounded border border-border px-2 py-1 opacity-60"
                  >
                    {name}
                  </button>
                </li>
              )
            })}
          </ul>
        </details>
      )}

      {activeRef === null ? (
        heroes.length > 0 && <p className="text-xs text-muted">{t('inventory:hero.choose')}</p>
      ) : (
        <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
          <Hero3D heroId={activeModel} className="mx-auto w-full max-w-44" />

          <div className="flex min-w-0 flex-col gap-2">
            <div>
              <p className="truncate text-base font-semibold text-ink" title={activeName ?? ''}>
                {activeName}
              </p>
              <span
                className={clsx(
                  'mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                  isPrepared ? 'bg-success/15 text-success' : 'bg-surface text-muted',
                )}
              >
                {isPrepared
                  ? t('inventory:hero.preparedBadge')
                  : t('inventory:hero.notPreparedBadge')}
              </span>
            </div>

            {isPrepared && readiness !== null && !readiness.ready && (
              <div role="status" className="rounded border border-danger/40 bg-surface p-2">
                <p className="text-xs font-semibold text-danger">{t('inventory:hero.notReady')}</p>
                <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-xs text-muted">
                  {readiness.blockers.map((blocker) => (
                    <li key={`${blocker.code}-${blocker.reference}`}>{blockerText(blocker)}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              disabled={preparing || isPrepared}
              onClick={onPrepare}
              className={clsx(
                'min-h-11 w-full rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {preparing
                ? t('inventory:hero.preparing')
                : isPrepared
                  ? t('inventory:hero.prepared')
                  : t('inventory:hero.prepare')}
            </button>
            {!isPrepared && <p className="text-xs text-muted">{t('inventory:hero.prepareHint')}</p>}
            {prepareError !== null && (
              <p role="alert" className="text-xs text-danger">
                {prepareError}
              </p>
            )}

            <p className="text-xs text-muted">{t('inventory:hero.autosave')}</p>
          </div>
        </div>
      )}
    </section>
  )
}
