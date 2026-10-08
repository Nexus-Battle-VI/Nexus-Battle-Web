import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
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
  progression: {
    level: 1,
    currentXp: 0,
    floorForCurrentLevel: 0,
    nextLevel: { status: 'AVAILABLE', forNextLevel: 2, amount: 100 },
    maxLevel: 8,
  },
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

  it('pagina (RF-27 servidor=16, UI=8): 20 objetos se presentan en 3 páginas de 8/8/4, sin pedir al servidor un tamaño que no soporta', async () => {
    const user = userEvent.setup()
    // Player-Inventory devuelve SIEMPRE paginas de 16 (RF-27, no configurable
    // desde el cliente): 20 objetos -> pagina 1 real con 16, pagina 2 real
    // con 4. Web vuelve a paginar esto del lado del cliente en bloques de 8
    // (decision de producto), sin pedirle nunca al servidor un tamano de
    // pagina de 8 que no existe en su contrato.
    const allItems = Array.from({ length: 20 }, (_, index) =>
      summary(`item-${String(index + 1).padStart(2, '0')}`, `Objeto ${String(index + 1)}`),
    )
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      const serverPage = url.includes('page=2') ? 2 : 1
      const start = (serverPage - 1) * 16
      return Promise.resolve(
        jsonResponse(
          page(allItems.slice(start, start + 16), {
            page: serverPage,
            totalItems: 20,
            totalPages: 2,
          }),
        ),
      )
    })

    render()
    // UI pagina 1 de 8: los primeros 8 objetos (del servidor pagina 1), y
    // NINGUNO de los siguientes.
    await screen.findByText('Objeto 1')
    expect(screen.getByText('Objeto 8')).toBeInTheDocument()
    expect(screen.queryByText('Objeto 9')).toBeNull()
    expect(screen.getByText(/20 objetos/u)).toBeInTheDocument()
    expect(screen.getByText(/página 1 de 3/u)).toBeInTheDocument()
    // Solo se pidio la pagina REAL 1 al servidor hasta ahora.
    expect(fetchMock.mock.calls.every((call) => !urlOf(call[0]).includes('page=2'))).toBe(true)

    // UI pagina 2 de 8: objetos 9-16, TODAVIA dentro de la misma pagina real
    // del servidor (1) -no dispara una nueva peticion-.
    await user.click(screen.getByRole('button', { name: 'Página 2' }))
    await screen.findByText('Objeto 9')
    expect(screen.getByText('Objeto 16')).toBeInTheDocument()
    expect(screen.queryByText('Objeto 1')).toBeNull()
    expect(screen.queryByText('Objeto 17')).toBeNull()
    expect(screen.getByText(/página 2 de 3/u)).toBeInTheDocument()
    expect(fetchMock.mock.calls.every((call) => !urlOf(call[0]).includes('page=2'))).toBe(true)

    // UI pagina 3 de 8: objetos 17-20 (solo 4), que SI vive en la pagina real
    // 2 del servidor -aqui si se dispara la peticion real `page=2`-.
    await user.click(screen.getByRole('button', { name: 'Página 3' }))
    await screen.findByText('Objeto 17')
    expect(screen.getByText('Objeto 20')).toBeInTheDocument()
    expect(screen.queryByText('Objeto 16')).toBeNull()
    expect(screen.getByText(/página 3 de 3/u)).toBeInTheDocument()
    expect(fetchMock.mock.calls.some((call) => urlOf(call[0]).includes('page=2'))).toBe(true)
  })

  it('sin héroes propios, el configurador de HU-28 lo dice y no ofrece equipar', async () => {
    fetchMock.mockResolvedValue(jsonResponse(page([summary('espada-larga', 'Espada Larga')])))

    render()
    await screen.findByText('Espada Larga')

    expect(screen.getByRole('heading', { name: 'Configurar héroe' })).toBeInTheDocument()
    expect(await screen.findByText(/Todavía no tienes héroes/u)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Equipar$/u })).toBeNull()
    // No hay auto-equip ni bloqueo de batalla visible sin heroe.
    expect(screen.queryByText(/batalla/iu)).toBeNull()
    // HU-31: el panel de epica tambien pide elegir un heroe primero -misma
    // guardia que el de equipamiento-, no ofrece equipar sin uno.
    expect(screen.getByText('Elige un héroe para ver su épica equipada.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Equipar épica$/u })).toBeNull()
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

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Tus héroes' }),
      'guerrero-tanque',
    )
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
   * Mock minimo de `DataTransfer`: jsdom no implementa la API nativa
   * completa, pero el componente SOLO llama `setData`/`getData`/
   * `dropEffect`/`effectAllowed` -un objeto plano con esos miembros basta
   * para ejercitar el codigo real sin inventar un polyfill completo-.
   */
  const fakeDataTransfer = (): DataTransfer => {
    const store = new Map<string, string>()
    return {
      setData: (format: string, data: string) => {
        store.set(format, data)
      },
      getData: (format: string) => store.get(format) ?? '',
      dropEffect: 'none',
      effectAllowed: 'none',
    } as unknown as DataTransfer
  }

  it('HU-28 Drag & Drop: arrastrar un arma compatible a una ranura vacía la equipa (mismo flujo real que el click)', async () => {
    const heroEmpty = {
      hero: {
        heroId: 'pid-guerrero-tanque',
        reference: 'guerrero-tanque',
        subtype: 'GUERRERO_TANQUE',
        name: 'Guerrero Tanque',
        imageUrl: '',
      },
      equipment: { weapons: [], armor: {}, items: [] },
      baseStats: { power: 5, health: 40, defense: 8, attack: 10, damage: null, healing: null },
      effectiveStats: { power: 5, health: 40, defense: 8, attack: 10, damage: null, healing: null },
      deltas: [],
      activeEffects: [],
    }
    const heroEquipped = {
      ...heroEmpty,
      equipment: {
        weapons: [
          {
            slot: 'WEAPON_1',
            itemId: 'espada-de-fuego',
            productId: 'pid-espada-de-fuego',
            name: 'Espada de Fuego',
            imageUrl: '',
            type: 'ARMA',
            lifecycleStatus: 'ACTIVE',
          },
        ],
        armor: {},
        items: [],
      },
    }
    let equipCalls = 0
    ownedHeroes = [GUERRERO]
    fetchMock.mockImplementation((input, init) => {
      const url = urlOf(input)
      if (url.includes('/heroes/guerrero-tanque/equipment') && init?.method === 'PUT') {
        equipCalls += 1
        return Promise.resolve(jsonResponse(heroEquipped))
      }
      if (url.includes('/heroes/guerrero-tanque/equipment')) {
        return Promise.resolve(jsonResponse(equipCalls > 0 ? heroEquipped : heroEmpty))
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
    await userEvent
      .setup()
      .selectOptions(await screen.findByRole('combobox', { name: 'Tus héroes' }), 'guerrero-tanque')

    const card = screen.getByTestId('inventory-item-espada-de-fuego')
    const slot = await screen.findByTestId('slot-WEAPON_1')
    const dataTransfer = fakeDataTransfer()

    fireEvent.dragStart(card, { dataTransfer })
    fireEvent.dragOver(slot, { dataTransfer })
    fireEvent.drop(slot, { dataTransfer })
    fireEvent.dragEnd(card, { dataTransfer })

    await waitFor(() => {
      expect(equipCalls).toBe(1)
    })
    expect(
      await within(screen.getByTestId('slot-WEAPON_1')).findByText('Espada de Fuego'),
    ).toBeInTheDocument()
  })

  it('HU-28 Drag & Drop: soltar sobre una ranura incompatible NO muta nada', async () => {
    ownedHeroes = [GUERRERO]
    let putCalls = 0
    fetchMock.mockImplementation((input, init) => {
      const url = urlOf(input)
      if (url.includes('/heroes/guerrero-tanque/equipment') && init?.method === 'PUT') {
        putCalls += 1
      }
      if (url.includes('/heroes/guerrero-tanque/equipment')) {
        return Promise.resolve(
          jsonResponse({
            hero: {
              heroId: 'pid-guerrero-tanque',
              reference: 'guerrero-tanque',
              subtype: 'GUERRERO_TANQUE',
              name: 'Guerrero Tanque',
              imageUrl: '',
            },
            equipment: { weapons: [], armor: {}, items: [] },
            baseStats: {
              power: 5,
              health: 40,
              defense: 8,
              attack: 10,
              damage: null,
              healing: null,
            },
            effectiveStats: {
              power: 5,
              health: 40,
              defense: 8,
              attack: 10,
              damage: null,
              healing: null,
            },
            deltas: [],
            activeEffects: [],
          }),
        )
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
    await userEvent
      .setup()
      .selectOptions(await screen.findByRole('combobox', { name: 'Tus héroes' }), 'guerrero-tanque')

    const card = screen.getByTestId('inventory-item-espada-de-fuego')
    // HELMET admite ARMADURA, no ARMA: soltar un arma ahi debe ser un no-op.
    const incompatibleSlot = await screen.findByTestId('slot-HELMET')
    const dataTransfer = fakeDataTransfer()

    fireEvent.dragStart(card, { dataTransfer })
    fireEvent.dragOver(incompatibleSlot, { dataTransfer })
    fireEvent.drop(incompatibleSlot, { dataTransfer })
    fireEvent.dragEnd(card, { dataTransfer })

    // Nada que esperar con `waitFor` porque NO deberia pasar nada: se
    // confirma que, tras dar tiempo a cualquier microtask pendiente, sigue
    // en cero.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(putCalls).toBe(0)
    expect(incompatibleSlot).not.toHaveAttribute('data-filled')
  })

  it('HU-28 Drag & Drop: reemplazo -- arrastrar B sobre una ranura ocupada por A equipa B (misma regla real que el click)', async () => {
    const withA = {
      hero: {
        heroId: 'pid-guerrero-tanque',
        reference: 'guerrero-tanque',
        subtype: 'GUERRERO_TANQUE',
        name: 'Guerrero Tanque',
        imageUrl: '',
      },
      equipment: {
        weapons: [
          {
            slot: 'WEAPON_1',
            itemId: 'espada-a',
            productId: 'pid-espada-a',
            name: 'Espada A',
            imageUrl: '',
            type: 'ARMA',
            lifecycleStatus: 'ACTIVE',
          },
        ],
        armor: {},
        items: [],
      },
      baseStats: { power: 5, health: 40, defense: 8, attack: 10, damage: null, healing: null },
      effectiveStats: { power: 5, health: 40, defense: 8, attack: 10, damage: null, healing: null },
      deltas: [],
      activeEffects: [],
    }
    const withB = {
      ...withA,
      equipment: {
        weapons: [
          { ...withA.equipment.weapons[0], slot: 'WEAPON_1', itemId: 'espada-b', name: 'Espada B' },
        ],
        armor: {},
        items: [],
      },
    }

    ownedHeroes = [GUERRERO]
    let replaced = false
    fetchMock.mockImplementation((input, init) => {
      const url = urlOf(input)
      if (url.includes('/heroes/guerrero-tanque/equipment') && init?.method === 'PUT') {
        // Backend real (HU-28): ranura ocupada responde 409 salvo que el
        // caso de uso REAL de Equip la reemplace -se simula la respuesta
        // de exito tal como la devuelve el backend tras la mutacion-.
        replaced = true
        return Promise.resolve(jsonResponse(withB))
      }
      if (url.includes('/heroes/guerrero-tanque/equipment')) {
        return Promise.resolve(jsonResponse(replaced ? withB : withA))
      }
      if (url.includes('/items/espada-b')) {
        return Promise.resolve(jsonResponse(detail('espada-b', 'Espada B')))
      }
      if (url.includes('/items/espada-a')) {
        return Promise.resolve(jsonResponse(detail('espada-a', 'Espada A')))
      }
      return Promise.resolve(
        jsonResponse(
          page([
            summary('guerrero-tanque', 'Guerrero Tanque', 'HEROE'),
            summary('espada-a', 'Espada A', 'ARMA'),
            summary('espada-b', 'Espada B', 'ARMA'),
          ]),
        ),
      )
    })

    render()
    await screen.findByText('Espada A')
    await userEvent
      .setup()
      .selectOptions(await screen.findByRole('combobox', { name: 'Tus héroes' }), 'guerrero-tanque')
    await within(await screen.findByTestId('slot-WEAPON_1')).findByText('Espada A')

    const cardB = screen.getByTestId('inventory-item-espada-b')
    const slot = screen.getByTestId('slot-WEAPON_1')
    const dataTransfer = fakeDataTransfer()

    fireEvent.dragStart(cardB, { dataTransfer })
    fireEvent.dragOver(slot, { dataTransfer })
    fireEvent.drop(slot, { dataTransfer })
    fireEvent.dragEnd(cardB, { dataTransfer })

    await waitFor(() => {
      expect(replaced).toBe(true)
    })
    expect(
      await within(screen.getByTestId('slot-WEAPON_1')).findByText('Espada B'),
    ).toBeInTheDocument()
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
    // `getAllByText` porque "Guerrero Tanque ✓" tambien aparece como texto de
    // la opcion seleccionada en el `<select>` de heroes (mismo sufijo real de
    // "preparado", en dos lugares distintos de la misma pantalla).
    expect(screen.getAllByText('Guerrero Tanque ✓').length).toBeGreaterThan(0)
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

      expect(await screen.findByRole('option', { name: 'Guerrero Tanque' })).toBeInTheDocument()
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
      expect(screen.getByRole('option', { name: 'Guerrero Tanque' })).toBeInTheDocument()
    })

    it('en la pagina real 2 del servidor (RF-27, 16 por pagina), el heroe propio sigue disponible', async () => {
      const user = userEvent.setup()
      ownedHeroes = [GUERRERO]
      // 17 objetos: servidor pagina 1 trae 16, servidor pagina 2 trae 1 solo
      // ("Objeto 17"). La UI, repaginada en bloques de 8, llega a esa pagina
      // real 2 en su propia "Página 3" (objetos 17 en adelante).
      const allItems = Array.from({ length: 17 }, (_, index) =>
        summary(`objeto-${String(index + 1)}`, `Objeto ${String(index + 1)}`),
      )
      fetchMock.mockImplementation((input) => {
        const second = urlOf(input).includes('page=2')
        const items = second ? allItems.slice(16) : allItems.slice(0, 16)
        return Promise.resolve(
          jsonResponse(page(items, { page: second ? 2 : 1, totalItems: 17, totalPages: 2 })),
        )
      })

      render()
      await screen.findByText('Objeto 1')
      await user.click(screen.getByRole('button', { name: 'Página 3' }))
      await screen.findByText('Objeto 17')

      expect(screen.getByRole('option', { name: 'Guerrero Tanque' })).toBeInTheDocument()
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
