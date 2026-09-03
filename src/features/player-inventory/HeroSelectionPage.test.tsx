import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/lib/http'
import { renderWithProviders } from '@/test/render'

import type { HeroEquipment } from './equipment/api'
import * as api from './heroSelectionApi'
import { HeroSelectionPage } from './HeroSelectionPage'

const heroe = (patch: Partial<api.AvailableHero> = {}): api.AvailableHero => ({
  heroId: `pid-${patch.reference ?? 'guerrero-tanque'}`,
  reference: 'guerrero-tanque',
  subtype: 'GUERRERO_TANQUE',
  name: 'Guerrero Tanque',
  imageUrl: 'https://assets.example.test/guerrero.png',
  lifecycleStatus: 'ACTIVE',
  baseStats: { power: 1, health: 44, defense: 11, attack: 10, damage: null, healing: null },
  abilities: [{ reference: 'hab-1', name: 'Golpe con escudo' }],
  selected: false,
  ...patch,
})

const configuracion = (patch: Partial<HeroEquipment> = {}): HeroEquipment => ({
  hero: {
    heroId: 'pid-guerrero-tanque',
    reference: 'guerrero-tanque',
    subtype: 'GUERRERO_TANQUE',
    name: 'Guerrero Tanque',
    imageUrl: 'https://assets.example.test/guerrero.png',
  },
  equipment: {
    weapons: [],
    armor: {
      HELMET: null,
      CHEST: null,
      GLOVES: null,
      BRACERS: null,
      PANTS: null,
      SHOES: null,
    },
    items: [],
  },
  baseStats: { power: 1, health: 44, defense: 11, attack: 10, damage: null, healing: null },
  effectiveStats: { power: 1, health: 44, defense: 11, attack: 10, damage: null, healing: null },
  deltas: [],
  activeEffects: [],
  ...patch,
})

const seleccion = (patch: Partial<api.HeroSelection> = {}): api.HeroSelection => ({
  selectedAt: '2026-09-03T10:00:00.000Z',
  configuration: configuracion(),
  readiness: { ready: true, blockers: [] },
  capacity: {
    weapons: { used: 0, max: 2 },
    armor: { used: 0, max: 6 },
    items: { used: 0, max: 2 },
  },
  ...patch,
})

const montar = (): void => {
  renderWithProviders(<HeroSelectionPage />, { route: '/heroes' })
}

describe('Selección de héroe (HU-07)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * El recuento sale de la respuesta, no de un ocho escrito a mano. Con tres
   * héroes en el inventario el encabezado dice tres; si estuviera fijado,
   * mentiría en cuanto el inventario no tuviera exactamente ocho.
   */
  it('el encabezado cuenta los héroes que devuelve el servicio', async () => {
    vi.spyOn(api, 'fetchAvailableHeroes').mockResolvedValue([
      heroe(),
      heroe({ reference: 'mago-fuego', subtype: 'MAGO_FUEGO', name: 'Mago Fuego' }),
      heroe({ reference: 'chaman', subtype: 'CHAMAN', name: 'Chamán' }),
    ])
    vi.spyOn(api, 'fetchHeroSelection').mockResolvedValue(null)

    montar()

    expect(await screen.findByText(/Catálogo de héroes \(3\)/i)).toBeInTheDocument()
  })

  /**
   * CONTROL DE CA-11: un héroe que no está entre los ocho prototipos se
   * presenta igual, con la etiqueta derivada de su subtipo. Si la pantalla
   * codificara los ocho, este héroe no aparecería o aparecería sin rol.
   */
  it('un héroe nuevo del catálogo se muestra sin tratarlo como caso especial', async () => {
    vi.spyOn(api, 'fetchAvailableHeroes').mockResolvedValue([
      heroe(),
      heroe({
        reference: 'druida-bosque',
        subtype: 'DRUIDA_BOSQUE',
        name: 'Druida del Bosque',
        heroId: 'pid-druida',
      }),
    ])
    vi.spyOn(api, 'fetchHeroSelection').mockResolvedValue(null)

    montar()

    expect(await screen.findByText('Druida del Bosque')).toBeInTheDocument()
    expect(screen.getByText('Druida')).toBeInTheDocument()
    expect(screen.getByText(/Catálogo de héroes \(2\)/i)).toBeInTheDocument()
  })

  it('elegir un héroe lo envía al servicio y muestra sus estadísticas base', async () => {
    vi.spyOn(api, 'fetchAvailableHeroes').mockResolvedValue([
      heroe(),
      heroe({
        reference: 'mago-fuego',
        subtype: 'MAGO_FUEGO',
        name: 'Mago Fuego',
        heroId: 'pid-mf',
      }),
    ])
    vi.spyOn(api, 'fetchHeroSelection').mockResolvedValue(null)
    const elegir = vi.spyOn(api, 'selectHero').mockResolvedValue(seleccion())

    montar()

    await userEvent.click(await screen.findByRole('button', { name: /Guerrero Tanque/i }))

    expect(elegir).toHaveBeenCalledWith('guerrero-tanque')
    expect(await screen.findByText('Estadísticas base')).toBeInTheDocument()
    expect(screen.getByText('44')).toBeInTheDocument()
  })

  /**
   * Lo que el catálogo no publica se dice, no se rellena. El nivel no forma
   * parte del contrato canónico del héroe: escribir un «1» sería enseñar una
   * estadística que nadie calculó.
   */
  it('marca como PENDIENTE lo que el catálogo no publica', async () => {
    vi.spyOn(api, 'fetchAvailableHeroes').mockResolvedValue([
      heroe({
        baseStats: { power: 1, health: 30, defense: 6, attack: null, damage: null, healing: null },
      }),
    ])
    vi.spyOn(api, 'fetchHeroSelection').mockResolvedValue(seleccion())

    montar()

    // Nivel, Ataque y Daño: tres huecos que el contrato canónico no llena.
    expect(await screen.findAllByText('PENDIENTE')).toHaveLength(3)
  })

  it('un héroe suspendido se muestra pero no se puede preparar', async () => {
    vi.spyOn(api, 'fetchAvailableHeroes').mockResolvedValue([
      heroe({ lifecycleStatus: 'SUSPENDED', name: 'Héroe retirado' }),
    ])
    vi.spyOn(api, 'fetchHeroSelection').mockResolvedValue(null)
    const elegir = vi.spyOn(api, 'selectHero')

    montar()

    const fila = await screen.findByRole('button', { name: /Héroe retirado/i })
    expect(fila).toBeDisabled()
    expect(screen.getByText('No disponible')).toBeInTheDocument()
    expect(elegir).not.toHaveBeenCalled()
  })

  /**
   * No haber elegido todavía es la primera visita, no un fallo. Enseñar un
   * mensaje de error ahí asustaría sin motivo.
   */
  it('sin héroe preparado no muestra ningún error', async () => {
    vi.spyOn(api, 'fetchAvailableHeroes').mockResolvedValue([heroe()])
    vi.spyOn(api, 'fetchHeroSelection').mockResolvedValue(null)

    montar()

    await screen.findByText(/Catálogo de héroes \(1\)/i)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('un inventario sin héroes lo dice y no finge un catálogo', async () => {
    vi.spyOn(api, 'fetchAvailableHeroes').mockResolvedValue([])
    vi.spyOn(api, 'fetchHeroSelection').mockResolvedValue(null)

    montar()

    expect(await screen.findByText(/Todavía no tienes ningún héroe/i)).toBeInTheDocument()
    expect(screen.queryByText(/Catálogo de héroes/i)).not.toBeInTheDocument()
  })

  /**
   * CA-10: si el héroe está listo lo decide el servicio. La pantalla muestra su
   * veredicto y sus motivos; no los recalcula. El motivo del ejemplo es
   * literalmente el texto que envía el servicio.
   */
  it('muestra los impedimentos que envía el servicio, no unos propios', async () => {
    vi.spyOn(api, 'fetchAvailableHeroes').mockResolvedValue([heroe({ selected: true })])
    vi.spyOn(api, 'fetchHeroSelection').mockResolvedValue(
      seleccion({
        readiness: {
          ready: false,
          blockers: [
            {
              code: 'EQUIPPED_PRODUCT_NOT_OWNED',
              slot: 'WEAPON_1',
              reference: 'espada-vendida',
              detail: '"Espada" ya no esta en tu inventario. Retirala de la ranura WEAPON_1.',
            },
          ],
        },
      }),
    )

    montar()

    expect(await screen.findByText(/todavía no puede entrar a una batalla/i)).toBeInTheDocument()
    expect(screen.getByText(/ya no esta en tu inventario/i)).toBeInTheDocument()
  })

  it('un héroe sin impedimentos se declara listo', async () => {
    vi.spyOn(api, 'fetchAvailableHeroes').mockResolvedValue([heroe({ selected: true })])
    vi.spyOn(api, 'fetchHeroSelection').mockResolvedValue(seleccion())

    montar()

    expect(await screen.findByText(/listo para batalla, misión o torneo/i)).toBeInTheDocument()
    expect(screen.queryByText(/todavía no puede entrar/i)).not.toBeInTheDocument()
  })

  it('el resumen enseña las diez ranuras y lo que hay equipado', async () => {
    vi.spyOn(api, 'fetchAvailableHeroes').mockResolvedValue([heroe({ selected: true })])
    vi.spyOn(api, 'fetchHeroSelection').mockResolvedValue(
      seleccion({
        configuration: configuracion({
          equipment: {
            weapons: [
              {
                slot: 'WEAPON_1',
                itemId: 'espada-de-fuego',
                productId: 'pid-espada',
                name: 'Espada de fuego',
                imageUrl: '',
                type: 'ARMA',
                lifecycleStatus: 'ACTIVE',
              },
            ],
            armor: {
              HELMET: null,
              CHEST: null,
              GLOVES: null,
              BRACERS: null,
              PANTS: null,
              SHOES: null,
            },
            items: [],
          },
        }),
      }),
    )

    montar()

    const resumen = await screen.findByRole('list', { name: 'Resumen del equipamiento' })
    expect(resumen.querySelectorAll('li')).toHaveLength(10)
    expect(await screen.findByText('Espada de fuego')).toBeInTheDocument()
    // Las nueve ranuras restantes siguen vacías.
    expect(screen.getAllByText('Vacío')).toHaveLength(9)
  })

  it('el pie lleva a la pantalla donde se equipa (HU-28)', async () => {
    vi.spyOn(api, 'fetchAvailableHeroes').mockResolvedValue([heroe()])
    vi.spyOn(api, 'fetchHeroSelection').mockResolvedValue(null)

    montar()

    expect(await screen.findByRole('link', { name: 'Ir a equipar' })).toHaveAttribute(
      'href',
      '/inventory',
    )
  })

  it('explica un rechazo del servicio al preparar el héroe', async () => {
    vi.spyOn(api, 'fetchAvailableHeroes').mockResolvedValue([heroe()])
    vi.spyOn(api, 'fetchHeroSelection').mockResolvedValue(null)
    vi.spyOn(api, 'selectHero').mockRejectedValue(
      new HttpError(409, 'El heroe no esta disponible en el catalogo vigente.', null),
    )

    montar()

    await userEvent.click(await screen.findByRole('button', { name: /Guerrero Tanque/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no esta disponible/i)
  })
})
