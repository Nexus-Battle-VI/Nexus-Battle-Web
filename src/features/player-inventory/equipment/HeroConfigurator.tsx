import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { HttpError } from '@/lib/http'
import { describeFailure } from '@/shared/i18n/errors'
import { useLanguage } from '@/shared/i18n/language'
import { HERO_IDS, type HeroId } from '@/shared/visual-library/heroes'

import { describeSelectionFailure } from '../heroSelectionApi'
import { useEquipEpic, useHeroEpic } from './useHeroEpic'
import { useAvailableHeroes, useHeroSelection, useSelectHero } from '../useHeroSelection'
import type { EquipmentSlotId } from './api'
import { battleLockMessage, isBattleLockError } from './battleLockPresentation'
import { EpicManagerPanel } from './EpicManagerPanel'
import { EquipmentManagerPanel } from './EquipmentManagerPanel'
import { HeroManagerPanel } from './HeroManagerPanel'
import { heroIdFromReference } from './heroSubtype'
import { SLOT_META_BY_ID } from './slots'
import { useEquipItem, useHeroEquipment, useUnequipItem } from './useHeroEquipment'
import type { EquippedProduct, HeroEquipment } from './api'

export interface HeroConfiguratorProps {
  /** Referencia del producto seleccionado en el inventario, para equipar. */
  readonly selectedProductReference: string | null
  readonly selectedProductName: string | null
  readonly selectedProductType: string | null
  readonly selectedSlot: EquipmentSlotId | null
  readonly onSelectSlot: (slot: EquipmentSlotId | null) => void
  /** HU-31: `true` mientras el jugador elige una epica del inventario para equiparla. */
  readonly selectingEpic: boolean
  readonly onToggleSelectingEpic: () => void
  /**
   * Al elegir una ranura OCUPADA, informa el `itemId` real del producto
   * equipado para que la Ficha pueda mostrarlo (gate "slot ocupado -> Detail
   * muestra el item equipado real"). `null` si la ranura estaba vacia.
   */
  readonly onSelectEquippedItem?: (itemId: string | null) => void
  /**
   * Nodo DOM real de la columna "Ficha" (`ItemDetailPanel`, columna derecha)
   * donde se PORTALEA la accion de "Equipar" + Estadisticas + Efectos -- el
   * boton y las tablas salen del centro y viven ahi (gate de composicion).
   * Se usa un portal (no una prop de render ni mover el componente) para que
   * `HeroConfigurator` siga siendo la UNICA fuente de verdad de los hooks de
   * equipamiento (cero logica/mutaciones duplicadas) sin importar en que
   * columna del grid termine viendose el resultado. `null`/`undefined`
   * (ej. al probar `HeroConfigurator` aislado) hace que el bloque se
   * renderice en su lugar de siempre, sin romper nada.
   */
  readonly detailAnchor?: HTMLElement | null
  /**
   * Nodo DOM real de la columna IZQUIERDA (debajo del Inventario) donde se
   * PORTALEA la seccion de Épica (HU-31): deja de vivir debajo del centro
   * (gate 6a pasada) y pasa a vivir debajo de Buscar/Filtros/Cards/
   * Paginación. Mismo patron de portal que `detailAnchor`: `null`/
   * `undefined` (ej. `HeroConfigurator` probado aislado) deja el bloque en
   * su lugar de siempre, sin romper nada.
   */
  readonly epicAnchor?: HTMLElement | null
  /**
   * Se invoca cada vez que cambia el equipamiento REAL del heroe activo
   * (incluido `undefined` sin heroe/antes de cargar), para que
   * `PlayerInventoryPage` pueda derivar que `itemId` estan equipados AHORA y
   * marcarlos en la rejilla del inventario (presentacion pura, mismo dato
   * que ya expone `HeroEquipment`, nunca una regla nueva).
   */
  readonly onEquipmentChange?: (equipment: HeroEquipment | undefined) => void
  /**
   * Drag & Drop (metodo ALTERNATIVO, el flujo de click+click+Equipar SIGUE
   * intacto): tipo canonico del producto que se esta arrastrando ahora
   * mismo desde el Inventario, o `null` sin drag activo. Se SUMA (OR) a
   * `selectedProductType` al decidir que ranuras resaltar como
   * compatibles -nunca reemplaza la seleccion por click-.
   */
  readonly draggedProductType?: string | null
  /**
   * Se invoca al soltar un producto sobre una ranura REAL (`EquipmentSlots`
   * ya valido que el tipo coincide antes de llamarlo -- esto NUNCA decide
   * compatibilidad por su cuenta). Ejecuta la MISMA mutacion real de
   * Equipar que el boton, nunca una peticion paralela.
   */
  readonly onDropEquip?: (slot: EquipmentSlotId, itemId: string) => void
}

/** La pieza REAL ocupando una ranura, si hay alguna (ver `EquippedProduct`). */
const equippedEntryForSlot = (
  equipment: HeroEquipment | undefined,
  slot: EquipmentSlotId | null,
): EquippedProduct | null => {
  if (equipment === undefined || slot === null) return null
  const weapon = equipment.equipment.weapons.find((item) => item.slot === slot)
  if (weapon !== undefined) return weapon
  const item = equipment.equipment.items.find((entry) => entry.slot === slot)
  if (item !== undefined) return item
  return equipment.equipment.armor[slot] ?? null
}

const heroModelId = (subtype: string, reference: string): HeroId => {
  const bySubtype = (HERO_IDS as readonly string[]).find(
    (id) => id.replace(/-/gu, '_').toUpperCase() === subtype,
  )
  return (heroIdFromReference(reference) ?? bySubtype ?? HERO_IDS[0]) as HeroId
}

/**
 * Configuracion del heroe (HU-07/HU-28): coordina el escenario del heroe con
 * su equipamiento real alrededor (zona central) y la epica (zona central,
 * debajo). La accion de "Equipar" + Estadisticas + Efectos del equipamiento
 * se portalean a la Ficha (columna derecha) -- ver `detailAnchor` arriba.
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
  selectingEpic,
  onToggleSelectingEpic,
  onSelectEquippedItem,
  detailAnchor = null,
  epicAnchor = null,
  onEquipmentChange,
  draggedProductType = null,
  onDropEquip,
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
  const unequipMutation = useUnequipItem(heroRef)
  const equipment = equipmentQuery.data
  const activeHero = heroes.find((hero) => hero.reference === heroRef)

  useEffect(() => {
    onEquipmentChange?.(equipment)
  }, [equipment, onEquipmentChange])

  const epicQuery = useHeroEpic(heroRef)
  const epicMutation = useEquipEpic(heroRef)
  const epic = epicQuery.data

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
  // Solo para el emblema de rol DECORATIVO de `HeroManagerPanel` (presentacion
  // pura, ver `heroRole.ts`) -mismo criterio de prioridad que `activeName`.
  const activeSubtype =
    equipment?.hero.subtype ??
    activeHero?.subtype ??
    (isPreparedActive ? (selection?.configuration.hero.subtype ?? null) : null)

  // Prototipos 3D que el jugador aun no posee: solo informativos y compactos.
  const ownedModels = new Set(heroes.map((hero) => heroModelId(hero.subtype, hero.reference)))
  const unavailableModels =
    heroesQuery.data === undefined ? [] : HERO_IDS.filter((id) => !ownedModels.has(id))

  const chooseHero = (reference: string): void => {
    setChosenRef(reference)
    onSelectSlot(null)
    onSelectEquippedItem?.(null)
    equipMutation.reset()
    unequipMutation.reset()
    epicMutation.reset()
    if (selectingEpic) onToggleSelectingEpic()
    selectMutation.reset()
  }

  const slotMeta = selectedSlot === null ? null : (SLOT_META_BY_ID.get(selectedSlot) ?? null)
  // HU-29: `locked` manda sobre la compatibilidad de ranura/producto. El
  // backend sigue siendo quien rechaza de verdad (ver `useEquipItem`); esto
  // solo evita ofrecer un boton que ya se sabe que va a fallar.
  const canEquip =
    heroRef !== null &&
    slotMeta !== null &&
    selectedProductReference !== null &&
    selectedProductType === slotMeta.productType &&
    equipment?.locked !== true &&
    !equipMutation.isPending

  const equipError = equipMutation.error
  const equipErrorMessage =
    equipError instanceof HttpError
      ? isBattleLockError(equipError)
        ? battleLockMessage()
        : describeFailure(equipError, t, language)
      : equipError != null
        ? t('inventory:equipment.equipFailed')
        : null

  // HU-28.4: la ranura elegida esta OCUPADA y la Ficha muestra EXACTAMENTE
  // ese producto (no uno distinto del catalogo) -- entonces la accion
  // principal es Desequipar, no Equipar. `selectedProductReference` es el
  // `itemId` real que `onSelectEquippedItem` propago al elegir esa ranura.
  const equippedAtSlot = equippedEntryForSlot(equipment, selectedSlot)
  const isUnequipContext =
    equippedAtSlot !== null && equippedAtSlot.itemId === selectedProductReference
  const canUnequip =
    heroRef !== null && isUnequipContext && equipment?.locked !== true && !unequipMutation.isPending

  const unequipError = unequipMutation.error
  const unequipErrorMessage =
    unequipError instanceof HttpError
      ? isBattleLockError(unequipError)
        ? battleLockMessage()
        : describeFailure(unequipError, t, language)
      : unequipError != null
        ? t('inventory:equipment.unequipFailed')
        : null

  // HU-31: misma logica que `canEquip`, sin ranura -la epica es un recurso
  // propio, no una de las 2/6/2 de HU-28-. El backend sigue siendo quien
  // rechaza de verdad (ver `useEquipEpic`).
  const canEquipEpic =
    heroRef !== null &&
    selectingEpic &&
    selectedProductReference !== null &&
    selectedProductType === 'EPICA' &&
    epic?.locked !== true &&
    !epicMutation.isPending

  const epicError = epicMutation.error
  const epicErrorMessage =
    epicError instanceof HttpError
      ? isBattleLockError(epicError)
        ? t('inventory:epic.battleLock.message')
        : describeFailure(epicError, t, language)
      : epicError != null
        ? t('inventory:epic.equipFailed')
        : null

  const equipmentManager = (
    <EquipmentManagerPanel
      heroName={activeName}
      hasHero={heroRef !== null}
      equipment={equipment}
      equipmentLoading={equipmentQuery.isLoading}
      equipmentError={equipmentQuery.error}
      slotMeta={slotMeta}
      selectedProductName={selectedProductName}
      selectedProductType={selectedProductType}
      canEquip={canEquip}
      equipping={equipMutation.isPending}
      equipError={equipErrorMessage}
      locked={equipment?.locked ?? false}
      onEquip={() => {
        if (canEquip) {
          equipMutation.mutate({
            slot: slotMeta.id,
            productReference: selectedProductReference,
          })
        }
      }}
      isUnequipContext={isUnequipContext}
      canUnequip={canUnequip}
      unequipping={unequipMutation.isPending}
      unequipError={unequipErrorMessage}
      onUnequip={() => {
        if (canUnequip && slotMeta !== null) {
          unequipMutation.mutate({ slot: slotMeta.id })
        }
      }}
    />
  )

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
        activeSubtype={activeSubtype}
        activeProgression={activeHero?.progression ?? null}
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
        equipment={equipment}
        selectedSlot={selectedSlot}
        onSelectSlot={(slot) => {
          onSelectSlot(slot === selectedSlot ? null : slot)
          equipMutation.reset()
          unequipMutation.reset()
          if (selectingEpic) onToggleSelectingEpic()
        }}
        onSelectEquippedItem={(itemId) => {
          onSelectEquippedItem?.(itemId)
        }}
        compatibleType={draggedProductType ?? selectedProductType}
        capacity={isPreparedActive ? (selection?.capacity ?? null) : null}
        locked={equipment?.locked ?? false}
        equipping={equipMutation.isPending}
        onDropItem={(slot, itemId, productType) => {
          // HU-28 Drag & Drop: defensa en profundidad con la MISMA fuente de
          // verdad que `canEquip` por click (`SLOT_META_BY_ID`) -- aunque
          // `EquipmentSlots` ya filtra el highlight visual por compatibilidad,
          // esto vuelve a comprobarlo antes de mutar, nunca confia solo en
          // el payload del drag.
          const meta = SLOT_META_BY_ID.get(slot)
          if (meta?.productType !== productType) return
          if (heroRef === null || equipment?.locked === true || equipMutation.isPending) return
          equipMutation.mutate({ slot, productReference: itemId })
          onDropEquip?.(slot, itemId)
        }}
      />

      {detailAnchor !== null ? createPortal(equipmentManager, detailAnchor) : equipmentManager}

      {(() => {
        const epicManager = (
          <EpicManagerPanel
            heroName={activeName}
            hasHero={heroRef !== null}
            epic={epic}
            epicLoading={epicQuery.isLoading}
            epicError={epicQuery.error}
            selecting={selectingEpic}
            onToggleSelecting={() => {
              onToggleSelectingEpic()
              epicMutation.reset()
            }}
            selectedProductName={selectedProductName}
            selectedProductType={selectedProductType}
            canEquip={canEquipEpic}
            equipping={epicMutation.isPending}
            equipError={epicErrorMessage}
            locked={epic?.locked ?? false}
            onEquip={() => {
              if (canEquipEpic) {
                epicMutation.mutate({ productReference: selectedProductReference })
              }
            }}
          />
        )
        return epicAnchor !== null ? createPortal(epicManager, epicAnchor) : epicManager
      })()}
    </>
  )
}
