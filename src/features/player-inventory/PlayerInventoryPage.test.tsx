import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { PlayerInventoryPage } from './PlayerInventoryPage'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const summary = (itemId: string, name: string, type = 'ARMA') => ({
  itemId,
  quantity: 2,
  product: {
    productId: `pid-${itemId}`,
    sku: itemId,
    name,
    imageUrl: `https://assets.example.test/${itemId}.png`,
    type,
    lifecycleStatus: 'ACTIVE',
  },
})

const page = (items: ReturnType<typeof summary>[], overrides: Record<string, unknown> = {}) => ({
  items,
  page: 1,
  pageSize: 16,
  totalItems: items.length,
  totalPages: 1,
  ...overrides,
})

const detail = (itemId: string, name: string) => ({
  itemId,
  quantity: 2,
  product: {
    productId: `pid-${itemId}`,
    sku: itemId,
    name,
    imageUrl: `https://assets.example.test/${itemId}.png`,
    description: `Ficha completa de ${name}`,
    type: 'ARMA',
    lifecycleStatus: 'ACTIVE',
    creditsPrice: 40,
    premium: false,
    realMoneyPrice: null,
    attributes: {
      schemaVersion: '1',
      values: {
        kind: 'ARMA',
        compatibilityScope: 'ALL_HEROES',
        effects: [{ kind: 'DAMAGE', target: 'OPPONENT', magnitude: { mode: 'FIXED', amount: 5 } }],
      },
    },
  },
})

describe('PlayerInventoryPage', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const render = () => renderWithProviders(<PlayerInventoryPage />, { route: '/inventory' })

  it('muestra el estado de carga y después las tarjetas del inventario', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(page([summary('espada-larga', 'Espada Larga'), summary('escudo', 'Escudo')])),
    )

    render()

    expect(screen.getByText('Cargando...')).toBeInTheDocument()

    expect(await screen.findByText('Espada Larga')).toBeInTheDocument()
    expect(screen.getByText('Escudo')).toBeInTheDocument()
    expect(screen.getByText(/2 objetos/u)).toBeInTheDocument()
  })

  it('distingue el inventario vacío de un error', async () => {
    fetchMock.mockResolvedValue(jsonResponse(page([])))

    render()

    expect(await screen.findByText('Tu inventario está vacío.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('al elegir una tarjeta actualiza el panel de detalle en la misma vista', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/items/espada-larga')) {
        return Promise.resolve(jsonResponse(detail('espada-larga', 'Espada Larga')))
      }
      return Promise.resolve(jsonResponse(page([summary('espada-larga', 'Espada Larga')])))
    })

    render()
    await user.click(await screen.findByTestId('inventory-item-espada-larga'))

    const detailPanel = screen.getByRole('complementary', { name: 'Detalle del objeto' })
    expect(
      await within(detailPanel).findByText('Ficha completa de Espada Larga'),
    ).toBeInTheDocument()
    expect(within(detailPanel).getByText(/DAMAGE/u)).toBeInTheDocument()
    // Sin calificación ni comentarios: no pertenecen a Mi Inventario.
    expect(within(detailPanel).queryByText(/estrella|calificaci|comentario/iu)).toBeNull()
  })

  it('no busca con menos de 4 caracteres y muestra una pista', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(jsonResponse(page([summary('espada-larga', 'Espada Larga')])))

    render()
    await screen.findByText('Espada Larga')
    const callsBefore = fetchMock.mock.calls.length

    await user.type(screen.getByLabelText('Buscar por nombre'), 'esp')

    expect(await screen.findByText(/al menos 4 caracteres/u)).toBeInTheDocument()
    // Ningún request nuevo por un término corto.
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(fetchMock.mock.calls.length).toBe(callsBefore)
  })

  it('con 4 caracteres o más envía la búsqueda al servicio', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(jsonResponse(page([summary('espada-larga', 'Espada Larga')])))

    render()
    await screen.findByText('Espada Larga')

    await user.type(screen.getByLabelText('Buscar por nombre'), 'espada')

    await waitFor(
      () => {
        expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('q=espada'))).toBe(true)
      },
      { timeout: 2_000 },
    )
  })

  it('filtra por tipo canónico', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(jsonResponse(page([summary('pocion', 'Poción', 'ITEM')])))

    render()
    await screen.findByText('Poción')

    await user.click(screen.getByRole('button', { name: 'Ítems' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('type=ITEM'))).toBe(true)
    })
  })

  it('muestra el mensaje del servicio cuando la búsqueda no puede resolverse (503)', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('q=espada')) {
        return Promise.resolve(
          jsonResponse({ message: 'La información del producto no está disponible.' }, 503),
        )
      }
      return Promise.resolve(jsonResponse(page([summary('espada-larga', 'Espada Larga')])))
    })

    render()
    await screen.findByText('Espada Larga')
    await user.type(screen.getByLabelText('Buscar por nombre'), 'espada')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La información del producto no está disponible.',
    )
  })

  it('pagina: hay controles cuando el servicio reporta más de una página', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation((url: string) => {
      const current = url.includes('page=2') ? 2 : 1
      return Promise.resolve(
        jsonResponse(
          page([summary(`item-p${String(current)}`, `Objeto página ${String(current)}`)], {
            page: current,
            totalItems: 20,
            totalPages: 2,
          }),
        ),
      )
    })

    render()
    await screen.findByText('Objeto página 1')

    await user.click(screen.getByRole('button', { name: 'Página 2' }))

    expect(await screen.findByText('Objeto página 2')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('page=2'))).toBe(true)
  })

  it('sin héroes visibles, el configurador de HU-28 no ofrece equipar', async () => {
    fetchMock.mockResolvedValue(jsonResponse(page([summary('espada-larga', 'Espada Larga')])))

    render()
    await screen.findByText('Espada Larga')

    expect(screen.getByRole('heading', { name: 'Configurar héroe' })).toBeInTheDocument()
    expect(screen.getByText(/No tienes héroes en esta vista del inventario/u)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Equipar$/u })).toBeNull()
    // No hay auto-equip ni HU-29/épicas en la vista.
    expect(screen.queryByText(/batalla|épica|epic/iu)).toBeNull()
  })

  it('HU-28: elegir héroe propio, ranura y producto compatible equipa y refleja el nuevo estado', async () => {
    const user = userEvent.setup()
    const heroEquipmentEmpty = {
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
    const heroEquipmentEquipped = {
      ...heroEquipmentEmpty,
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
    }

    let equipped = false
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/heroes/guerrero-tanque/equipment') && init?.method === 'PUT') {
        equipped = true
        return Promise.resolve(jsonResponse(heroEquipmentEquipped))
      }
      if (url.includes('/heroes/guerrero-tanque/equipment')) {
        return Promise.resolve(jsonResponse(equipped ? heroEquipmentEquipped : heroEquipmentEmpty))
      }
      if (url.includes('/items/espada-de-fuego')) {
        return Promise.resolve(jsonResponse(detail('espada-de-fuego', 'Espada de Fuego')))
      }
      return Promise.resolve(
        jsonResponse(
          page([
            summary('guerrero-tanque', 'Guerrero Tanque', 'HEROE'),
            summary('espada-de-fuego', 'Espada de Fuego', 'ARMA'),
          ]),
        ),
      )
    })

    render()
    await screen.findByText('Espada de Fuego')

    await user.click(screen.getByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
    await user.click(await screen.findByTestId('slot-WEAPON_1'))
    await user.click(screen.getByTestId('inventory-item-espada-de-fuego'))

    const equipButton = await screen.findByRole('button', { name: 'Equipar' })
    await user.click(equipButton)

    await waitFor(() => {
      expect(equipped).toBe(true)
    })
    // La ranura y las estadísticas efectivas reflejan el nuevo estado.
    expect(
      await within(screen.getByTestId('slot-WEAPON_1')).findByText('Espada de Fuego'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('delta-ATTACK')).toHaveTextContent('+2')
  })
})
