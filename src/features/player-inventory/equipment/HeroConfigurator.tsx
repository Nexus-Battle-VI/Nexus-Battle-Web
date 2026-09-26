import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { HttpError } from '@/lib/http'
import { describeFailure } from '@/shared/i18n/errors'
import { useLanguage } from '@/shared/i18n/language'
import { HERO_IDS, type HeroId } from '@/shared/visual-library/heroes'

import { describeSelectionFailure } from '../heroSelectionApi'
import { useAvailableHeroes, useHeroSelection, useSelectHero } from '../useHeroSelection'
import type { EquipmentSlotId } from './api'
import { EquipmentManagerPanel } from './EquipmentManagerPanel'
import { HeroManagerPanel } from './HeroManagerPanel'
import { heroIdFromReference } from './heroSubtype'
import { SLOT_META_BY_ID } from './slots'
import { useEquipItem, useHeroEquipment } from './useHeroEquipment'

export interface HeroConfiguratorProps {
  /** Referencia del producto seleccionado en el inventario, para equipar. */
  readonly selectedProductReference: string | null
  readonly selectedProductName: string | null
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
 * Configuracion del heroe (HU-07/HU-28): coordina los cuadrantes A (gestion del
 * heroe) y B (gestor de equipamiento) de "Mi Inventario".
 *
 * Solo cambia la COMPOSICION; la autoridad sigue en Player-Inventory:
 * - Los heroes son los que el jugador POSEE (`GET /inventories/me/heroes`), no
 *   los que casualmente aparecen en la pagina filtrada del inventario.
 * - Al entrar se ve el heroe REALMENTE preparado (`GET .../heroes/selection`);
 *   una eleccion local explicita gana sobre el preparado.
 * - «Equipar» es `PUT .../equipment/:slot`: se persiste al instante, sin
 *   actualizacion optimista. «Confirmar para batalla» es `PUT .../selection`.
 * - Estadisticas, efectos, capacidad y elegibilidad se muestran tal cual llegan.
 */
export const HeroConfigurator = ({
  selectedProductReference,
  selectedProductName,
  selectedProductType,
  selectedSlot,
  onSelectSlot,
}: HeroConfiguratorProps): React.JSX.Element => {
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)
  const [chosenRef, setChosenRef] = useState<string | null>(null)

  const heroesQuery = useAvailableHeroes()
  const heroes = heroesQuery.data ?? []
  const selectionQuery = useHeroSelection()
  const selectMutation = useSelectHero()
  const selection = selectionQuery.data ?? null
  const preparedRef = selection?.configuration.hero.reference ?? null
  const heroRef = chosenRef ?? preparedRef
  const isPreparedActive = heroRef !== null && heroRef === preparedRef

  const equipmentQuery = useHeroEquipment(heroRef)
  const equipMutation = useEquipItem(heroRef)
  const equipment = equipmentQuery.data
  const activeHero = heroes.find((hero) => hero.reference === heroRef)

  const activeModel: HeroId =
    equipment !== undefined
      ? heroModelId(equipment.hero.subtype, equipment.hero.reference)
      : activeHero !== undefined
        ? heroModelId(activeHero.subtype, activeHero.reference)
        : heroRef !== null
          ? (heroIdFromReference(heroRef) ?? HERO_IDS[0])
          : HERO_IDS[0]
  const activeName =
    equipment?.hero.name ??
    activeHero?.name ??
    (isPreparedActive ? (selection?.configuration.hero.name ?? null) : null)

  // Prototipos 3D que el jugador aun no posee: solo informativos y compactos.
  const ownedModels = new Set(heroes.map((hero) => heroModelId(hero.subtype, hero.reference)))
  const unavailableModels =
    heroesQuery.data === undefined ? [] : HERO_IDS.filter((id) => !ownedModels.has(id))

  const chooseHero = (reference: string): void => {
    setChosenRef(reference)
    onSelectSlot(null)
    equipMutation.reset()
    selectMutation.reset()
  }

  const slotMeta = selectedSlot === null ? null : (SLOT_META_BY_ID.get(selectedSlot) ?? null)
  const canEquip =
    heroRef !== null &&
    slotMeta !== null &&
    selectedProductReference !== null &&
    selectedProductType === slotMeta.productType &&
    !equipMutation.isPending

  const equipError = equipMutation.error
  const equipErrorMessage =
    equipError instanceof HttpError
      ? describeFailure(equipError, t, language)
      : equipError != null
        ? t('inventory:equipment.equipFailed')
        : null

  return (
    <>
      <HeroManagerPanel
        heroes={heroes}
        heroesLoading={heroesQuery.isLoading}
        heroesError={heroesQuery.error}
        unavailableModels={unavailableModels}
        activeRef={heroRef}
        preparedRef={preparedRef}
        activeModel={activeModel}
        activeName={activeName}
        readiness={isPreparedActive ? (selection?.readiness ?? null) : null}
        preparing={selectMutation.isPending}
        prepareError={
          selectMutation.isError ? describeSelectionFailure(selectMutation.error) : null
        }
        onChoose={chooseHero}
        onPrepare={() => {
          if (heroRef !== null) {
            selectMutation.mutate(heroRef)
          }
        }}
      />

      <EquipmentManagerPanel
        heroName={activeName}
        hasHero={heroRef !== null}
        equipment={equipment}
        equipmentLoading={equipmentQuery.isLoading}
        equipmentError={equipmentQuery.error}
        selectedSlot={selectedSlot}
        slotMeta={slotMeta}
        onSelectSlot={(slot) => {
          onSelectSlot(slot === selectedSlot ? null : slot)
          equipMutation.reset()
        }}
        selectedProductName={selectedProductName}
        selectedProductType={selectedProductType}
        capacity={isPreparedActive ? (selection?.capacity ?? null) : null}
        canEquip={canEquip}
        equipping={equipMutation.isPending}
        equipError={equipErrorMessage}
        onEquip={() => {
          if (canEquip) {
            equipMutation.mutate({
              slot: slotMeta.id,
              productReference: selectedProductReference,
            })
          }
        }}
      />
    </>
  )
}
