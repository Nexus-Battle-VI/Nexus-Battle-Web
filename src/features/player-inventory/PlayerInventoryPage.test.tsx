import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { setLanguage } from '@/shared/i18n/language'
import { renderWithProviders } from '@/test/render'
import { PlayerInventoryPage } from './PlayerInventoryPage'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

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

/** Nadie ha preparado ningun heroe: `fetchHeroSelection` trata el 404 como `null`, no como error. */
const NO_SELECTION = (): Response => jsonResponse({ message: 'Sin seleccion.' }, 404)

const BASE_STATS = { power: 5, health: 40, defense: 8, attack: 10, damage: null, healing: null }

/** Heroe POSEIDO tal como lo devuelve `GET /inventories/me/heroes` (HU-07). */
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

const GUERRERO = ownedHero('guerrero-tanque', 'Guerrero Tanque', 'GUERRERO_TANQUE')
const isHeroList = (url: string): boolean => url.endsWith('/inventories/me/heroes')

describe('PlayerInventoryPage', () => {
  // Cada prueba de este archivo configura `fetchMock` pensando SOLO en el
  // inventario (HU-27/HU-28); ahora que la pantalla tambien consulta
  // `GET .../heroes/selection` (HU-07, insignia de "Héroe preparado"), un
  // `fetch` global que delegara ciegamente le daria forma de pagina de
  // inventario a esa respuesta. En vez de tocar cada prueba existente, el
  // `fetch` global intercepta esa URL con un 404 ("nada preparado todavia") y
  // delega el resto, sin cambiar, a `fetchMock`.
  //
  // Lo mismo con la lista de heroes propios (`GET /inventories/me/heroes`), que
  // desde el rediseño alimenta el selector de heroes: responde `ownedHeroes`,
  // que cada prueba puede fijar.
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
  let ownedHeroes: unknown[] = []
  const globalFetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlOf(input)

    if (isHeroList(url)) return Promise.resolve(jsonResponse(ownedHeroes))

    return url.includes('/heroes/selection')
      ? Promise.resolve(NO_SELECTION())
      : fetchMock(input, init)
  })

  beforeEach(() => {
    vi.stubGlobal('fetch', globalFetch)
    fetchMock.mockReset()
    ownedHeroes = []
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
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
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
    // Los efectos se leen en palabras, no como codigos de Catalog.
    expect(within(detailPanel).getByText('Daño 5 al rival')).toBeInTheDocument()
    expect(within(detailPanel).queryByText(/DAMAGE|OPPONENT/u)).toBeNull()
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
        expect(fetchMock.mock.calls.some((call) => urlOf(call[0]).includes('q=espada'))).toBe(true)
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
      expect(fetchMock.mock.calls.some((call) => urlOf(call[0]).includes('type=ITEM'))).toBe(true)
    })
  })

  it('muestra el mensaje del servicio cuando la búsqueda no puede resolverse (503)', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
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
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
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
    expect(fetchMock.mock.calls.some((call) => urlOf(call[0]).includes('page=2'))).toBe(true)
  })

  it('sin héroes propios, el configurador de HU-28 lo dice y no ofrece equipar', async () => {
    fetchMock.mockResolvedValue(jsonResponse(page([summary('espada-larga', 'Espada Larga')])))

    render()
    await screen.findByText('Espada Larga')

    expect(screen.getByRole('heading', { name: 'Configurar héroe' })).toBeInTheDocument()
    expect(await screen.findByText(/Todavía no tienes héroes/u)).toBeInTheDocument()
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
    ownedHeroes = [GUERRERO]
    fetchMock.mockImplementation((input, init) => {
      const url = urlOf(input)
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

    await user.click(await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }))
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

  /**
   * HU-07 (2026-09-22, consolidacion de "Mi Héroe" en "Mi Inventario"): con un
   * héroe ya preparado, la cabecera lo dice de una -sin entrar a "Mi Héroe",
   * que ya no existe como pantalla propia (ver `routes.test.tsx`).
   */
  it('con un héroe ya preparado, la cabecera muestra "Héroe preparado" con su nombre', async () => {
    const heroEquipment = {
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
    const selection = {
      selectedAt: '2026-09-20T00:00:00.000Z',
      configuration: heroEquipment,
      readiness: { ready: true, blockers: [] },
      capacity: {
        weapons: { used: 0, max: 2 },
        armor: { used: 0, max: 6 },
        items: { used: 0, max: 2 },
      },
    }

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

        if (isHeroList(url)) {
          return Promise.resolve(jsonResponse([GUERRERO]))
        }
        if (url.includes('/heroes/selection')) {
          return Promise.resolve(jsonResponse(selection))
        }
        if (url.includes('/heroes/guerrero-tanque/equipment')) {
          return Promise.resolve(jsonResponse(heroEquipment))
        }
        return Promise.resolve(
          jsonResponse(page([summary('guerrero-tanque', 'Guerrero Tanque', 'HEROE')])),
        )
      }),
    )

    render()

    expect(await screen.findByText('Héroe preparado:')).toBeInTheDocument()
    expect(screen.getByText('Guerrero Tanque ✓')).toBeInTheDocument()
  })
  /**
   * Regresion del defecto del rediseño: antes los heroes del configurador se
   * derivaban de la pagina VISIBLE del inventario, y desaparecian al filtrar,
   * buscar o cambiar de pagina. Ahora salen de `GET /inventories/me/heroes`.
   */
  describe('el selector de heroes no depende del filtro, la busqueda ni la pagina', () => {
    const onlyWeapons = () =>
      Promise.resolve(jsonResponse(page([summary('espada-larga', 'Espada Larga', 'ARMA')])))

    it('con el filtro Armas, el heroe propio sigue disponible', async () => {
      const user = userEvent.setup()
      ownedHeroes = [GUERRERO]
      fetchMock.mockImplementation(onlyWeapons)

      render()
      await screen.findByText('Espada Larga')
      await user.click(screen.getByRole('button', { name: 'Armas' }))

      expect(
        await screen.findByRole('button', { name: 'Seleccionar Guerrero Tanque' }),
      ).toBeInTheDocument()
    })

    it('con una busqueda que no lo incluye, el heroe propio sigue disponible', async () => {
      const user = userEvent.setup()
      ownedHeroes = [GUERRERO]
      fetchMock.mockImplementation(onlyWeapons)

      render()
      await screen.findByText('Espada Larga')
      await user.type(screen.getByLabelText('Buscar por nombre'), 'espada')

      await waitFor(() => {
        expect(fetchMock.mock.calls.some(([input]) => urlOf(input).includes('q=espada'))).toBe(true)
      })
      expect(
        screen.getByRole('button', { name: 'Seleccionar Guerrero Tanque' }),
      ).toBeInTheDocument()
    })

    it('en la pagina 2 del inventario, el heroe propio sigue disponible', async () => {
      const user = userEvent.setup()
      ownedHeroes = [GUERRERO]
      fetchMock.mockImplementation((input) => {
        const second = urlOf(input).includes('page=2')
        return Promise.resolve(
          jsonResponse(
            page([summary(second ? 'objeto-2' : 'objeto-1', second ? 'Objeto 2' : 'Objeto 1')], {
              page: second ? 2 : 1,
              totalItems: 17,
              totalPages: 2,
            }),
          ),
        )
      })

      render()
      await screen.findByText('Objeto 1')
      await user.click(screen.getByRole('button', { name: 'Página 2' }))
      await screen.findByText('Objeto 2')

      expect(
        screen.getByRole('button', { name: 'Seleccionar Guerrero Tanque' }),
      ).toBeInTheDocument()
    })
  })

  it('traduce la pantalla al cambiar de idioma sin traducir los nombres de productos', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      jsonResponse(page([summary('daga-de-fuego', 'Daga de fuego', 'ARMA')])),
    )
    await setLanguage('fr')

    render()

    expect(await screen.findByRole('heading', { name: 'Mon inventaire' })).toBeInTheDocument()
    // El nombre del producto es contenido de Catalog: no se traduce.
    expect(await screen.findByText('Daga de fuego')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Armes' }))
    expect(screen.getByRole('button', { name: 'Armes' })).toHaveAttribute('aria-pressed', 'true')
  })
})
