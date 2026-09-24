import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useSession } from '@/shared/session'
import { missionContentFixture, RELIC_PRODUCT } from '@/test/mission-content-fixture'
import { jsonResponse } from '@/test/missions-fixtures'
import { renderWithProviders } from '@/test/render'

import type { MissionContent } from './admin/missionContent'
import { MissionContentEditorPage } from './MissionContentEditorPage'

interface Call {
  readonly method: string
  readonly path: string
  readonly body: unknown
}

/** Missions y Catalog de mentira: lista la mision del fixture y devuelve lo guardado. */
const stubApi = (
  saveResponse: (body: MissionContent) => Response = (body) => jsonResponse(200, body),
  missions: readonly MissionContent[] = [missionContentFixture()],
): Call[] => {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const url = new URL(raw, globalThis.location.origin)
      const method = init?.method ?? 'GET'
      const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
      calls.push({ method, path: url.pathname, body })
      if (url.pathname === '/api/v1/admin/missions') {
        return Promise.resolve(jsonResponse(200, missions))
      }
      if (url.pathname.startsWith('/api/v1/admin/missions/') && method === 'PUT') {
        return Promise.resolve(saveResponse(body as MissionContent))
      }
      if (url.pathname === '/api/v1/catalog/products') {
        return Promise.resolve(
          jsonResponse(200, {
            items: [
              RELIC_PRODUCT,
              { productId: 'heroe-1', name: 'Reliquia viviente', type: 'HEROE' },
            ],
            page: 1,
            pageSize: 16,
            total: 2,
          }),
        )
      }
      if (url.pathname === `/api/v1/catalog/products/${RELIC_PRODUCT.productId}`) {
        return Promise.resolve(jsonResponse(200, RELIC_PRODUCT))
      }
      return Promise.resolve(jsonResponse(404, { message: 'No encontrado.' }))
    }),
  )
  return calls
}

const savedBody = (calls: readonly Call[]): MissionContent => {
  const saves = calls.filter((call) => call.method === 'PUT')
  const last = saves[saves.length - 1]
  if (last === undefined) throw new Error('No se guardó nada.')
  return last.body as MissionContent
}

type User = ReturnType<typeof userEvent.setup>

const openTemple = async (user: User): Promise<void> => {
  await user.click(await screen.findByRole('button', { name: /El templo olvidado/u }))
}

const goTo = async (user: User, name: string): Promise<void> => {
  await user.click(screen.getByRole('tab', { name: new RegExp(`^${name}`, 'u') }))
}

const save = async (user: User): Promise<void> => {
  await user.click(screen.getByRole('button', { name: 'Guardar' }))
}

beforeEach(() => {
  useSession.setState({
    subject: 'admin-ana',
    accessToken: 'jwt-vigente',
    expiresAt: Date.now() + 900_000,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('editor de misiones del administrador', () => {
  it('abre una misión en un formulario por pestañas, sin JSON a la vista', async () => {
    const user = userEvent.setup()
    stubApi()
    renderWithProviders(<MissionContentEditorPage />)

    expect(await screen.findByText(/Historia · Publicada/u)).toBeInTheDocument()
    await openTemple(user)

    expect(screen.getByRole('heading', { name: 'Editar «El templo olvidado»' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText(/^Nombre/u)).toHaveValue('El templo olvidado')
    expect(screen.getByLabelText(/^Identificador/u)).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Publicada')).toBeChecked()
    expect(screen.queryByLabelText('Definición JSON')).not.toBeInTheDocument()
    expect(screen.getByText('Sin cambios')).toBeInTheDocument()
  })

  it('guarda lo editado con el total de enemigos, el jefe y el botín calculados', async () => {
    const user = userEvent.setup()
    const calls = stubApi()
    renderWithProviders(<MissionContentEditorPage />)
    await openTemple(user)

    const name = screen.getByLabelText(/^Nombre/u)
    await user.clear(name)
    await user.type(name, 'El templo perdido')
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()
    await goTo(user, 'Encuentros')
    await user.click(screen.getByRole('button', { name: 'Añadir un grupo al encuentro 1' }))
    await save(user)

    expect(await screen.findByText('Misión «El templo perdido» guardada.')).toBeInTheDocument()
    const put = calls.find((call) => call.method === 'PUT')
    expect(put?.path).toBe('/api/v1/admin/missions/msn_templo_olvidado')
    const body = savedBody(calls)
    expect(body.name).toBe('El templo perdido')
    expect(body.enemies.map((enemy) => enemy.count)).toEqual([5, 2])
    expect(body.encounters[0]?.enemies).toEqual([
      { enemyRef: 'sombra', count: 4 },
      { enemyRef: 'sombra', count: 1 },
    ])
    expect(body.encounters[2]).toEqual({
      index: 3,
      kind: 'BOSS',
      powerStep: 0.2,
      enemies: [{ enemyRef: 'guardian-eterno', count: 1 }],
    })
    expect(body.finalBoss.stats).toEqual({ health: 60, attack: 8, defense: 7, damage: 3 })
    expect(body.rewards.potential).toEqual([{ label: 'Reliquia', probability: 0.5, rolls: 1 }])
    expect(screen.getByText('Sin cambios')).toBeInTheDocument()
  })

  it('edita los datos generales y las reglas de combate', async () => {
    const user = userEvent.setup()
    const calls = stubApi(undefined, [
      missionContentFixture(),
      { ...missionContentFixture(), missionId: 'msn_camino', name: 'El camino', active: false },
    ])
    renderWithProviders(<MissionContentEditorPage />)
    await openTemple(user)

    await user.selectOptions(screen.getByLabelText('Categoría'), 'CHALLENGE')
    await user.selectOptions(screen.getByLabelText('Ilustración'), '')
    const duration = screen.getByLabelText('Duración (minutos)')
    await user.clear(duration)
    await user.type(duration, '90')
    expect(screen.getByText('Tiempo real que tarda la misión: 1 h 30 min.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Poder recomendado (opcional)'), '120')
    await user.click(screen.getByLabelText('El camino'))
    await user.click(screen.getByLabelText('Publicada'))
    const summary = screen.getByLabelText(/^Resumen del tablón/u)
    await user.clear(summary)
    await user.type(summary, 'Un resumen nuevo.')
    await goTo(user, 'Combate')
    const heroic = screen.getByLabelText('Heroico')
    await user.clear(heroic)
    await user.type(heroic, '3')
    const regen = screen.getByLabelText('Regeneración por turno')
    await user.clear(regen)
    await user.type(regen, '2')
    await save(user)

    await screen.findByText('Misión «El templo olvidado» guardada.')
    const body = savedBody(calls)
    expect(body).toMatchObject({
      category: 'CHALLENGE',
      imageRef: null,
      estimatedDurationMinutes: 90,
      recommendedPower: 120,
      prerequisites: ['msn_camino'],
      active: false,
      summary: 'Un resumen nuevo.',
    })
    expect(body.combatRules).toMatchObject({
      difficultyMultipliers: { NORMAL: 1, HEROIC: 3, LEGENDARY: 2, MYTHIC: 2.5 },
      supportRegen: 2,
    })
  })

  it('no envía una misión nueva con un identificador repetido y dice dónde corregir', async () => {
    const user = userEvent.setup()
    const calls = stubApi()
    renderWithProviders(<MissionContentEditorPage />)
    await screen.findByRole('button', { name: /El templo olvidado/u })

    await user.click(screen.getByRole('button', { name: 'Nueva misión' }))
    expect(screen.getByRole('heading', { name: 'Nueva misión' })).toBeVisible()
    const id = screen.getByLabelText(/^Identificador/u)
    await user.clear(id)
    await user.type(id, 'msn_templo_olvidado')
    await save(user)

    expect(screen.getByText('No se guardó: hay campos por corregir.')).toBeInTheDocument()
    expect(screen.getByText('Ya existe una misión con ese identificador.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'General, 1 campo por corregir' })).toBeInTheDocument()
    expect(calls.some((call) => call.method === 'PUT')).toBe(false)

    await user.clear(id)
    await user.type(id, 'msn_bosque_sombrio')
    await save(user)

    expect(await screen.findByText('Misión «Nueva misión» guardada.')).toBeInTheDocument()
    expect(calls.find((call) => call.method === 'PUT')?.path).toBe(
      '/api/v1/admin/missions/msn_bosque_sombrio',
    )
    expect(savedBody(calls)).toMatchObject({ active: false, masterEncounter: null })
    expect(screen.getByLabelText(/^Identificador/u)).toHaveAttribute('readonly')
  })

  it('el rechazo de Missions lleva a la pestaña y al campo que nombra', async () => {
    const user = userEvent.setup()
    stubApi(() =>
      jsonResponse(400, {
        code: 'MISSION_CONTENT_INVALID',
        message: 'El contenido de la mision no es valido: combatRules.maxTurnsPerEncounter.',
      }),
    )
    renderWithProviders(<MissionContentEditorPage />)
    await openTemple(user)

    await save(user)

    expect(await screen.findByText('Missions no guardó la misión.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Combate, 1 campo por corregir' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByLabelText('Turnos máximos por encuentro')).toHaveAccessibleDescription(
      /combatRules\.maxTurnsPerEncounter/u,
    )
  })

  it('enlaza el botín del jefe con un producto de Catalog y lo envía', async () => {
    const user = userEvent.setup()
    const calls = stubApi()
    renderWithProviders(<MissionContentEditorPage />)
    await openTemple(user)
    await goTo(user, 'Jefe y botín')

    expect(screen.getByText(/Sin producto: el jugador no lo ve/u)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Buscar producto' }))
    await user.type(screen.getByLabelText('Buscar en Catalog'), 'reli')
    await user.click(await screen.findByRole('button', { name: /Elegir Reliquia antigua/u }))

    expect(await screen.findByText('Reliquia antigua')).toBeInTheDocument()
    expect(screen.queryByText(/Reliquia viviente/u)).not.toBeInTheDocument()
    await save(user)

    await screen.findByText('Misión «El templo olvidado» guardada.')
    expect(savedBody(calls).finalBoss.drops?.[0]?.productId).toBe(RELIC_PRODUCT.productId)
  })

  it('con cambios sin guardar, cambiar de misión pide confirmación', async () => {
    const user = userEvent.setup()
    stubApi()
    renderWithProviders(<MissionContentEditorPage />)
    await openTemple(user)
    await user.type(screen.getByLabelText(/^Nombre/u), ' II')

    await user.click(screen.getByRole('button', { name: 'Nueva misión' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Si abres una misión nueva, se pierden.')
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^Nombre/u)).toHaveValue('El templo olvidado II')

    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(screen.getByLabelText(/^Nombre/u)).toHaveValue('El templo olvidado')
    await user.type(screen.getByLabelText(/^Nombre/u), ' III')
    await user.click(screen.getByRole('button', { name: 'Nueva misión' }))
    await user.click(screen.getByRole('button', { name: 'Descartar cambios y abrir' }))
    expect(screen.getByRole('heading', { name: 'Nueva misión' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Duplicar' }))
    expect(screen.getByLabelText(/^Identificador/u)).toHaveValue('msn_nueva_mision_copia')
    expect(screen.getByLabelText(/^Nombre/u)).toHaveValue('Nueva misión (copia)')
  })

  it('edita enemigos, encuentros y jefe sin tocar JSON', async () => {
    const user = userEvent.setup()
    const calls = stubApi()
    renderWithProviders(<MissionContentEditorPage />)
    await openTemple(user)
    await goTo(user, 'Encuentros')

    await user.click(screen.getByRole('button', { name: 'Añadir tipo de enemigo' }))
    expect(screen.getByRole('heading', { name: 'Nuevo enemigo' })).toBeVisible()
    const secondGroup = screen.getAllByLabelText('Grupo 1: enemigo')[1]
    if (secondGroup === undefined) throw new Error('Falta el segundo encuentro.')
    await user.selectOptions(secondGroup, 'enemigo')
    await user.click(screen.getByRole('button', { name: 'Quitar Guardián de piedra' }))
    await user.click(screen.getByRole('button', { name: 'Bajar el encuentro 1' }))
    await user.click(screen.getByRole('button', { name: 'Añadir encuentro' }))
    await user.click(screen.getByRole('button', { name: 'Quitar el encuentro 3' }))
    await goTo(user, 'Jefe y botín')
    const bossName = screen.getByLabelText('Nombre del jefe')
    await user.clear(bossName)
    await user.type(bossName, 'Guardián del alba')
    await user.selectOptions(screen.getByLabelText('Daño'), 'DICE')
    expect(screen.getByText(/y daño en dados\./u)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Añadir botín' }))
    await user.click(screen.getByRole('button', { name: 'Quitar Nuevo botín' }))
    await save(user)

    await screen.findByText('Misión «El templo olvidado» guardada.')
    const body = savedBody(calls)
    expect(body.enemies.map((enemy) => [enemy.enemyRef, enemy.count])).toEqual([
      ['sombra', 4],
      ['enemigo', 2],
    ])
    expect(body.encounters.map((encounter) => encounter.enemies)).toEqual([
      [{ enemyRef: 'enemigo', count: 2 }],
      [{ enemyRef: 'sombra', count: 4 }],
      [{ enemyRef: 'guardian-eterno', count: 1 }],
    ])
    expect(body.finalBoss.name).toBe('Guardián del alba')
    expect(body.finalBoss.profile.damage).toEqual({ mode: 'DICE', count: 1, sides: 6 })
    expect(body.finalBoss.stats).toEqual({ health: 60, attack: 8, defense: 7 })
    expect(body.finalBoss.drops).toHaveLength(1)
  })

  it('configura el Máster: momentos, probabilidad, épica y candidatos', async () => {
    const user = userEvent.setup()
    const calls = stubApi()
    renderWithProviders(<MissionContentEditorPage />)
    await openTemple(user)
    await goTo(user, 'Máster')

    expect(screen.getByText('15 %')).toBeInTheDocument()
    expect(screen.getByLabelText('Tras el encuentro 2')).toBeChecked()
    await user.click(screen.getByLabelText('Esta misión puede tener Máster'))
    expect(screen.queryByText('Maestro de armas')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText('Esta misión puede tener Máster'))
    expect(screen.getByRole('heading', { name: 'Maestro de armas' })).toBeVisible()

    await user.click(screen.getByLabelText('Tras el encuentro 1'))
    expect(screen.queryByText('15 %')).not.toBeInTheDocument()
    const chance = screen.getByLabelText('Probabilidad en cada momento (%)')
    await user.clear(chance)
    await user.type(chance, '10')
    await user.selectOptions(screen.getByLabelText('Épica que entrega'), 'luz-cegadora')
    expect(screen.getByText(/Solo Mago Fuego/u)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Añadir Máster' }))
    expect(screen.getByRole('heading', { name: 'Nuevo Máster' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Quitar Nuevo Máster' }))
    await save(user)

    await screen.findByText('Misión «El templo olvidado» guardada.')
    const master = savedBody(calls).masterEncounter
    expect(master?.evaluationPoints).toEqual([{ afterEncounter: 1 }, { afterEncounter: 2 }])
    expect(master?.candidates).toHaveLength(1)
    expect(master?.candidates[0]?.probabilityByHeroType).toEqual({ '*': 0.1 })
    expect(master?.candidates[0]?.epic).toMatchObject({
      epicRef: 'luz-cegadora',
      name: 'Luz cegadora',
      productId: null,
    })
  })

  it('edita objetivos, recompensas y reglas, y avisa del campo vacío', async () => {
    const user = userEvent.setup()
    const calls = stubApi()
    renderWithProviders(<MissionContentEditorPage />)
    await openTemple(user)

    await goTo(user, 'Objetivos')
    await user.click(screen.getByRole('button', { name: 'Añadir objetivo' }))
    const added = screen.getAllByLabelText('Cómo se cumple')[2]
    if (added === undefined) throw new Error('Falta el objetivo nuevo.')
    await user.selectOptions(added, 'CLEAR_ENCOUNTERS')
    expect(screen.getByLabelText('Encuentros que hay que superar')).toHaveValue(1)
    await user.click(screen.getByRole('button', { name: 'Quitar el objetivo 1' }))

    await goTo(user, 'Recompensas')
    await user.click(screen.getByRole('button', { name: 'Añadir a primera vez' }))
    await save(user)
    expect(screen.getByText('Escribe la recompensa.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a Recompensas' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Primera vez: recompensa 1'), 'Título de explorador')

    await goTo(user, 'Combate')
    const critical = screen.getByLabelText('Probabilidad de crítico (%)')
    await user.clear(critical)
    await user.type(critical, '20')
    await save(user)

    await screen.findByText('Misión «El templo olvidado» guardada.')
    const body = savedBody(calls)
    expect(body.objectives.map((objective) => objective.rule?.type)).toEqual([
      'COLLECT_LOOT',
      'CLEAR_ENCOUNTERS',
    ])
    expect(body.rewards.firstTime).toEqual([{ label: 'Título de explorador' }])
    expect(body.combatRules.criticalChance).toBe(0.2)
  })

  it('la pestaña JSON muestra lo que se enviará y acepta un JSON pegado', async () => {
    const user = userEvent.setup()
    stubApi()
    renderWithProviders(<MissionContentEditorPage />)
    await openTemple(user)
    await goTo(user, 'JSON')

    expect(screen.getByLabelText('Vista previa del JSON')).toHaveTextContent(
      '"missionId": "msn_templo_olvidado"',
    )
    await user.click(screen.getByRole('button', { name: 'Editar como JSON' }))
    const editor = screen.getByLabelText('Definición JSON')
    const apply = async (source: string): Promise<void> => {
      await user.clear(editor)
      await user.click(editor)
      await user.paste(source)
      await user.click(screen.getByRole('button', { name: 'Aplicar JSON' }))
    }

    await apply('no es json')
    expect(screen.getByText('El JSON no es válido.')).toBeInTheDocument()
    await apply(JSON.stringify({ name: 'Sin identificador' }))
    expect(screen.getByText(/Falta «missionId»/u)).toBeInTheDocument()
    await apply(JSON.stringify({ ...missionContentFixture(), missionId: 'msn_otra' }))
    expect(screen.getByText('El identificador de una misión guardada no se cambia.')).toBeVisible()
    await apply(JSON.stringify({ ...missionContentFixture(), name: 'Templo desde JSON' }))

    expect(screen.getByRole('button', { name: 'Editar como JSON' })).toBeVisible()
    await goTo(user, 'General')
    expect(screen.getByLabelText(/^Nombre/u)).toHaveValue('Templo desde JSON')
  })

  it('las flechas del teclado recorren las pestañas', async () => {
    const user = userEvent.setup()
    stubApi()
    renderWithProviders(<MissionContentEditorPage />)
    await openTemple(user)

    await user.click(screen.getByRole('tab', { name: 'General' }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Objetivos' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'JSON' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'General' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'JSON' })).toHaveFocus()
  })
})
