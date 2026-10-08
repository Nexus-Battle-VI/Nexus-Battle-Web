import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { describeFailure } from '@/shared/i18n/errors'
import { countLabel } from '@/shared/i18n/format'
import { i18n } from '@/shared/i18n/i18n'
import { useLanguage } from '@/shared/i18n/language'
import { Hero3D, HERO_VISUAL_SPECS_BY_ID, type HeroId } from '@/shared/visual-library/heroes'

import { heroRoleEmblemSlug, heroRoleLabel } from '../heroRole'
import type {
  EquipmentCapacity,
  AvailableHero,
  HeroProgression,
  HeroReadiness,
} from '../heroSelectionApi'
import type { EquipmentSlotId, HeroEquipment } from './api'
import { EQUIPMENT_SLOTS } from './api'
import { HeroProgressionBar } from './HeroProgressionBar'
import { SlotGroupList } from './EquipmentSlots'
import { SLOT_META, type SlotMeta } from './slots'

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
  /** Subtipo del heroe activo, solo para el emblema de rol DECORATIVO (presentacion pura, ver `heroRole.ts`). `null` si aun no se resolvio. */
  readonly activeSubtype: string | null
  /**
   * Progresion INDIVIDUAL del heroe activo (HU-08). `null` solo cuando no hay
   * heroe activo: mientras exista uno, siempre tiene progresion -perezosa,
   * nivel 1 con 0 de experiencia si aun no gano ninguna-.
   */
  readonly activeProgression: HeroProgression | null
  /** Solo cuando el heroe activo es el preparado: elegibilidad que informa el servicio. */
  readonly readiness: HeroReadiness | null
  readonly preparing: boolean
  readonly prepareError: string | null
  readonly onChoose: (reference: string) => void
  readonly onPrepare: () => void

  // --- Equipamiento (HU-28), fusionado visualmente alrededor del heroe ---
  readonly equipment: HeroEquipment | undefined
  readonly selectedSlot: EquipmentSlotId | null
  readonly onSelectSlot: (slot: EquipmentSlotId) => void
  readonly onSelectEquippedItem: (itemId: string | null) => void
  readonly compatibleType: string | null
  /**
   * Drag & Drop (metodo ALTERNATIVO al click, que SIGUE intacto): se
   * dispara al soltar un producto arrastrado sobre una ranura compatible
   * -`EquipmentSlots` ya comprobo `productType === meta.productType` antes
   * de llamarlo-.
   */
  readonly onDropItem?: (slot: EquipmentSlotId, itemId: string, productType: string) => void
  readonly capacity: Readonly<Record<SlotMeta['group'], EquipmentCapacity>> | null
  /** HU-29: `true` mientras el héroe participa en una batalla activa. */
  readonly locked: boolean
  readonly equipping: boolean
}

const isSlot = (value: string | null): value is EquipmentSlotId =>
  value !== null && (EQUIPMENT_SLOTS as readonly string[]).includes(value)

const ARMOR_SLOTS = SLOT_META.filter((meta) => meta.group === 'armor')
const ARMOR_LEFT = ARMOR_SLOTS.slice(0, 3)
const ARMOR_RIGHT = ARMOR_SLOTS.slice(3, 6)

/**
 * A+B. Heroe y su equipamiento (HU-07/HU-28), fusionados en una sola
 * composicion visual: selector (dropdown real) -> escenario del heroe con la
 * armadura REAL alrededor (3 ranuras a la izquierda, 3 a la derecha -mismas
 * `SLOT_META`, sin inventar ninguna-) y armas/items debajo -> info compacta
 * del heroe (nombre+rol, insignia de preparado, nivel/XP, "Confirmar para
 * batalla", nota de autoguardado). El boton "Equipar", las Estadisticas y
 * los Efectos del equipamiento YA NO viven aqui: se muestran en la Ficha del
 * objeto (columna derecha) -- ver `ItemDetailPanel`/`PlayerInventoryPage`,
 * que son quienes de verdad reciben el click de "Equipar" (misma mutacion
 * real, una sola fuente de verdad, sin logica duplicada).
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
  activeSubtype,
  activeProgression,
  readiness,
  preparing,
  prepareError,
  onChoose,
  onPrepare,
  equipment,
  selectedSlot,
  onSelectSlot,
  onSelectEquippedItem,
  compatibleType,
  onDropItem,
  capacity,
  locked,
  equipping,
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
      ? t(`inventory:slots.${blocker.slot}`)
      : t('inventory:blockers.unknownSlot')
    return t(key, { slot })
  }

  const slotProps = {
    equipment,
    selectedSlot,
    disabled: equipping || locked,
    onSelectSlot,
    onSelectEquippedItem,
    compatibleType,
    onDropItem,
  }

  return (
    <section
      aria-labelledby="hero-manager-title"
      className="inventory-panel flex min-w-0 flex-col gap-3 p-4"
    >
      <div>
        <h2 id="hero-manager-title" className="text-sm font-semibold text-ink">
          {t('inventory:hero.title')}
        </h2>
        <span className="inventory-panel-divider" aria-hidden="true" />
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
        <select
          aria-label={t('inventory:hero.listLabel')}
          value={activeRef ?? ''}
          onChange={(event) => {
            onChoose(event.target.value)
          }}
          className="inventory-hero-select focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {activeRef === null && (
            <option value="" disabled>
              {t('inventory:hero.choose')}
            </option>
          )}
          {heroes.map((hero) => {
            const prepared = hero.reference === preparedRef

            return (
              <option key={hero.reference} value={hero.reference}>
                {prepared ? `${hero.name} ✓` : hero.name}
              </option>
            )
          })}
        </select>
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
        <>
          {locked && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-md border border-warning bg-warning/10 p-2 text-xs text-ink"
            >
              <img
                src="/assets/inventory/status-decorations/locked-badge-light.png"
                alt=""
                aria-hidden="true"
                className="inventory-status-icon inventory-status-icon--locked"
              />
              {t('inventory:equipment.battleLock.message')}
            </p>
          )}

          {/* Escenario del heroe + armadura real alrededor (3 ranuras a cada
           * lado desde `lg`; apiladas en pantallas angostas) + armas/items
           * debajo. Nunca se repite el nombre del heroe dentro del escenario
           * (`[&>p]:hidden` oculta el label que `Hero3D` repite por
           * defecto): el nombre vive UNA sola vez, en la info de abajo. */}
          <div className="inventory-hero-equip-grid">
            <div className="inventory-hero-equip-grid__armor-left">
              <SlotGroupList
                {...slotProps}
                group="armor"
                slots={ARMOR_LEFT}
                capacity={capacity?.armor ?? null}
                columns="grid-cols-1"
              />
            </div>

            <div className="inventory-hero-equip-grid__stage">
              <div className="inventory-hero-stage">
                {/*
                 * CORRECCION (4a/6a pasada): antes el heroe llenaba el 100%
                 * de alto del escenario y "pegaba" contra el marco, sin aire
                 * alrededor y tapando el fondo pintado. 60% (4a pasada)
                 * seguia sintiendose grande en Chrome; se reduce a ~48% de
                 * la altura util dentro de un contenedor ya centrado
                 * (`.inventory-hero-stage` es `flex` + `justify/align:
                 * center`) para que quede aire real arriba/lados/abajo y el
                 * fondo del escenario se reconozca sin esfuerzo.
                 */}
                <Hero3D heroId={activeModel} className="h-[48%] w-auto [&>p]:hidden" />
              </div>
            </div>

            <div className="inventory-hero-equip-grid__armor-right">
              <SlotGroupList
                {...slotProps}
                group="armor"
                slots={ARMOR_RIGHT}
                capacity={null}
                columns="grid-cols-1"
                hideHeader
              />
            </div>

            <div className="inventory-hero-equip-grid__weapons-items">
              <div className="grid grid-cols-2 gap-3">
                <SlotGroupList
                  {...slotProps}
                  group="weapons"
                  capacity={capacity?.weapons ?? null}
                  columns="grid-cols-2"
                />
                <SlotGroupList
                  {...slotProps}
                  group="items"
                  capacity={capacity?.items ?? null}
                  columns="grid-cols-2"
                />
              </div>
              <span id="equipment-slot-compatible" className="sr-only">
                {t('inventory:equipment.slotCompatible')}
              </span>
            </div>
          </div>

          {/* Info compacta del heroe: nombre+rol (UNICA aparicion), insignia
           * de preparado, nivel/XP, avisos de elegibilidad, "Confirmar para
           * batalla" y la nota de autoguardado. */}
          <div className="inventory-hero-info">
            <p className="flex items-center gap-1.5 text-base font-semibold text-ink">
              {activeSubtype !== null && heroRoleEmblemSlug(activeSubtype) !== null && (
                <img
                  src={`/assets/inventory/hero-selector/emblem-light-${heroRoleEmblemSlug(activeSubtype) ?? ''}.png`}
                  alt=""
                  aria-hidden="true"
                  className={`inventory-role-emblem inventory-role-emblem--${heroRoleEmblemSlug(activeSubtype) ?? ''}`}
                />
              )}
              <span className="truncate" title={activeName ?? ''}>
                {activeName}
              </span>
              {activeSubtype !== null && (
                <span className="shrink-0 text-xs font-normal text-muted">
                  ({heroRoleLabel(activeSubtype)})
                </span>
              )}
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

            {activeProgression !== null && (
              <div className="mt-2">
                <HeroProgressionBar progression={activeProgression} />
              </div>
            )}

            {isPrepared && readiness !== null && !readiness.ready && (
              <div role="status" className="mt-2 rounded border border-danger/40 bg-surface p-2">
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
                'inventory-btn-primary mt-2 min-h-11 w-full px-3 py-2 text-sm font-semibold',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              )}
            >
              {preparing
                ? t('inventory:hero.preparing')
                : isPrepared
                  ? t('inventory:hero.prepared')
                  : t('inventory:hero.prepare')}
            </button>
            {!isPrepared && (
              <p className="mt-1 text-xs text-muted">{t('inventory:hero.prepareHint')}</p>
            )}
            {prepareError !== null && (
              <p role="alert" className="text-xs text-danger">
                {prepareError}
              </p>
            )}

            <p className="mt-1 text-xs text-muted">{t('inventory:hero.autosave')}</p>
          </div>
        </>
      )}
    </section>
  )
}
