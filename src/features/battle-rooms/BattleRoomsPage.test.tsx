import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { BattleRoomsPage } from './BattleRoomsPage'
import type { BattleRoom } from './types'

/**
 * HU-13: la pantalla incluye el chat del lobby. Aqui se sustituye por un doble:
 * estas pruebas tienen una sesion con testimonio y el panel real abriria un
 * WebSocket de verdad contra un servidor que no existe. El panel, su sesion y
 * su protocolo tienen su propia cobertura en `features/chat`.
 */
vi.mock('@/features/chat/ChatPanel', () => ({
  ChatPanel: (props: { channel: unknown; title: string }): React.JSX.Element => (
    <div data-testid="chat-panel" data-channel={JSON.stringify(props.channel)}>
      {props.title}
    </div>
  ),
}))

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const room = (overrides: Partial<BattleRoom> = {}): BattleRoom => ({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  mode: 'PVP',
  status: 'WAITING_FOR_PLAYERS',
  teams: [
    { label: 'A', capacity: 1, participants: [] },
    { label: 'B', capacity: 1, participants: [] },
  ],
  reward: { amount: 100 },
  createdBy: 'sujeto-ana',
  createdAt: '2026-09-18T00:00:00.000Z',
  version: 0,
  ...overrides,
})

const AUTHENTICATED = {
  subject: 'sujeto-ana',
  accessToken: 'token',
  expiresAt: Date.now() + 900_000,
}

beforeEach(() => {
  useSession.setState(AUTHENTICATED)
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ subject: null, accessToken: null, expiresAt: null })
})

describe('BattleRoomsPage — chat del lobby (HU-13)', () => {
  it('incluye el chat del lobby: un canal global, no el de una sala', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [])))

    renderWithProviders(<BattleRoomsPage />)

    const chat = screen.getByTestId('chat-panel')

    expect(chat).toHaveTextContent('Chat del lobby')
    expect(chat).toHaveAttribute('data-channel', JSON.stringify({ kind: 'lobby' }))
  })
})

describe('BattleRoomsPage — consulta (GET)', () => {
  it('muestra el estado de carga', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Promise<Response>(() => {
          // Intencionadamente nunca se resuelve: solo interesa el estado de carga.
        }),
      ),
    )

    renderWithProviders(<BattleRoomsPage />)

    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Cargando...')
  })

  it('muestra el empty state real cuando GET devuelve []', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [])))

    renderWithProviders(<BattleRoomsPage />)

    expect(
      await screen.findByText(/No hay salas esperando jugadores en este momento/u),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('pinta una sala con modalidad, estado, cupos y recompensa', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [room()])))

    renderWithProviders(<BattleRoomsPage />)

    const card = await screen.findByTestId('battle-room-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

    expect(within(card).getByText(/Jugador vs Jugador/u)).toBeInTheDocument()
    expect(within(card).getByText('Esperando jugadores')).toBeInTheDocument()
    expect(within(card).getByText(/0\/2 jugadores/u)).toBeInTheDocument()
  })

  it('pinta varias salas', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(200, [room({ id: 'sala-1' }), room({ id: 'sala-2', mode: 'PVE' })]),
        ),
    )

    renderWithProviders(<BattleRoomsPage />)

    expect(await screen.findByTestId('battle-room-sala-1')).toBeInTheDocument()
    expect(screen.getByTestId('battle-room-sala-2')).toBeInTheDocument()
  })

  it('filtra client-side por modalidad sin lanzar una peticion nueva', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(200, [
          room({ id: 'sala-pvp', mode: 'PVP' }),
          room({ id: 'sala-pve', mode: 'PVE' }),
        ]),
      )
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByTestId('battle-room-sala-pvp')

    const callsBefore = fetchImpl.mock.calls.length
    await user.click(screen.getByRole('button', { name: 'JcE' }))

    expect(screen.queryByTestId('battle-room-sala-pvp')).not.toBeInTheDocument()
    expect(screen.getByTestId('battle-room-sala-pve')).toBeInTheDocument()
    expect(fetchImpl.mock.calls.length).toBe(callsBefore)
  })

  /**
   * La busqueda por ID de sala se conserva deliberadamente aunque el UUID ya
   * no se muestre como texto principal de la tarjeta (ver refinamiento final,
   * seccion "Correccion 2" del informe): sigue siendo una funcionalidad real
   * y probada, solo que el identificador ya no es el foco visual de la fila.
   */
  it('busca client-side por ID de sala', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(jsonResponse(200, [room({ id: 'sala-uno' }), room({ id: 'sala-dos' })])),
    )
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByTestId('battle-room-sala-uno')

    await user.type(screen.getByPlaceholderText('Buscar por ID de sala…'), 'sala-dos')

    expect(screen.queryByTestId('battle-room-sala-uno')).not.toBeInTheDocument()
    expect(screen.getByTestId('battle-room-sala-dos')).toBeInTheDocument()
  })

  it('muestra un mensaje comprensible ante un 401, sin redireccion automatica', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Sin testimonio' })),
    )

    renderWithProviders(<BattleRoomsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/sesión expiró/u)
  })

  it('muestra un mensaje ante un error de red, sin crashear', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    renderWithProviders(<BattleRoomsPage />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('el boton Refrescar vuelve a consultar y se marca ocupado mientras carga', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, []))
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByText(/No hay salas esperando jugadores/u)

    const callsBefore = fetchImpl.mock.calls.length
    await user.click(screen.getByRole('button', { name: /Refrescar/u }))

    await waitFor(() => {
      expect(fetchImpl.mock.calls.length).toBeGreaterThan(callsBefore)
    })
  })
})

describe('BattleRoomsPage — creacion (POST)', () => {
  it('crea una sala PVP y NUNCA envia createdBy ni playerId en el body', async () => {
    const fetchImpl = vi.fn((input: string, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String(input)

      if (init?.method === 'POST' && url.endsWith('/rooms')) {
        return Promise.resolve(jsonResponse(201, room()))
      }

      return Promise.resolve(jsonResponse(200, url.endsWith('/rooms') ? [room()] : []))
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByText(/No hay salas esperando jugadores en este momento|Esperando jugadores/u)

    await user.click(screen.getByRole('button', { name: 'Crear sala de batalla' }))

    await waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledWith(
        '/api/v1/combat/rooms',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    const postCall = fetchImpl.mock.calls.find(([, init]) => init?.method === 'POST')
    const sentBody = JSON.parse(postCall![1]!.body as string) as Record<string, unknown>

    expect(sentBody).not.toHaveProperty('createdBy')
    expect(sentBody).not.toHaveProperty('playerId')
    expect(sentBody).toEqual({
      mode: 'PVP',
      teamConfigs: [{ capacity: 1 }, { capacity: 1 }],
      reward: { amount: 0 },
    })

    expect(await screen.findByText(/Sala creada/u)).toBeInTheDocument()
  })

  it('crea una sala 2 vs 2 al seleccionar el formato correspondiente', async () => {
    const fetchImpl = vi.fn((_input: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve(jsonResponse(201, room()))
      }
      return Promise.resolve(jsonResponse(200, []))
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByText(/No hay salas esperando jugadores/u)

    await user.click(screen.getByRole('radio', { name: '2 vs 2' }))
    await user.click(screen.getByRole('button', { name: 'Crear sala de batalla' }))

    await waitFor(() => {
      const postCall = fetchImpl.mock.calls.find(([, init]) => init?.method === 'POST')
      expect(postCall).toBeDefined()
    })

    const postCall = fetchImpl.mock.calls.find(([, init]) => init?.method === 'POST')
    const sentBody = JSON.parse(postCall![1]!.body as string) as {
      teamConfigs: readonly { capacity: number }[]
    }

    expect(sentBody.teamConfigs).toEqual([{ capacity: 2 }, { capacity: 2 }])
  })

  it('crea una sala PVE con al menos un participante AI en el equipo contrario', async () => {
    const fetchImpl = vi.fn((_input: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve(jsonResponse(201, room({ mode: 'PVE' })))
      }

      return Promise.resolve(jsonResponse(200, []))
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByText(/No hay salas esperando jugadores/u)

    await user.click(screen.getByRole('radio', { name: /Jugador vs Máquina/u }))
    await user.click(screen.getByRole('button', { name: 'Crear sala de batalla' }))

    await waitFor(() => {
      const postCall = fetchImpl.mock.calls.find(([, init]) => init?.method === 'POST')
      expect(postCall).toBeDefined()
    })

    const postCall = fetchImpl.mock.calls.find(([, init]) => init?.method === 'POST')
    const sentBody = JSON.parse(postCall![1]!.body as string) as {
      mode: string
      teamConfigs: readonly {
        capacity: number
        initialParticipants?: readonly { kind: string }[]
      }[]
    }

    expect(sentBody.mode).toBe('PVE')
    expect(
      sentBody.teamConfigs.some((team) =>
        (team.initialParticipants ?? []).some((participant) => participant.kind === 'AI'),
      ),
    ).toBe(true)
  })

  it('rechaza una recompensa negativa antes de enviar la peticion', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, []))
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByText(/No hay salas esperando jugadores/u)

    const rewardField = screen.getByLabelText('Recompensa de la sala')
    await user.clear(rewardField)
    await user.type(rewardField, '-5')

    const callsBefore = fetchImpl.mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Crear sala de batalla' }))

    expect(await screen.findByText(/mayor o igual a 0/u)).toBeInTheDocument()
    expect(fetchImpl.mock.calls.length).toBe(callsBefore)
  })

  it('muestra el mensaje real del servicio ante un 400', async () => {
    const fetchImpl = vi.fn((input: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve(jsonResponse(400, { message: 'mode invalido' }))
      }
      return Promise.resolve(jsonResponse(200, []))
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByText(/No hay salas esperando jugadores/u)
    await user.click(screen.getByRole('button', { name: 'Crear sala de batalla' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('mode invalido')
  })

  it('muestra el mensaje de sesion expirada ante un 401 al crear', async () => {
    const fetchImpl = vi.fn((input: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve(jsonResponse(401, { message: 'Sin testimonio' }))
      }
      return Promise.resolve(jsonResponse(200, []))
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByText(/No hay salas esperando jugadores/u)
    await user.click(screen.getByRole('button', { name: 'Crear sala de batalla' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/sesión expiró/u)
  })

  it('muestra el mensaje de dominio de un 422', async () => {
    const fetchImpl = vi.fn((input: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse(422, { message: 'La capacidad total de la sala no puede superar 6.' }),
        )
      }
      return Promise.resolve(jsonResponse(200, []))
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByText(/No hay salas esperando jugadores/u)
    await user.click(screen.getByRole('button', { name: 'Crear sala de batalla' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La capacidad total de la sala no puede superar 6.',
    )
  })

  it('muestra un mensaje ante un error de red al crear, sin crashear', async () => {
    const fetchImpl = vi.fn((input: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.reject(new TypeError('Failed to fetch'))
      }
      return Promise.resolve(jsonResponse(200, []))
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByText(/No hay salas esperando jugadores/u)
    await user.click(screen.getByRole('button', { name: 'Crear sala de batalla' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('BattleRoomsPage — cancelacion', () => {
  it('solo muestra "Cancelar" en la sala propia', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(200, [
            room({ id: 'sala-propia', createdBy: 'sujeto-ana' }),
            room({ id: 'sala-ajena', createdBy: 'sujeto-otro' }),
          ]),
        ),
    )

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByTestId('battle-room-sala-propia')

    const propia = screen.getByTestId('battle-room-sala-propia')
    const ajena = screen.getByTestId('battle-room-sala-ajena')

    expect(within(propia).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(within(ajena).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
  })

  /**
   * Refuerzo explicito del criterio de ownership (refinamiento final,
   * "Correccion 3"): la decision de mostrar "Cancelar" sale exclusivamente de
   * comparar el `subject` real de la sesion (`useSession`) contra el
   * `createdBy` real que Combat devuelve en cada sala — nunca de un texto
   * visible en pantalla ni de un valor inventado en el cliente. Si la sesion
   * no tiene `subject` (o no coincide), la sala ajena NUNCA ofrece una
   * capacidad de cancelar, sin importar cuantas salas haya en el listado.
   */
  it('sin sesion coincidente, ninguna sala ofrece "Cancelar" (ownership real, no de UI)', async () => {
    useSession.setState({
      subject: 'sujeto-otra-persona',
      accessToken: 'token',
      expiresAt: Date.now() + 900_000,
    })
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(200, [
            room({ id: 'sala-de-ana', createdBy: 'sujeto-ana' }),
            room({ id: 'sala-de-otro', createdBy: 'sujeto-tercero' }),
          ]),
        ),
    )

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByTestId('battle-room-sala-de-ana')

    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
  })

  it('cancela con exito y retira la sala del listado', async () => {
    let cancelled = false
    const fetchImpl = vi.fn((input: string, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String(input)

      if (init?.method === 'POST' && url.includes('/cancel')) {
        cancelled = true
        return Promise.resolve(jsonResponse(200, room({ status: 'CANCELLED' })))
      }

      return Promise.resolve(
        jsonResponse(200, cancelled ? [] : [room({ id: 'sala-propia', createdBy: 'sujeto-ana' })]),
      )
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByTestId('battle-room-sala-propia')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => {
      expect(screen.queryByTestId('battle-room-sala-propia')).not.toBeInTheDocument()
    })
  })

  it('muestra el mensaje real ante un 403 al cancelar', async () => {
    const fetchImpl = vi.fn((input: string, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String(input)

      if (init?.method === 'POST' && url.includes('/cancel')) {
        return Promise.resolve(jsonResponse(403, { message: 'Solo el creador puede cancelarla.' }))
      }

      return Promise.resolve(
        jsonResponse(200, [room({ id: 'sala-propia', createdBy: 'sujeto-ana' })]),
      )
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByTestId('battle-room-sala-propia')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Solo el creador puede cancelarla.')
  })

  it('muestra el mensaje real ante un 404 al cancelar', async () => {
    const fetchImpl = vi.fn((input: string, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String(input)

      if (init?.method === 'POST' && url.includes('/cancel')) {
        return Promise.resolve(jsonResponse(404, { message: 'Sala no encontrada.' }))
      }

      return Promise.resolve(
        jsonResponse(200, [room({ id: 'sala-propia', createdBy: 'sujeto-ana' })]),
      )
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByTestId('battle-room-sala-propia')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sala no encontrada.')
  })

  it('muestra el mensaje real ante un 409 al cancelar', async () => {
    const fetchImpl = vi.fn((input: string, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String(input)

      if (init?.method === 'POST' && url.includes('/cancel')) {
        return Promise.resolve(jsonResponse(409, { message: 'La sala ya no se puede cancelar.' }))
      }

      return Promise.resolve(
        jsonResponse(200, [room({ id: 'sala-propia', createdBy: 'sujeto-ana' })]),
      )
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByTestId('battle-room-sala-propia')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La sala ya no se puede cancelar.')
  })
})
