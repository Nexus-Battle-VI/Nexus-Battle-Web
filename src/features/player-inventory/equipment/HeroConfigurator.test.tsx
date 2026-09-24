import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { setLanguage } from '@/shared/i18n/language'
import { renderWithProviders } from '@/test/render'
import type { EquipmentSlotId } from './api'
import { HeroConfigurator } from './HeroConfigurator'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Nadie ha preparado ningun heroe: `fetchHeroSelection` trata el 404 como `null`, no como error. */
const NO_SELECTION = (): Response => json({ message: 'Sin seleccion.' }, 404)

const BASE_STATS = { power: 5, health: 40, defense: 8, attack: 10, damage: null, healing: null }

/** Un heroe POSEIDO tal como lo devuelve `GET /inventories/me/heroes`. */
const ownedHero = (reference: string, name: string, subtype: string) => ({
  heroId: `pid-${reference}`,
  reference,
  subtype,
  name,
  imageUrl: `https://assets.example.test/${reference}.png`,
  lifecycleStatus: 'ACTIVE',
  baseStats: BASE_STATS,
  abilities: [],
  selected: false,
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
