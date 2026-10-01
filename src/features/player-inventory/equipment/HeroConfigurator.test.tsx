import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { setLanguage } from '@/shared/i18n/language'
import { renderWithProviders } from '@/test/render'
import type { HeroProgression } from '../heroSelectionApi'
import type { EquipmentSlotId } from './api'
import { HeroConfigurator } from './HeroConfigurator'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Nadie ha preparado ningun heroe: `fetchHeroSelection` trata el 404 como `null`, no como error. */
const NO_SELECTION = (): Response => json({ message: 'Sin seleccion.' }, 404)

const BASE_STATS = { power: 5, health: 40, defense: 8, attack: 10, damage: null, healing: null }

/** Progresion nivel 1 / XP 0, la misma semantica perezosa de HU-08 para un heroe sin recompensas. */
const NO_PROGRESSION: HeroProgression = {
  level: 1,
  currentXp: 0,
  floorForCurrentLevel: 0,
  nextLevel: { status: 'AVAILABLE', forNextLevel: 2, amount: 100 },
  maxLevel: 8,
}

/** Un heroe POSEIDO tal como lo devuelve `GET /inventories/me/heroes`. */
const ownedHero = (
  reference: string,
  name: string,
  subtype: string,
  progression: HeroProgression = NO_PROGRESSION,
) => ({
  heroId: `pid-${reference}`,
  reference,
  subtype,
  name,
  imageUrl: `https://assets.example.test/${reference}.png`,
  lifecycleStatus: 'ACTIVE',
  baseStats: BASE_STATS,
  abilities: [],
  selected: false,
  progression,
})

const OWNED = [ownedHero('guerrero-tanque', 'Guerrero Tanque', 'GUERRERO_TANQUE')]

/**
 * Enruta por URL: la lista de heroes propios (`/inventories/me/heroes`), la
 * seleccion preparada (`/heroes/selection`) y el equipamiento. Un mock ciego le
 * daria a una respuesta la forma de otra y el test pasaria por casualidad.
 */
const routedFetch =
  (
    onEquipment: (url: string, init?: RequestInit) => Response,
    onSelection: (url: string, init?: RequestInit) => Response = NO_SELECTION,
    heroes: () => Response = () => json(OWNED),
  ): ((input: string, init?: RequestInit) => Promise<Response>) =>
  (input: string, init?: RequestInit) =>
    Promise.resolve(
      input.endsWith('/inventories/me/heroes')
        ? heroes()
        : input.includes('/selection')
          ? onSelection(input, init)
          : onEquipment(input, init),
    )

const EMPTY_EQUIPMENT = {
  hero: {
    heroId: 'pid-guerrero-tanque',
    reference: 'guerrero-tanque',
    subtype: 'GUERRERO_TANQUE',
    name: 'Guerrero Tanque',
    imageUrl: 'https://assets.example.test/guerrero-tanque.png',
  },
  equipment: { weapons: [], armor: {}, items: [] },
  baseStats: BASE_STATS,
  effectiveStats: BASE_STATS,
  deltas: [],
  activeEffects: [],
  locked: false,
}

const EQUIPPED = {
  ...EMPTY_EQUIPMENT,
  equipment: {
    weapons: [
      {
        slot: 'WEAPON_1',
        itemId: 'espada-de-fuego',
        productId: 'pid-espada-de-fuego',
        name: 'Espada de Fuego',
        imageUrl: 'https://assets.example.test/espada.png',
        type: 'ARMA',
        lifecycleStatus: 'ACTIVE',
      },
    ],
    armor: {},
    items: [],
  },
  effectiveStats: { ...BASE_STATS, attack: 12 },
  deltas: [{ statistic: 'ATTACK', base: 10, effective: 12, delta: 2 }],
  activeEffects: [
    {
      sourceSlot: 'WEAPON_1',
      sourceProductId: 'pid-espada-de-fuego',
      sourceProductReference: 'espada-de-fuego',
      kind: 'STAT_MODIFIER',
      target: 'SELF',
      statistic: 'ATTACK',
      operation: 'INCREASE',
      magnitude: { mode: 'FIXED', amount: 2 },
      hasActivationCondition: false,
      appliedToStats: true,
    },
  ],
}

const selectionOf = (
  ready: boolean,
  used: { weapons: number; armor: number; items: number } = { weapons: 0, armor: 0, items: 0 },
): Record<string, unknown> => ({
  selectedAt: '2026-09-20T00:00:00.000Z',
  configuration: EMPTY_EQUIPMENT,
  readiness: {
    ready,
    blockers: ready
      ? []
      : [
          {
            code: 'EQUIPPED_PRODUCT_NOT_OWNED',
            slot: 'WEAPON_1',
            reference: 'espada-de-fuego',
            detail: 'Ya no tienes ese producto equipado.',
          },
        ],
  },
  capacity: {
    weapons: { used: used.weapons, max: 2 },
    armor: { used: used.armor, max: 6 },
    items: { used: used.items, max: 2 },
  },
})

interface HarnessProps {
  readonly productReference?: string | null
  readonly productName?: string | null
  readonly productType?: string | null
}

const Harness = ({
  productReference = null,
  productName = null,
  productType = null,
}: HarnessProps): React.JSX.Element => {
  const [slot, setSlot] = useState<EquipmentSlotId | null>(null)
  return (
    <HeroConfigurator
      selectedProductReference={productReference}
      selectedProductName={productName}
      selectedProductType={productType}
      selectedSlot={slot}
      onSelectSlot={setSlot}
    />
  )
}

describe('HeroConfigurator (HU-28) — A. gestion del heroe', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista los heroes POSEIDOS desde su propio contrato; los prototipos no poseidos quedan bloqueados y compactos', async () => {
    fetchMock.mockImplementation(routedFetch(() => json(EMPTY_EQUIPMENT)))
    renderWithProviders(<Harness />)

    expect(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' })).toBeEnabled()
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).endsWith('/inventories/me/heroes')),
    ).toBe(true)
    // Nunca se finge propiedad: los otros siete aparecen deshabilitados, plegados.
    expect(screen.getByText('7 héroes del juego que aún no tienes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mago Fuego: no disponible' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: /no disponible$/u })).toHaveLength(7)
  })

  /**
   * HU-08: la progresion es del HEROE, no del jugador. Cambiar de heroe activo
   * debe mostrar la progresion del heroe recien elegido, y volver al anterior
   * debe recuperar la suya intacta -- nunca la del que quedo "preparado" ni un
   * dato mezclado entre los dos.
   */
  it('la progresion mostrada cambia con el heroe activo, y vuelve a la anterior al regresar', async () => {
    const user = userEvent.setup()
    const guerrero = ownedHero('guerrero-tanque', 'Guerrero Tanque', 'GUERRERO_TANQUE', {
      level: 2,
      currentXp: 215,
      floorForCurrentLevel: 100,
      nextLevel: { status: 'AVAILABLE', forNextLevel: 3, amount: 300 },
      maxLevel: 8,
    })
    const mago = ownedHero('mago-hielo', 'Mago Hielo', 'MAGO_HIELO', {
      level: 3,
      currentXp: 357,
      floorForCurrentLevel: 300,
      nextLevel: { status: 'AVAILABLE', forNextLevel: 4, amount: 500 },
      maxLevel: 8,
    })
    fetchMock.mockImplementation(
      routedFetch(
        () => json(EMPTY_EQUIPMENT),
        NO_SELECTION,
        () => json([guerrero, mago]),
      ),
    )

    renderWithProviders(<Harness />)
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
    expect(await screen.findByText('Nivel 2')).toBeInTheDocument()
    expect(screen.getByText('215 XP acumulada')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Seleccionar Mago Hielo' }))
    expect(await screen.findByText('Nivel 3')).toBeInTheDocument()
    expect(screen.getByText('357 XP acumulada')).toBeInTheDocument()
    expect(screen.queryByText('Nivel 2')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
    expect(await screen.findByText('Nivel 2')).toBeInTheDocument()
    expect(screen.getByText('215 XP acumulada')).toBeInTheDocument()
  })

  it('sin heroes propios lo explica y no permite equipar', async () => {
    fetchMock.mockImplementation(
      routedFetch(
        () => json(EMPTY_EQUIPMENT),
        NO_SELECTION,
        () => json([]),
      ),
    )
    renderWithProviders(<Harness />)

    expect(await screen.findByText(/Todavía no tienes héroes/u)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Equipar' })).toBeNull()
  })

  it('si la lista de heroes falla, lo dice en vez de afirmar que no hay heroes', async () => {
    fetchMock.mockImplementation(
      routedFetch(
        () => json(EMPTY_EQUIPMENT),
        NO_SELECTION,
        () => json({ message: 'Catalog no disponible.' }, 503),
      ),
    )
    renderWithProviders(<Harness />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Catalog no disponible.')
    expect(screen.queryByText(/Todavía no tienes héroes/u)).toBeNull()
  })

  it('sin heroe preparado, el boton dice "Confirmar para batalla" y avisa que el equipamiento se guarda solo', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(routedFetch(() => json(EMPTY_EQUIPMENT)))

    renderWithProviders(<Harness />)
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))

    expect(await screen.findByRole('button', { name: 'Confirmar para batalla' })).toBeEnabled()
    expect(
      screen.getByText('Los cambios de equipamiento se guardan automáticamente.'),
    ).toBeInTheDocument()
    // No existe un "Guardar equipamiento" que sugiera cambios sin persistir.
    expect(screen.queryByRole('button', { name: /guardar/iu })).toBeNull()
  })

  it('al entrar, el heroe REALMENTE preparado aparece elegido, con su insignia y su capacidad', async () => {
    fetchMock.mockImplementation(
      routedFetch(
        () => json(EMPTY_EQUIPMENT),
        () => json(selectionOf(true, { weapons: 1, armor: 0, items: 0 })),
      ),
    )

    renderWithProviders(<Harness />)

    expect(
      await screen.findByRole('button', {
        name: 'Seleccionar Guerrero Tanque (preparado para batalla)',
      }),
    ).toBeInTheDocument()
    expect(await screen.findByTestId('slot-WEAPON_1')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Preparado para batalla ✓' })).toBeDisabled()
    // Capacidad tal como la informa el servicio: no se cuenta en la Web.
    expect(screen.getByLabelText('Armas: 1 de 2 ocupadas')).toHaveTextContent('1/2')
    expect(screen.getByLabelText('Armadura: 0 de 6 ocupadas')).toHaveTextContent('0/6')
    expect(screen.getByLabelText('Ítems: 0 de 2 ocupadas')).toHaveTextContent('0/2')
  })

  it('confirmar para batalla invoca PUT .../heroes/selection y la insignia pasa al heroe recien confirmado', async () => {
    const user = userEvent.setup()
    let confirmedReference: string | null = null
    fetchMock.mockImplementation(
      routedFetch(
        () => json(EMPTY_EQUIPMENT),
        (_url, init) => {
          if (init?.method === 'PUT') {
            const body = JSON.parse(init.body as string) as { heroReference: string }
            confirmedReference = body.heroReference
            return json(selectionOf(true))
          }
          return NO_SELECTION()
        },
      ),
    )

    renderWithProviders(<Harness />)
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar para batalla' }))

    await waitFor(() => {
      expect(confirmedReference).toBe('guerrero-tanque')
    })
    expect(await screen.findByRole('button', { name: 'Preparado para batalla ✓' })).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: 'Seleccionar Guerrero Tanque (preparado para batalla)',
      }),
    ).toBeInTheDocument()
  })

  it('un heroe preparado pero no listo muestra los avisos del servicio, sin inventar el motivo', async () => {
    fetchMock.mockImplementation(
      routedFetch(
        () => json(EMPTY_EQUIPMENT),
        () => json(selectionOf(false)),
      ),
    )

    renderWithProviders(<Harness />)

    expect(
      await screen.findByText('Este héroe todavía no puede entrar a una batalla.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ya no tienes ese producto equipado.')).toBeInTheDocument()
  })

  it('en ingles, el aviso de elegibilidad se describe por CODIGO, no copiando el texto en español', async () => {
    await setLanguage('en')
    fetchMock.mockImplementation(
      routedFetch(
        () => json(EMPTY_EQUIPMENT),
        () => json(selectionOf(false)),
      ),
    )

    renderWithProviders(<Harness />)

    expect(await screen.findByText('This hero cannot enter a battle yet.')).toBeInTheDocument()
    expect(
      screen.getByText(
        'You no longer own the item equipped in Weapon 1. Remove it from that slot.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Ya no tienes ese producto equipado.')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Hero setup' })).toBeInTheDocument()
  })
})

describe('HeroConfigurator (HU-28) — B. gestor de equipamiento', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('al elegir un heroe propio muestra las diez ranuras, las estadisticas y los efectos', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(routedFetch(() => json(EMPTY_EQUIPMENT)))

    renderWithProviders(<Harness />)
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))

    for (const slot of [
      'WEAPON_1',
      'WEAPON_2',
      'HELMET',
      'CHEST',
      'GLOVES',
      'BRACERS',
      'PANTS',
      'SHOES',
      'ITEM_1',
      'ITEM_2',
    ]) {
      expect(await screen.findByTestId(`slot-${slot}`)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Casco: vacío. Elegir esta ranura' })).toBeEnabled()
    expect(screen.getByText('Estadísticas')).toBeInTheDocument()
    expect(screen.getByText('Sin efectos: no hay piezas equipadas.')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Equipamiento de Guerrero Tanque' }),
    ).toBeInTheDocument()
  })

  it('con un arma elegida en el inventario, las ranuras de arma se marcan como compatibles', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(routedFetch(() => json(EMPTY_EQUIPMENT)))

    renderWithProviders(
      <Harness
        productReference="espada-de-fuego"
        productName="Espada de Fuego"
        productType="ARMA"
      />,
    )
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))

    expect(await screen.findByTestId('slot-WEAPON_1')).toHaveAttribute('data-compatible', 'true')
    expect(screen.getByTestId('slot-WEAPON_2')).toHaveAttribute('data-compatible', 'true')
    expect(screen.getByTestId('slot-HELMET')).not.toHaveAttribute('data-compatible')
  })

  it('con ranura y producto compatible, Equipar persiste, refleja el estado y vuelve a pedir la seleccion preparada', async () => {
    const user = userEvent.setup()
    let equipped = false
    let selectionReads = 0
    fetchMock.mockImplementation(
      routedFetch(
        (_url, init) => {
          if (init?.method === 'PUT') {
            equipped = true
            return json(EQUIPPED)
          }
          return json(equipped ? EQUIPPED : EMPTY_EQUIPMENT)
        },
        () => {
          selectionReads += 1
          return json(selectionOf(true, { weapons: equipped ? 1 : 0, armor: 0, items: 0 }))
        },
      ),
    )

    renderWithProviders(
      <Harness
        productReference="espada-de-fuego"
        productName="Espada de Fuego"
        productType="ARMA"
      />,
    )
    await user.click(await screen.findByTestId('slot-WEAPON_1'))
    expect(screen.getByText('Seleccionado: Espada de Fuego')).toBeInTheDocument()

    const readsBefore = selectionReads
    const equipButton = await screen.findByRole('button', { name: 'Equipar' })
    expect(equipButton).toBeEnabled()
    await user.click(equipButton)

    await waitFor(() => {
      expect(equipped).toBe(true)
    })
    expect(
      await within(screen.getByTestId('slot-WEAPON_1')).findByText('Espada de Fuego'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('delta-ATTACK')).toHaveTextContent('+2')
    expect(screen.getByText(/aplicado a stats/u)).toBeInTheDocument()
    // La seleccion preparada (capacidad, elegibilidad) no queda desactualizada.
    await waitFor(() => {
      expect(selectionReads).toBeGreaterThan(readsBefore)
    })
    expect(await screen.findByLabelText('Armas: 1 de 2 ocupadas')).toHaveTextContent('1/2')
  })

  it('un producto de tipo incompatible con la ranura deja Equipar deshabilitado', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(routedFetch(() => json(EMPTY_EQUIPMENT)))

    renderWithProviders(<Harness productReference="casco-de-acero" productType="ARMADURA" />)
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
    await user.click(await screen.findByTestId('slot-WEAPON_1'))

    expect(await screen.findByRole('button', { name: 'Equipar' })).toBeDisabled()
  })

  it('muestra el mensaje del backend cuando la ranura ya esta ocupada (409)', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(
      routedFetch((_url, init) => {
        if (init?.method === 'PUT') {
          return json({ message: 'La ranura WEAPON_1 ya esta ocupada.' }, 409)
        }
        return json(EMPTY_EQUIPMENT)
      }),
    )

    renderWithProviders(<Harness productReference="espada-de-fuego" productType="ARMA" />)
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
    await user.click(await screen.findByTestId('slot-WEAPON_1'))
    await user.click(await screen.findByRole('button', { name: 'Equipar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ya esta ocupada')
  })

  it('en otro idioma, el 409 se describe por estado sin mostrar el texto en español', async () => {
    await setLanguage('fr')
    const user = userEvent.setup()
    fetchMock.mockImplementation(
      routedFetch((_url, init) => {
        if (init?.method === 'PUT') {
          return json({ message: 'La ranura WEAPON_1 ya esta ocupada.' }, 409)
        }
        return json(EMPTY_EQUIPMENT)
      }),
    )

    renderWithProviders(<Harness productReference="espada-de-fuego" productType="ARMA" />)
    await user.click(await screen.findByRole('button', { name: 'Sélectionner Guerrero Tanque' }))
    await user.click(await screen.findByTestId('slot-WEAPON_1'))
    await user.click(await screen.findByRole('button', { name: 'Équiper' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("L'opération est en conflit avec l'état actuel.")
    expect(alert).not.toHaveTextContent('ocupada')
  })

  it('propaga el 503 de Catalog al consultar el equipamiento', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(
      routedFetch(() => json({ message: 'Catalog no disponible.' }, 503)),
    )

    renderWithProviders(<Harness />)
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Catalog no disponible.')
  })
})

/**
 * HU-29.6 (sobre Player-Inventory #26, ya en `develop`): consumir `locked` y
 * el 409 `reason: 'battle_lock'` del contrato de equipamiento, SIN que Web
 * decida nada por su cuenta -- ni calcula si hay batalla, ni mira la URL, ni
 * guarda el estado en `localStorage`. Lo unico que cambia aqui es como se
 * PRESENTA lo que Player/Inventory ya decidio.
 */
describe('HeroConfigurator (HU-29) — bloqueo de equipamiento en combate', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const BATTLE_LOCK_BODY = {
    reason: 'battle_lock',
    message:
      'No se puede modificar el equipamiento porque el heroe participa en una batalla activa.',
  }

  // W-01
  it('con locked:false, los controles de equipar funcionan con normalidad', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(routedFetch(() => json({ ...EMPTY_EQUIPMENT, locked: false })))

    renderWithProviders(
      <Harness
        productReference="espada-de-fuego"
        productName="Espada de Fuego"
        productType="ARMA"
      />,
    )
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
    await user.click(await screen.findByTestId('slot-WEAPON_1'))

    expect(await screen.findByRole('button', { name: 'Equipar' })).toBeEnabled()
    expect(screen.queryByRole('status')).toBeNull()
  })

  // W-02
  it('con locked:true, avisa de forma visible y deshabilita Equipar', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(routedFetch(() => json({ ...EMPTY_EQUIPMENT, locked: true })))

    renderWithProviders(
      <Harness
        productReference="espada-de-fuego"
        productName="Espada de Fuego"
        productType="ARMA"
      />,
    )
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('El equipamiento no se puede modificar')
    expect(notice).toHaveTextContent('batalla activa')
    // La ranura esta deshabilitada: `data-testid` esta en el propio boton.
    expect(await screen.findByTestId('slot-WEAPON_1')).toBeDisabled()
  })

  // W-03, W-07
  it('con equipo existente y locked:true, ninguna pieza desaparece de pantalla', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(routedFetch(() => json({ ...EQUIPPED, locked: true })))

    renderWithProviders(<Harness />)
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))

    expect(
      await within(screen.getByTestId('slot-WEAPON_1')).findByText('Espada de Fuego'),
    ).toBeInTheDocument()
    expect(await screen.findByRole('status')).toBeInTheDocument()
  })

  // W-04
  it('si locked:false al leer pero el PUT responde 409 battle_lock, muestra el motivo y no simula el cambio', async () => {
    const user = userEvent.setup()
    let getCount = 0
    fetchMock.mockImplementation(
      routedFetch((_url, init) => {
        if (init?.method === 'PUT') {
          return json(BATTLE_LOCK_BODY, 409)
        }
        getCount += 1
        // Tras el 409 se vuelve a pedir el estado real: la batalla SIGUE activa.
        return json({ ...EMPTY_EQUIPMENT, locked: getCount > 1 })
      }),
    )

    renderWithProviders(
      <Harness
        productReference="espada-de-fuego"
        productName="Espada de Fuego"
        productType="ARMA"
      />,
    )
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
    await user.click(await screen.findByTestId('slot-WEAPON_1'))
    await user.click(await screen.findByRole('button', { name: 'Equipar' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('batalla activa')
    // No se pinta ningun arma equipada: el PUT fallo, nada se escribio en cache.
    expect(within(screen.getByTestId('slot-WEAPON_1')).queryByText('Espada de Fuego')).toBeNull()
    // El rechazo invalida la consulta: se repite el GET con el estado real.
    await waitFor(() => {
      expect(getCount).toBeGreaterThan(1)
    })
    expect(await screen.findByRole('status')).toBeInTheDocument()
  })

  // W-06: la MISMA invalidacion de W-04, pero la batalla termino justo antes de
  // que el GET repetido llegara -- el flujo normal vuelve solo, sin un segundo
  // mecanismo de sondeo propio de HU-29, y sin que el jugador repita nada.
  it('si para cuando se repite el GET la batalla ya termino, Equipar se vuelve a habilitar solo', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(
      routedFetch((_url, init) => {
        if (init?.method === 'PUT') {
          return json(BATTLE_LOCK_BODY, 409)
        }
        // La lectura inicial decia locked:false (por eso se pudo intentar);
        // el GET repetido tras el rechazo confirma que ya no hay bloqueo.
        return json({ ...EMPTY_EQUIPMENT, locked: false })
      }),
    )

    renderWithProviders(
      <Harness
        productReference="espada-de-fuego"
        productName="Espada de Fuego"
        productType="ARMA"
      />,
    )
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
    await user.click(await screen.findByTestId('slot-WEAPON_1'))
    await user.click(await screen.findByRole('button', { name: 'Equipar' }))

    await screen.findByRole('alert')
    expect(screen.queryByRole('status')).toBeNull()
    // Sin re-seleccionar nada: el GET invalidado ya trae locked:false, y
    // `canEquip` se recalcula con el estado fresco.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Equipar' })).toBeEnabled()
    })
  })

  // W-05 (regresion): un 409 que NO es battle_lock conserva su tratamiento anterior
  it('un 409 de otra regla de HU-28 no se etiqueta como battle_lock', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(
      routedFetch((_url, init) => {
        if (init?.method === 'PUT') {
          return json({ message: 'La ranura WEAPON_1 ya esta ocupada.' }, 409)
        }
        return json({ ...EMPTY_EQUIPMENT, locked: false })
      }),
    )

    renderWithProviders(<Harness productReference="espada-de-fuego" productType="ARMA" />)
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
    await user.click(await screen.findByTestId('slot-WEAPON_1'))
    await user.click(await screen.findByRole('button', { name: 'Equipar' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('ya esta ocupada')
    expect(alert).not.toHaveTextContent('batalla activa')
  })

  // W-08, W-09: la ranura de armadura y de item tambien quedan cubiertas por
  // el mismo `disabled` uniforme que ya probo W-02 para WEAPON_1 -- no hay un
  // guard distinto por categoria en la UI (la autoridad de categoria vive en
  // Player/Inventory). Se confirma explicitamente para armadura e item.
  it('con locked:true, las ranuras de armadura y de item tambien quedan deshabilitadas', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(routedFetch(() => json({ ...EMPTY_EQUIPMENT, locked: true })))

    renderWithProviders(<Harness />)
    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))

    expect(await screen.findByTestId('slot-HELMET')).toBeDisabled()
    expect(screen.getByTestId('slot-ITEM_1')).toBeDisabled()
  })
})
