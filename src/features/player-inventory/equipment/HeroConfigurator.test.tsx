import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import type { EquipmentSlotId } from './api'
import { HeroConfigurator, type OwnedHero } from './HeroConfigurator'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Nadie ha preparado ningun heroe: `fetchHeroSelection` trata el 404 como `null`, no como error. */
const NO_SELECTION = (): Response => json({ message: 'Sin seleccion.' }, 404)

/**
 * Enruta por URL en vez de responder lo mismo a cualquier peticion: desde que
 * `HeroConfigurator` tambien consulta `GET/PUT .../heroes/selection` (HU-07),
 * un mock ciego le daria la forma de `HeroEquipment` a una respuesta que se
 * lee como `HeroSelection`, y el test pasaria por casualidad, no por
 * construccion. `onEquipment` recibe lo que antes recibia el mock completo
 * (`url`, `init`); `onSelection` por defecto dice "nada preparado todavia".
 */
const routedFetch =
  (
    onEquipment: (url: string, init?: RequestInit) => Response,
    onSelection: (url: string, init?: RequestInit) => Response = NO_SELECTION,
  ): ((input: string, init?: RequestInit) => Promise<Response>) =>
  (input: string, init?: RequestInit) => {
    const url = input

    return Promise.resolve(
      url.includes('/selection') ? onSelection(url, init) : onEquipment(url, init),
    )
  }

const EMPTY_EQUIPMENT = {
  hero: {
    heroId: 'pid-guerrero-tanque',
    reference: 'guerrero-tanque',
    subtype: 'GUERRERO_TANQUE',
    name: 'Guerrero Tanque',
    imageUrl: 'https://assets.example.test/guerrero-tanque.png',
  },
  equipment: { weapons: [], armor: {}, items: [] },
  baseStats: { power: 5, health: 40, defense: 8, attack: 10, damage: null, healing: null },
  effectiveStats: { power: 5, health: 40, defense: 8, attack: 10, damage: null, healing: null },
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
  effectiveStats: { power: 5, health: 40, defense: 8, attack: 12, damage: null, healing: null },
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

const OWNED: OwnedHero[] = [{ reference: 'guerrero-tanque', name: 'Guerrero Tanque' }]

interface HarnessProps {
  readonly ownedHeroes?: readonly OwnedHero[]
  readonly productReference?: string | null
  readonly productType?: string | null
}

const Harness = ({
  ownedHeroes = OWNED,
  productReference = null,
  productType = null,
}: HarnessProps): React.JSX.Element => {
  const [slot, setSlot] = useState<EquipmentSlotId | null>(null)
  return (
    <HeroConfigurator
      ownedHeroes={ownedHeroes}
      selectedProductReference={productReference}
      selectedProductType={productType}
      selectedSlot={slot}
      onSelectSlot={setSlot}
    />
  )
}

describe('HeroConfigurator (HU-28)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra los ocho héroes; solo el poseído es seleccionable, el resto queda bloqueado', () => {
    renderWithProviders(<Harness />)

    expect(screen.getByRole('button', { name: 'Seleccionar Guerrero Tanque' })).toBeEnabled()
    const locked = screen.getByRole('button', { name: 'Mago Fuego: no disponible' })
    expect(locked).toBeDisabled()
    // Nunca se finge propiedad: los ocho aparecen, pero solo uno actúa.
    expect(screen.getAllByRole('button', { name: /no disponible$/u })).toHaveLength(7)
  })

  it('sin héroes propios explica que no hay ninguno y no permite equipar', () => {
    renderWithProviders(<Harness ownedHeroes={[]} />)

    expect(screen.getByText(/No tienes héroes en esta vista/u)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Equipar' })).toBeNull()
  })

  it('al elegir un héroe propio consulta su equipamiento y muestra las diez ranuras y las estadísticas', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(routedFetch(() => json(EMPTY_EQUIPMENT)))

    renderWithProviders(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Seleccionar Guerrero Tanque' }))

    expect(await screen.findByTestId('slot-WEAPON_1')).toBeInTheDocument()
    expect(screen.getByTestId('slot-SHOES')).toBeInTheDocument()
    expect(screen.getByTestId('slot-ITEM_2')).toBeInTheDocument()
    expect(screen.getByText('Estadísticas')).toBeInTheDocument()
    expect(screen.getByText('Sin efectos: no hay piezas equipadas.')).toBeInTheDocument()
  })

  it('con ranura elegida y producto compatible, Equipar llama al backend y refleja el nuevo estado', async () => {
    const user = userEvent.setup()
    let equipped = false
    fetchMock.mockImplementation(
      routedFetch((url, init) => {
        if (init?.method === 'PUT') {
          equipped = true
          return json(EQUIPPED)
        }
        return json(equipped ? EQUIPPED : EMPTY_EQUIPMENT)
      }),
    )

    renderWithProviders(<Harness productReference="espada-de-fuego" productType="ARMA" />)
    await user.click(screen.getByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
    await user.click(await screen.findByTestId('slot-WEAPON_1'))

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
  })

  it('un producto de tipo incompatible con la ranura deja Equipar deshabilitado', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(routedFetch(() => json(EMPTY_EQUIPMENT)))

    renderWithProviders(<Harness productReference="casco-de-acero" productType="ARMADURA" />)
    await user.click(screen.getByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
    await user.click(await screen.findByTestId('slot-WEAPON_1'))

    expect(await screen.findByRole('button', { name: 'Equipar' })).toBeDisabled()
  })

  it('muestra el mensaje del backend cuando la ranura ya está ocupada (409)', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(
      routedFetch((url, init) => {
        if (init?.method === 'PUT') {
          return json({ message: 'La ranura WEAPON_1 ya esta ocupada.' }, 409)
        }
        return json(EMPTY_EQUIPMENT)
      }),
    )

    renderWithProviders(<Harness productReference="espada-de-fuego" productType="ARMA" />)
    await user.click(screen.getByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
    await user.click(await screen.findByTestId('slot-WEAPON_1'))
    await user.click(await screen.findByRole('button', { name: 'Equipar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ya esta ocupada')
  })

  it('propaga el 503 de Catalog al consultar el equipamiento', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(
      routedFetch(() => json({ message: 'Catalog no disponible.' }, 503)),
    )

    renderWithProviders(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Seleccionar Guerrero Tanque' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Catalog no disponible.')
  })

  describe('preparar para batalla (HU-07, consolidacion de "Mi Héroe")', () => {
    const selectionOf = (ready: boolean): Record<string, unknown> => ({
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
        weapons: { used: 0, max: 2 },
        armor: { used: 0, max: 6 },
        items: { used: 0, max: 2 },
      },
    })

    it('sin heroe preparado, el heroe propio no muestra la insignia y el boton dice "Confirmar para batalla"', async () => {
      const user = userEvent.setup()
      fetchMock.mockImplementation(routedFetch(() => json(EMPTY_EQUIPMENT)))

      renderWithProviders(<Harness />)
      expect(
        screen.getByRole('button', { name: 'Seleccionar Guerrero Tanque' }),
      ).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Seleccionar Guerrero Tanque' }))

      const confirmButton = await screen.findByRole('button', { name: 'Confirmar para batalla' })
      expect(confirmButton).toBeEnabled()
    })

    it('al entrar, el heroe REALMENTE preparado aparece elegido de una, con su insignia', async () => {
      fetchMock.mockImplementation(
        routedFetch(
          () => json(EMPTY_EQUIPMENT),
          () => json(selectionOf(true)),
        ),
      )

      renderWithProviders(<Harness />)

      expect(
        await screen.findByRole('button', {
          name: 'Seleccionar Guerrero Tanque (preparado para batalla)',
        }),
      ).toBeInTheDocument()
      // Ya esta preparado: el equipamiento se consulto solo, sin pulsar nada.
      expect(await screen.findByTestId('slot-WEAPON_1')).toBeInTheDocument()
      expect(await screen.findByRole('button', { name: 'Preparado para batalla ✓' })).toBeDisabled()
    })

    it('confirmar para batalla invoca PUT .../heroes/selection y la insignia pasa al heroe recien confirmado', async () => {
      const user = userEvent.setup()
      let confirmedReference: string | null = null
      fetchMock.mockImplementation(
        routedFetch(
          () => json(EMPTY_EQUIPMENT),
          (url, init) => {
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
      await user.click(screen.getByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
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

    it('un heroe preparado pero no listo muestra los avisos de elegibilidad, sin inventar el motivo', async () => {
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
  })
})
