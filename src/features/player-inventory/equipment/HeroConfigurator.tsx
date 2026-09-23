import { useState } from 'react'
import clsx from 'clsx'

import { QueryState } from '@/components/ui/QueryState'
import { HttpError } from '@/lib/http'
import {
  Hero3D,
  HERO_IDS,
  HERO_VISUAL_SPECS_BY_ID,
  type HeroId,
} from '@/shared/visual-library/heroes'
import { describeSelectionFailure } from '../heroSelectionApi'
import { useHeroSelection, useSelectHero } from '../useHeroSelection'
import type { EquipmentSlotId } from './api'
import { EquipmentSlots } from './EquipmentSlots'
import { HeroStatsPanel } from './HeroStatsPanel'
import { heroIdFromReference } from './heroSubtype'
import { SLOT_META_BY_ID } from './slots'
import { useEquipItem, useHeroEquipment } from './useHeroEquipment'

/** Héroe que el jugador posee, tal como llega del listado del inventario. */
export interface OwnedHero {
  readonly reference: string
  readonly name: string
}

export interface HeroConfiguratorProps {
  readonly ownedHeroes: readonly OwnedHero[]
  /** Referencia del producto seleccionado en la rejilla, para equipar. */
  readonly selectedProductReference: string | null
  readonly selectedProductType: string | null
  readonly selectedSlot: EquipmentSlotId | null
  readonly onSelectSlot: (slot: EquipmentSlotId | null) => void
}

const heroModelId = (subtype: string, reference: string): HeroId => {
  const bySubtype = (HERO_IDS as readonly string[]).find(
    (id) => id.replace(/-/gu, '_').toUpperCase() === subtype,
  )
  return (heroIdFromReference(reference) ?? bySubtype ?? HERO_IDS[0]) as HeroId
}

/**
 * Configuración de equipamiento del héroe (HU-28), como evolución directa de la
 * ancla visual de HU-27.
 *
 * Muestra los ocho héroes de la biblioteca 3D; solo son seleccionables los que
 * el jugador posee en esta vista del inventario (no se finge propiedad). Al
 * elegir un héroe propio se consulta su equipamiento real. Elegir una ranura
 * realza en la rejilla los productos compatibles; con una ranura y un producto
 * compatible seleccionados, "Equipar" ejecuta la operación en el backend, que
 * vuelve a validar todo y devuelve el nuevo estado.
 *
 * CONSOLIDACIÓN DE "MI HÉROE" (2026-09-22): el héroe que se ve al entrar es el
 * REALMENTE preparado (`GET /inventories/me/heroes/selection`, HU-07), no
 * `null` -- ver `activeReference` abajo, mismo criterio de prioridad
 * (elección local > preparado > nada) que ya usaba `HeroSelectionView`. El
 * botón "Confirmar para batalla" invoca el mismo `PUT` que esa pantalla; esta
 * SIGUE SIENDO la única fuente de verdad (HU-07/HU-28), no se duplica.
 */
export const HeroConfigurator = ({
  ownedHeroes,
  selectedProductReference,
  selectedProductType,
  selectedSlot,
  onSelectSlot,
}: HeroConfiguratorProps): React.JSX.Element => {
  // Prioridad: una eleccion local explicita (recien pulsada) gana sobre el
  // heroe realmente preparado; sin ninguna de las dos, no hay nada activo.
  // Mismo criterio que ya usaba `HeroSelectionPage` (`activeReference`) --
  // aqui se reutiliza en vez de duplicarlo, ahora que ambas pantallas
  // necesitan lo mismo: mostrar el heroe preparado por defecto.
  const [chosenRef, setChosenRef] = useState<string | null>(null)

  const selectionQuery = useHeroSelection()
  const selectMutation = useSelectHero()
  const selection = selectionQuery.data ?? null
  const preparedRef = selection?.configuration.hero.reference ?? null
  const heroRef = chosenRef ?? preparedRef

  const ownedByHeroId = new Map<string, OwnedHero>(
    ownedHeroes.flatMap((hero) => {
      const id = heroIdFromReference(hero.reference)
      return id === null ? [] : [[id, hero]]
    }),
  )
  const otherOwned = ownedHeroes.filter((hero) => heroIdFromReference(hero.reference) === null)

  const equipmentQuery = useHeroEquipment(heroRef)
  const equipMutation = useEquipItem(heroRef)
  const equipment = equipmentQuery.data

  const activeModel: HeroId =
    equipment !== undefined
      ? heroModelId(equipment.hero.subtype, equipment.hero.reference)
      : heroRef !== null
        ? (heroIdFromReference(heroRef) ?? HERO_IDS[0])
        : HERO_IDS[0]

  const chooseHero = (reference: string): void => {
    setChosenRef(reference)
    onSelectSlot(null)
    equipMutation.reset()
    selectMutation.reset()
  }

  const confirmForBattle = (): void => {
    if (heroRef !== null) {
      selectMutation.mutate(heroRef)
    }
  }

  const slotMeta = selectedSlot === null ? null : SLOT_META_BY_ID.get(selectedSlot)
  const canEquip =
    heroRef !== null &&
    slotMeta !== null &&
    slotMeta !== undefined &&
    selectedProductReference !== null &&
    selectedProductType === slotMeta.productType &&
    !equipMutation.isPending

  const equipError = equipMutation.error
  const equipErrorMessage =
    equipError instanceof HttpError
      ? equipError.message
      : equipError != null
        ? 'No se pudo equipar el producto. Inténtalo de nuevo.'
        : null

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Configurar héroe</h2>
        <p className="mt-0.5 text-[11px] text-muted">
          Elige un héroe propio, una ranura y un producto compatible de tu inventario.
        </p>
      </div>

      <div>
        <p className="text-xs text-muted" id="hero-gallery-label">
          Héroes
        </p>
        <ul aria-labelledby="hero-gallery-label" className="mt-1 grid grid-cols-4 gap-1">
          {HERO_IDS.map((id) => {
            const owned = ownedByHeroId.get(id)
            const isActive = heroRef === owned?.reference
            const isPrepared = owned !== undefined && owned.reference === preparedRef
            const name = HERO_VISUAL_SPECS_BY_ID.get(id)?.displayName ?? id

            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={owned === undefined}
                  aria-pressed={isActive}
                  aria-label={
                    owned === undefined
                      ? `${name}: no disponible`
                      : isPrepared
                        ? `Seleccionar ${name} (preparado para batalla)`
                        : `Seleccionar ${name}`
                  }
                  title={owned === undefined ? 'No dispones de este héroe' : name}
                  onClick={() => {
                    if (owned !== undefined) chooseHero(owned.reference)
                  }}
                  className={clsx(
                    'relative w-full rounded border p-0.5 text-center transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                    isActive
                      ? 'border-brand ring-1 ring-brand'
                      : 'border-border hover:border-brand',
                  )}
                >
                  {isPrepared && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success text-[9px] font-bold text-white"
                    >
                      ✓
                    </span>
                  )}
                  <span className="block text-[10px] leading-tight text-ink">{name}</span>
                </button>
              </li>
            )
          })}
        </ul>

        {otherOwned.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1" aria-label="Otros héroes propios">
            {otherOwned.map((hero) => (
              <li key={hero.reference}>
                <button
                  type="button"
                  aria-pressed={heroRef === hero.reference}
                  onClick={() => {
                    chooseHero(hero.reference)
                  }}
                  className={clsx(
                    'rounded border px-2 py-1 text-[11px] transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    heroRef === hero.reference
                      ? 'border-brand ring-1 ring-brand'
                      : 'border-border hover:border-brand',
                  )}
                >
                  {hero.name}
                  {hero.reference === preparedRef && ' ✓'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {ownedHeroes.length === 0 && (
        <p className="text-xs text-muted">
          No tienes héroes en esta vista del inventario. Ajusta la búsqueda o el filtro para verlos.
        </p>
      )}

      {heroRef !== null && (
        <>
          <Hero3D heroId={activeModel} className="mx-auto w-full max-w-40" />

          <QueryState isLoading={equipmentQuery.isLoading} error={equipmentQuery.error}>
            {equipment !== undefined && (
              <div className="flex flex-col gap-3">
                <EquipmentSlots
                  equipment={equipment}
                  selectedSlot={selectedSlot}
                  disabled={equipMutation.isPending}
                  onSelectSlot={(slot) => {
                    onSelectSlot(slot === selectedSlot ? null : slot)
                    equipMutation.reset()
                  }}
                />

                {slotMeta !== null && slotMeta !== undefined && (
                  <div className="rounded border border-border p-2 text-xs">
                    <p className="text-muted">
                      Ranura <span className="text-ink">{slotMeta.label}</span>. Elige un producto
                      de tipo <span className="text-ink">{slotMeta.productType}</span> en tu
                      inventario.
                    </p>
                    <button
                      type="button"
                      disabled={!canEquip}
                      onClick={() => {
                        if (canEquip) {
                          equipMutation.mutate({
                            slot: slotMeta.id,
                            productReference: selectedProductReference,
                          })
                        }
                      }}
                      className={clsx(
                        'mt-2 rounded bg-brand px-3 py-1.5 text-xs font-semibold text-white',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    >
                      {equipMutation.isPending ? 'Equipando…' : 'Equipar'}
                    </button>
                    {equipErrorMessage !== null && (
                      <p role="alert" className="mt-1 text-danger">
                        {equipErrorMessage}
                      </p>
                    )}
                  </div>
                )}

                <HeroStatsPanel equipment={equipment} />

                <div className="rounded border border-border p-2 text-xs">
                  {heroRef === preparedRef && selection !== null && !selection.readiness.ready && (
                    <div
                      role="status"
                      className="mb-2 rounded border border-danger/40 bg-surface p-2"
                    >
                      <p className="font-semibold text-danger">
                        Este héroe todavía no puede entrar a una batalla.
                      </p>
                      <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-[11px] text-muted">
                        {selection.readiness.blockers.map((blocker) => (
                          <li key={`${blocker.code}-${blocker.reference}`}>{blocker.detail}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={selectMutation.isPending || heroRef === preparedRef}
                    onClick={confirmForBattle}
                    className={clsx(
                      'w-full rounded bg-brand px-3 py-1.5 text-xs font-semibold text-white',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    {selectMutation.isPending
                      ? 'Confirmando…'
                      : heroRef === preparedRef
                        ? 'Preparado para batalla ✓'
                        : 'Confirmar para batalla'}
                  </button>

                  {selectMutation.isError && (
                    <p role="alert" className="mt-1 text-danger">
                      {describeSelectionFailure(selectMutation.error)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </QueryState>
        </>
      )}
    </div>
  )
}
