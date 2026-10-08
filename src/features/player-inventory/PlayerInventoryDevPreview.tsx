import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useTheme, type Theme } from '@/shared/theme'
import type { AvailableHero, HeroReadiness, HeroSelection } from './heroSelectionApi'
import type { EquipmentSlotId, EquippedProduct, HeroEquipment } from './equipment/api'
import type { HeroEpicState } from './equipment/epicApi'
import type { OwnedInventoryItem, OwnedInventoryItemDetail, OwnedInventoryPage } from './api'
import { PlayerInventoryPage } from './PlayerInventoryPage'

/**
 * `true` una vez que el parche de `fetch` ya se instalo en este modulo -evita
 * reinstalarlo en cada render/remount de `PlayerInventoryDevPreview` (ej. al
 * cambiar de escenario via `setSearchParams`, que remonta el arbol bajo
 * `<Suspense>`)-. Vive a nivel de modulo porque debe sobrevivir a montajes y
 * desmontajes del componente mientras la pestaña siga abierta; eliminado del
 * bundle de produccion junto con el resto del archivo (`import.meta.env.DEV`
 * en `dev-routes.tsx`).
 */
let fetchPatchInstalled = false

/**
 * Cambios de equipamiento REALES hechos en esta pestaña (clic en "Equipar" o
 * en "Desequipar"), solo en memoria -nunca persiste entre recargas, nunca
 * toca Player-Inventory-, para que ambos flujos se puedan probar de verdad en
 * Chrome en vez de ver siempre la misma respuesta estatica. `heroReference ->
 * ranura -> producto equipado, o `null` si se vacio con "Desequipar"`. */
const equipmentOverrides = new Map<
  string,
  Partial<Record<EquipmentSlotId, EquippedProduct | null>>
>()

const setEquipmentOverride = (
  heroReference: string,
  slot: EquipmentSlotId,
  product: EquippedProduct | null,
): void => {
  const current = equipmentOverrides.get(heroReference) ?? {}
  equipmentOverrides.set(heroReference, { ...current, [slot]: product })
}

/**
 * Vista previa de desarrollo del remaster visual de "Mi Inventario"
 * (EN-029, Sprint 3 — "Warforge Armory" / "Royal Arsenal").
 *
 * NO ES UNA PANTALLA DEL PRODUCTO. `/inventory` real vive tras
 * `RequireSession` y necesita Player-Inventory (compuesto con Catalog)
 * respondiendo de verdad; el entorno local no levanta ese stack. MONTA EL
 * COMPONENTE DE PRODUCCION REAL (`PlayerInventoryPage`), no una copia: si el
 * componente cambia, este preview cambia con el. Misma tecnica que
 * `ModerationQueueDevPreview`/`PendingClaimsDevPreview`: se intercepta
 * `fetch` para los endpoints de `/api/inventories/me/*` mientras el preview
 * esta montado, nunca se tocan los contratos reales.
 *
 * Solo se alcanza con `import.meta.env.DEV` (ver `src/routes/dev-routes.tsx`),
 * eliminado del bundle de produccion por Vite. Production (`/inventory`)
 * NUNCA importa este modulo ni sus fixtures: la unica referencia a este
 * archivo vive en la rama `import.meta.env.DEV` de `dev-routes.tsx`.
 *
 * Escenarios (`?scenario=`):
 * - `items` (por defecto): inventario con 20 objetos (pagina 1/2, ejercita
 *   paginacion real), uno con nombre muy largo, heroe PREPARADO, equipamiento
 *   con una ranura ocupada y otra vacia, epica equipada con efecto especifico
 *   aplicado. Click en una ranura -> resalte de compatibles/incompatibles en
 *   la rejilla (comportamiento real del componente, no un fixture aparte);
 *   click en una tarjeta -> ficha de detalle seleccionada.
 * - `empty`: inventario vacio real (0 items).
 * - `unprepared`: el jugador tiene heroes pero ninguno esta preparado para
 *   batalla (`GET .../heroes/selection` responde 404, estado normal).
 * - `locked`: el heroe activo participa en una batalla activa (`locked:
 *   true` en equipamiento y epica), para revisar el estado de bloqueo.
 */
const DEV_THEME_OPTIONS: readonly { readonly value: Theme; readonly label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

const SCENARIOS = ['items', 'empty', 'unprepared', 'locked'] as const
type Scenario = (typeof SCENARIOS)[number]

const isScenario = (value: string | null): value is Scenario =>
  (SCENARIOS as readonly string[]).some((scenario) => scenario === value)

const HERO_REF = 'guerrero-tanque-demo'
const HERO_ID = 'pid-guerrero-tanque-demo'
// Segundo heroe DEV-ONLY (gate: probar cambio de heroe con 2 heroes reales
// en Chrome -- subtipo/nivel/XP/equipamiento distintos, mismas formas/
// contratos reales, nada inventado en el TIPO de dato, solo en el VALOR de
// ejemplo). Nunca llega a produccion: este archivo completo se elimina del
// bundle junto con el resto de `dev-routes.tsx` (`import.meta.env.DEV`).
const HERO_REF_2 = 'maga-hielo-demo'
const HERO_ID_2 = 'pid-maga-hielo-demo'

const longName =
  'Guantelete Ceremonial del Forjador de Runas de la Antigua Orden del Amanecer Carmesi'

/**
 * Artwork REAL asignado SOLO en el Dev Preview (nunca toca `demoProduct`'s
 * default `imageUrl: ''` del resto de fixtures, nunca Catalog real) para
 * poder comprobar de verdad la media area de las cards/slots con formas
 * distintas -- gate de la 7a pasada: "Richard no puede comprobar la media
 * area porque todos los fixtures aparecen sin artwork". Este repositorio no
 * trae fotografia de producto real (espada/casco/pocion): se reutilizan
 * iconos PNG YA EXISTENTES en el proyecto (nunca internet, nunca una URL
 * externa) que cubren las formas pedidas -- alargada/vertical (arma),
 * cuadrada/ancha (armadura), redonda (pocion/moneda), gema (epica)-. Son
 * iconos planos de interfaz, no ilustracion de producto: a tamano grande se
 * ven simples/pixelados, pero sirven exactamente para lo que este gate pide
 * comprobar -centrado, `object-fit:contain`, sin recorte, sin deformar-,
 * que es independiente de la resolucion de origen. Rutas relativas al mismo
 * origen (sirven directo, sin pasar por el flujo autenticado de Catalog que
 * usa `ProductThumb` para URLs reales).
 */
const DEV_ARTWORK = {
  weapon: '/assets/ecommerce/icons/categories-light-weapon.png',
  armorSquare: '/assets/ecommerce/icons/categories-light-armor.png',
  armorWide: '/assets/ecommerce/icons/categories-light-chest.png',
  potion: '/assets/inventory/item-detail/coin-icon-light.png',
  epic: '/assets/ecommerce/icons/commerce-light-sparkle.png',
} as const

const demoProduct = (
  productId: string,
  sku: string,
  name: string,
  type: string,
  overrides: Partial<OwnedInventoryItemDetail['product']> = {},
): OwnedInventoryItemDetail['product'] => ({
  productId,
  sku,
  name,
  imageUrl: '',
  description: `Descripcion de ejemplo para ${name} (vista previa de desarrollo).`,
  type,
  lifecycleStatus: 'ACTIVE',
  creditsPrice: 250,
  premium: false,
  realMoneyPrice: null,
  attributes: { slot: type === 'ARMA' ? 'WEAPON' : undefined },
  ...overrides,
})

const buildItems = (scenario: Scenario): OwnedInventoryItem[] => {
  if (scenario === 'empty') return []

  const base: OwnedInventoryItem[] = [
    {
      itemId: 'item-espada-01',
      quantity: 1,
      product: {
        productId: 'prod-espada-01',
        sku: 'arma-espada-01',
        name: 'Espada del Alba',
        imageUrl: DEV_ARTWORK.weapon,
        type: 'ARMA',
        lifecycleStatus: 'ACTIVE',
        premium: false,
      },
    },
    {
      itemId: 'item-casco-01',
      quantity: 1,
      product: {
        productId: 'prod-casco-01',
        sku: 'armadura-casco-01',
        name: 'Yelmo de Hierro',
        imageUrl: DEV_ARTWORK.armorSquare,
        type: 'ARMADURA',
        lifecycleStatus: 'ACTIVE',
        premium: false,
      },
    },
    {
      itemId: 'item-pocion-01',
      quantity: 5,
      product: {
        productId: 'prod-pocion-01',
        sku: 'item-pocion-01',
        name: 'Poción de Vitalidad',
        imageUrl: DEV_ARTWORK.potion,
        type: 'ITEM',
        lifecycleStatus: 'ACTIVE',
        premium: false,
      },
    },
    {
      itemId: 'item-epica-01',
      quantity: 1,
      product: {
        productId: 'prod-epica-01',
        sku: 'epica-01',
        name: 'Corazón del Dragón Ancestral',
        imageUrl: DEV_ARTWORK.epic,
        type: 'EPICA',
        lifecycleStatus: 'ACTIVE',
        premium: true,
      },
    },
    {
      itemId: 'item-nombre-largo',
      quantity: 2,
      product: {
        productId: 'prod-nombre-largo',
        sku: 'armadura-guante-01',
        name: longName,
        imageUrl: DEV_ARTWORK.armorWide,
        type: 'ARMADURA',
        lifecycleStatus: 'ACTIVE',
        premium: false,
      },
    },
  ]

  // Rellena hasta 20 para ejercitar paginacion real (pageSize = 16, RF-27).
  const filler: OwnedInventoryItem[] = Array.from({ length: 15 }, (_, index) => ({
    itemId: `item-filler-${String(index + 1)}`,
    quantity: 1,
    product: {
      productId: `prod-filler-${String(index + 1)}`,
      sku: `item-filler-${String(index + 1)}`,
      name: `Objeto de relleno ${String(index + 1)}`,
      imageUrl: '',
      type: 'ITEM',
      lifecycleStatus: 'ACTIVE',
      premium: false,
    },
  }))

  return [...base, ...filler]
}

const PAGE_SIZE = 16

const buildItemsPage = (scenario: Scenario, page: number, q: string): OwnedInventoryPage => {
  const all = buildItems(scenario).filter(
    (item) => q === '' || (item.product?.name.toLowerCase().includes(q.toLowerCase()) ?? false),
  )
  const totalItems = all.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const items = all.slice(start, start + PAGE_SIZE)

  return { items, page, pageSize: PAGE_SIZE, totalItems, totalPages }
}

const buildItemDetail = (scenario: Scenario, itemId: string): OwnedInventoryItemDetail | null => {
  const item = buildItems(scenario).find((candidate) => candidate.itemId === itemId)
  if (item?.product === undefined || item.product === null) return null

  return {
    itemId: item.itemId,
    quantity: item.quantity,
    product: demoProduct(
      item.product.productId,
      item.product.sku,
      item.product.name,
      item.product.type,
      {
        premium: item.product.type === 'EPICA',
        realMoneyPrice: item.product.type === 'EPICA' ? { amount: 4.99, currency: 'USD' } : null,
      },
    ),
  }
}

const AVAILABLE_HEROES: readonly AvailableHero[] = [
  {
    heroId: HERO_ID,
    reference: HERO_REF,
    subtype: 'GUERRERO_TANQUE',
    name: 'Guerrero Tanque Demo',
    imageUrl: '',
    lifecycleStatus: 'ACTIVE',
    baseStats: {
      power: 1,
      health: 44,
      defense: 11,
      attack: 10,
      damage: { mode: 'DICE', count: 1, sides: 4 },
      healing: null,
    },
    abilities: [{ reference: 'hab-golpe-escudo', name: 'Golpe con escudo' }],
    selected: true,
    progression: {
      level: 3,
      // 7a pasada (gate "XP extreme DEV test", obligatorio): 10/100 = 10% --
      // deliberadamente BAJO para que, comparado con el segundo heroe
      // (80%), la diferencia de longitud de la barra sea OBVIA en Chrome.
      // `amount` es el UMBRAL ABSOLUTO de XP para alcanzar `forNextLevel`
      // (`heroProgressionPresentation.ts` calcula
      // `xpRequiredForLevel = amount - floorForCurrentLevel`), no un delta
      // relativo -fixture corregida tras verla pintar "XP hacia nivel 4:
      // -50" en QA visual real-.
      currentXp: 160,
      floorForCurrentLevel: 150,
      nextLevel: { status: 'AVAILABLE', forNextLevel: 4, amount: 250 },
      maxLevel: 8,
    },
  },
  {
    heroId: HERO_ID_2,
    reference: HERO_REF_2,
    subtype: 'MAGO_HIELO',
    name: 'Maga de Hielo Demo',
    imageUrl: '',
    lifecycleStatus: 'ACTIVE',
    baseStats: {
      power: 2,
      health: 30,
      defense: 6,
      attack: 14,
      damage: { mode: 'DICE', count: 2, sides: 6 },
      healing: null,
    },
    abilities: [{ reference: 'hab-rayo-escarcha', name: 'Rayo de escarcha' }],
    selected: false,
    progression: {
      level: 5,
      // 7a pasada: 192/240 = 80% -- deliberadamente ALTO frente al 10% del
      // primer heroe, para que el contraste sea obvio al cambiar de heroe
      // en Chrome (gate "XP extreme DEV test").
      currentXp: 732,
      floorForCurrentLevel: 540,
      nextLevel: { status: 'AVAILABLE', forNextLevel: 6, amount: 780 },
      maxLevel: 8,
    },
  },
]

const buildSelection = (
  scenario: Scenario,
  heroReference: string = HERO_REF,
): HeroSelection | null => {
  if (scenario === 'unprepared') return null

  const readiness: HeroReadiness = { ready: true, blockers: [] }
  const isSecondHero = heroReference === HERO_REF_2

  return {
    selectedAt: '2026-09-03T10:00:00.000Z',
    configuration: buildEquipment(scenario, heroReference),
    readiness,
    capacity: isSecondHero
      ? { weapons: { used: 0, max: 2 }, armor: { used: 1, max: 6 }, items: { used: 1, max: 2 } }
      : { weapons: { used: 1, max: 2 }, armor: { used: 1, max: 6 }, items: { used: 0, max: 2 } },
  }
}

/**
 * Aplica, sobre el equipamiento BASE de este escenario, cualquier cambio
 * REAL hecho con "Equipar" en esta pestana (ver `equipmentOverrides`): una
 * ranura de armadura/items se reemplaza por el override si existe, y una
 * ranura de armas se agrega/reemplaza por `slot`. Nunca inventa nada que no
 * venga de un "Equipar" real del jugador en esta sesion. */
const applyEquipmentOverrides = (
  heroReference: string,
  equipment: HeroEquipment['equipment'],
): HeroEquipment['equipment'] => {
  const overrides = equipmentOverrides.get(heroReference)
  if (overrides === undefined) return equipment

  const nextWeapons = equipment.weapons.filter((item) => overrides[item.slot] === undefined)
  const nextArmor = { ...equipment.armor }
  const nextItems = equipment.items.filter((item) => overrides[item.slot] === undefined)

  for (const slot of Object.keys(overrides) as EquipmentSlotId[]) {
    const product = overrides[slot]
    if (product === undefined) continue
    if (slot === 'WEAPON_1' || slot === 'WEAPON_2') {
      if (product !== null) nextWeapons.push(product)
    } else if (slot === 'ITEM_1' || slot === 'ITEM_2') {
      if (product !== null) nextItems.push(product)
    } else {
      nextArmor[slot] = product
    }
  }

  return { weapons: nextWeapons, armor: nextArmor, items: nextItems }
}

function buildEquipment(scenario: Scenario, heroReference: string = HERO_REF): HeroEquipment {
  const locked = scenario === 'locked'

  if (heroReference === HERO_REF_2) {
    const base: HeroEquipment = {
      hero: {
        heroId: HERO_ID_2,
        reference: HERO_REF_2,
        subtype: 'MAGO_HIELO',
        name: 'Maga de Hielo Demo',
        imageUrl: '',
      },
      equipment: {
        // Sin armas equipadas todavia (ambas vacias) y un item puesto:
        // ejercita un patron de ocupacion DISTINTO al del primer heroe, para
        // confirmar en QA que nada queda "pegado" al cambiar de heroe.
        weapons: [],
        armor: {
          HELMET: null,
          CHEST: {
            slot: 'CHEST',
            itemId: 'item-tunica-01',
            productId: 'prod-tunica-01',
            name: 'Túnica Glacial',
            imageUrl: DEV_ARTWORK.armorWide,
            type: 'ARMADURA',
            lifecycleStatus: 'ACTIVE',
          },
          GLOVES: null,
          BRACERS: null,
          PANTS: null,
          SHOES: null,
        },
        items: [
          {
            slot: 'ITEM_1',
            itemId: 'item-pocion-01',
            productId: 'prod-pocion-01',
            name: 'Poción de Vitalidad',
            imageUrl: DEV_ARTWORK.potion,
            type: 'ITEM',
            lifecycleStatus: 'ACTIVE',
          },
        ],
      },
      level: 5,
      baseStats: { power: 2, health: 30, defense: 6, attack: 14, damage: null, healing: null },
      levelStats: { power: 10, health: 150, defense: 30, attack: 70, damage: null, healing: null },
      effectiveStats: {
        power: 11,
        health: 150,
        defense: 34,
        attack: 70,
        damage: null,
        healing: null,
      },
      deltas: [
        { statistic: 'power', base: 10, effective: 11, delta: 1 },
        { statistic: 'defense', base: 30, effective: 34, delta: 4 },
      ],
      activeEffects: [
        {
          sourceSlot: 'CHEST',
          sourceProductId: 'prod-tunica-01',
          sourceProductReference: 'item-tunica-01',
          kind: 'DAMAGE',
          target: 'OPPONENT',
          statistic: 'defense',
          operation: 'ADD',
          magnitude: { mode: 'FIXED', amount: 4 },
          hasActivationCondition: false,
          appliedToStats: true,
        },
      ],
      locked,
    }
    return { ...base, equipment: applyEquipmentOverrides(heroReference, base.equipment) }
  }

  const base: HeroEquipment = {
    hero: {
      heroId: HERO_ID,
      reference: HERO_REF,
      subtype: 'GUERRERO_TANQUE',
      name: 'Guerrero Tanque Demo',
      imageUrl: '',
    },
    equipment: {
      // WEAPON_1 ocupada, WEAPON_2 vacia: ejercita "equipada" y "ranura
      // vacia" en la MISMA respuesta, sin fixtures separados.
      weapons: [
        {
          slot: 'WEAPON_1',
          itemId: 'item-espada-01',
          productId: 'prod-espada-01',
          name: 'Espada del Alba',
          imageUrl: DEV_ARTWORK.weapon,
          type: 'ARMA',
          lifecycleStatus: 'ACTIVE',
        },
      ],
      armor: {
        HELMET: {
          slot: 'HELMET',
          itemId: 'item-casco-01',
          productId: 'prod-casco-01',
          name: 'Yelmo de Hierro',
          imageUrl: DEV_ARTWORK.armorSquare,
          type: 'ARMADURA',
          lifecycleStatus: 'ACTIVE',
        },
        CHEST: null,
        GLOVES: null,
        BRACERS: null,
        PANTS: null,
        SHOES: null,
      },
      items: [],
    },
    level: 3,
    baseStats: { power: 1, health: 44, defense: 11, attack: 10, damage: null, healing: null },
    levelStats: { power: 3, health: 132, defense: 33, attack: 30, damage: null, healing: null },
    effectiveStats: { power: 4, health: 142, defense: 38, attack: 32, damage: null, healing: null },
    deltas: [
      { statistic: 'power', base: 3, effective: 4, delta: 1 },
      { statistic: 'health', base: 132, effective: 142, delta: 10 },
      { statistic: 'defense', base: 33, effective: 38, delta: 5 },
      { statistic: 'attack', base: 30, effective: 32, delta: 2 },
    ],
    activeEffects: [
      {
        sourceSlot: 'HELMET',
        sourceProductId: 'prod-casco-01',
        sourceProductReference: 'item-casco-01',
        kind: 'DAMAGE',
        target: 'OPPONENT',
        statistic: 'defense',
        operation: 'ADD',
        magnitude: { mode: 'FIXED', amount: 5 },
        hasActivationCondition: false,
        appliedToStats: true,
      },
    ],
    locked,
  }
  return { ...base, equipment: applyEquipmentOverrides(heroReference, base.equipment) }
}

const buildEpic = (scenario: Scenario, heroReference: string = HERO_REF): HeroEpicState => {
  if (heroReference === HERO_REF_2) {
    // Sin epica equipada: estado DISTINTO al del primer heroe (que SI tiene
    // una), para que el cambio de heroe en Chrome muestre de verdad datos
    // propios de cada uno, nunca el ultimo que quedo en pantalla.
    return { heroId: HERO_ID_2, epic: null, version: 0, locked: scenario === 'locked' }
  }

  return buildPrimaryEpic(scenario)
}

const buildPrimaryEpic = (scenario: Scenario): HeroEpicState => ({
  heroId: HERO_ID,
  epic: {
    epicProductId: 'prod-epica-01',
    epicReference: 'item-epica-01',
    name: 'Corazón del Dragón Ancestral',
    imageUrl: DEV_ARTWORK.epic,
    compatibleHeroSubtype: 'GUERRERO_TANQUE',
    baseEffect: { kind: 'DAMAGE', target: 'OPPONENT', magnitude: { mode: 'FIXED', amount: 8 } },
    specificEffects: [
      {
        kind: 'HEALING',
        target: 'ALLY',
        statistic: 'health',
        operation: 'ADD',
        magnitude: { mode: 'PERCENTAGE', basisPoints: 500 },
      },
    ],
    applied: {
      baseApplied: { kind: 'DAMAGE', target: 'OPPONENT', magnitude: { mode: 'FIXED', amount: 8 } },
      additionalApplied: [
        {
          kind: 'HEALING',
          target: 'ALLY',
          statistic: 'health',
          operation: 'ADD',
          magnitude: { mode: 'PERCENTAGE', basisPoints: 500 },
        },
      ],
    },
  },
  version: 1,
  locked: scenario === 'locked',
})

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const handleInventoryRequest = (
  scenario: Scenario,
  pathname: string,
  search: URLSearchParams,
  init: RequestInit | undefined,
): Response | null => {
  if (pathname === '/api/inventories/me/items') {
    const page = Number(search.get('page') ?? '1')
    const q = search.get('q') ?? ''
    return jsonResponse(buildItemsPage(scenario, page, q))
  }

  const detailMatch = /^\/api\/inventories\/me\/items\/([^/]+)$/u.exec(pathname)
  if (detailMatch) {
    const itemId = decodeURIComponent(detailMatch[1] ?? '')
    const detail = buildItemDetail(scenario, itemId)
    return detail === null ? jsonResponse({ message: 'No encontrado' }, 404) : jsonResponse(detail)
  }

  if (pathname === '/api/inventories/me/heroes') {
    return jsonResponse(AVAILABLE_HEROES)
  }

  if (pathname === '/api/inventories/me/heroes/selection') {
    if (init?.method === 'PUT') {
      // "Confirmar para batalla": el preview simula la preparacion
      // devolviendo la configuracion REAL del heroe que de verdad se mando
      // en el cuerpo del PUT (`{ heroReference }`, mismo contrato real que
      // `heroSelectionApi.ts`), para que preparar el SEGUNDO heroe no deje
      // pegados los datos del primero.
      const parsedBody = parseJsonBody(init.body)
      const heroReference =
        parsedBody !== null &&
        typeof parsedBody === 'object' &&
        'heroReference' in parsedBody &&
        typeof parsedBody.heroReference === 'string'
          ? parsedBody.heroReference
          : HERO_REF
      return jsonResponse(
        buildSelection(scenario === 'unprepared' ? 'items' : scenario, heroReference),
      )
    }
    const selection = buildSelection(scenario)
    return selection === null
      ? jsonResponse({ message: 'Sin heroe preparado' }, 404)
      : jsonResponse(selection)
  }

  const equipmentMatch = /^\/api\/inventories\/me\/heroes\/([^/]+)\/equipment(?:\/([^/]+))?$/u.exec(
    pathname,
  )
  if (equipmentMatch) {
    const heroReference = decodeURIComponent(equipmentMatch[1] ?? HERO_REF)
    const slotParam = equipmentMatch[2]
    if (init?.method === 'PUT' && slotParam !== undefined) {
      // "Equipar" REAL: el preview guarda el cambio en un mapa en memoria
      // (solo de esta pestaña, nunca persiste, se pierde al recargar) para
      // que el flujo se pueda probar de verdad en Chrome -clic en ranura ->
      // clic en producto -> Equipar -> la ranura se ve ocupada, la Ficha se
      // actualiza con el objeto real, Stats/Efectos reflejan el cambio-, en
      // vez de una respuesta estatica que nunca cambia.
      const slot = slotParam as EquipmentSlotId
      const body = parseJsonBody(init.body)
      const productReference =
        body !== null &&
        typeof body === 'object' &&
        'productReference' in body &&
        typeof body.productReference === 'string'
          ? body.productReference
          : null
      if (productReference !== null) {
        const owned = buildItems(scenario).find((item) => item.itemId === productReference)
        if (owned?.product !== null && owned?.product !== undefined) {
          setEquipmentOverride(heroReference, slot, {
            slot,
            itemId: owned.itemId,
            productId: owned.product.productId,
            name: owned.product.name,
            imageUrl: owned.product.imageUrl,
            type: owned.product.type,
            lifecycleStatus: owned.product.lifecycleStatus,
          })
        }
      }
    }
    if (init?.method === 'DELETE' && slotParam !== undefined) {
      // "Desequipar" REAL (HU-28.4, backend real en
      // feat/player-inventory-unequip): el preview vacia la ranura en el
      // mismo mapa en memoria que usa "Equipar", para que el flujo completo
      // -ranura ocupada -> Ficha muestra el objeto real -> Desequipar -> la
      // ranura se ve vacia, Stats/Efectos/capacidad se actualizan- se pueda
      // probar de verdad en Chrome.
      setEquipmentOverride(heroReference, slotParam as EquipmentSlotId, null)
    }
    return jsonResponse(buildEquipment(scenario, heroReference))
  }

  const epicMatch = /^\/api\/inventories\/me\/heroes\/([^/]+)\/epic$/u.exec(pathname)
  if (epicMatch) {
    const heroReference = decodeURIComponent(epicMatch[1] ?? HERO_REF)
    return jsonResponse(buildEpic(scenario, heroReference))
  }

  return null
}

/** Parseo defensivo del cuerpo JSON de un `PUT` (nunca lanza): el preview
 * simula al servicio, nunca debe romper la UI si el body no es el esperado. */
const parseJsonBody = (body: BodyInit | null | undefined): unknown => {
  if (typeof body !== 'string') return null
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

const PlayerInventoryDevToolbar = ({
  scenario,
}: {
  readonly scenario: Scenario
}): React.JSX.Element => {
  const theme = useTheme((state) => state.theme)
  const setTheme = useTheme((state) => state.setTheme)
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <div className="inventory-dev-toolbar">
      <p>
        Vista previa de desarrollo — fixtures DEV, no llegan a Player-Inventory/Catalog. Escenario:{' '}
        <strong>{scenario}</strong>
      </p>
      <div
        role="group"
        aria-label="Escenario (solo DEV)"
        className="inventory-dev-toolbar__scenario"
      >
        {SCENARIOS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={scenario === option}
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.set('scenario', option)
              setSearchParams(next)
            }}
            className="inventory-dev-toolbar__theme-btn"
          >
            {option}
          </button>
        ))}
      </div>
      <div
        role="group"
        aria-label="Tema de la vista previa (solo DEV)"
        className="inventory-dev-toolbar__theme"
      >
        {DEV_THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={theme === option.value}
            onClick={() => {
              setTheme(option.value)
            }}
            className="inventory-dev-toolbar__theme-btn"
          >
            <span aria-hidden>{option.value === 'light' ? '☀' : '☽'}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export const PlayerInventoryDevPreview = (): React.JSX.Element => {
  const [searchParams] = useSearchParams()
  const rawScenario = searchParams.get('scenario')
  const scenario: Scenario = isScenario(rawScenario) ? rawScenario : 'items'

  // El parche de `fetch` se instala SINCRONICAMENTE durante el render (no en
  // un `useEffect`): React ejecuta los efectos de los HIJOS antes que los del
  // padre, y `PlayerInventoryPage` dispara sus queries de React Query en un
  // efecto propio -mas profundo en el arbol-. Si el parche viviera en un
  // `useEffect` de este componente, esa primera peticion (ya en vuelo con el
  // `fetch` ORIGINAL, sin interceptar) saldria hacia el backend real -que no
  // existe en local- y la pantalla quedaria vacia para siempre, sin ningun
  // error visible (bug real, encontrado en QA visual con Chrome real:
  // "Todavia no tienes heroes"/"0 objetos" incluso con `?scenario=items`).
  // `currentScenarioRef` se actualiza en cada render para que el parche -que
  // solo se instala una vez por `useState`- siga leyendo el escenario vigente
  // sin tener que reinstalarse.
  const scenarioRef = useRef(scenario)
  useEffect(() => {
    scenarioRef.current = scenario
  }, [scenario])

  useState(() => {
    if (fetchPatchInstalled) return null
    fetchPatchInstalled = true
    const original = globalThis.fetch

    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const parsed = new URL(url, globalThis.location.origin)

      if (parsed.pathname.startsWith('/api/inventories/me/')) {
        const handled = handleInventoryRequest(
          scenarioRef.current,
          parsed.pathname,
          parsed.searchParams,
          init,
        )
        if (handled !== null) return Promise.resolve(handled)
      }

      return original(input, init)
    }

    return null
  })

  return (
    <div className="min-h-dvh">
      <PlayerInventoryDevToolbar scenario={scenario} />
      {/*
       * Mismo contenedor que `AppLayout.tsx` usa en produccion para
       * `/inventory` (`inventory-main mx-auto w-full px-3 py-4 sm:px-4`) —
       * QA visual necesita ver EXACTAMENTE el layout de produccion.
       */}
      <main className="inventory-main mx-auto w-full px-3 py-4 sm:px-4">
        <PlayerInventoryPage />
      </main>
    </div>
  )
}
