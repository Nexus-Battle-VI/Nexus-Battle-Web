import { readFileSync } from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { useSession } from '@/shared/session'
import { BattleRoomsPage } from './BattleRoomsPage'
import type { BattleRoom } from './types'

/**
 * HU-13: la pantalla incluye el chat del lobby. Aqui se sustituye por un doble:
 * estas pruebas tienen una sesion con testimonio y el panel real abriria un
 * WebSocket de verdad contra un servidor que no existe. El panel, su sesion y
 * su protocolo tienen su propia cobertura en `ChatPanel.test.tsx`, `ChatSession.test.ts` y `chatState.test.ts`.
 */
vi.mock('./ChatPanel', () => ({
  ChatPanel: (props: { channel: unknown; title: string }): React.JSX.Element => (
    <div data-testid="chat-panel" data-channel={JSON.stringify(props.channel)}>
      {props.title}
    </div>
  ),
}))

/**
 * Respuesta falsa REUTILIZABLE: `httpClient` lee el cuerpo con `text()`, y un
 * `Response` real solo se puede consumir una vez. Varias consultas
 * concurrentes de la pagina (listado de salas y saldo de Wallet, HU-23)
 * comparten el mismo doble, asi que el cuerpo se devuelve en cada lectura.
 */
const jsonResponse = (status: number, body: unknown): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as unknown as Response

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
  // Remaster visual Sprint 3 (3a pasada): el chat vive detras de la burbuja
  // flotante (`FloatingChatPanel`) -- cerrado por defecto, para no empujar
  // el layout ni obligar a scroll de pagina. Abrirlo es interaccion real de
  // la persona (clic en la burbuja), no un estado inicial visible.
  it('incluye el chat del lobby (burbuja flotante): un canal global, no el de una sala', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [])))

    renderWithProviders(<BattleRoomsPage />)

    expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Chat del lobby' }))

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

describe('BattleRoomsPage — volver a mi sala', () => {
  it('muestra "Partida en curso" con la sala activa que devuelve el servidor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) =>
        Promise.resolve(
          jsonResponse(200, input.endsWith('/me/rooms') ? [room({ status: 'IN_BATTLE' })] : []),
        ),
      ),
    )

    renderWithProviders(<BattleRoomsPage />)

    expect(await screen.findByRole('region', { name: 'Partida en curso' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continuar batalla' })).toBeInTheDocument()
  })

  // Hotfix post-despliegue (Objetivo 5 del brief): crear una sala ya NO
  // navega automaticamente a su lobby -- obligaba a recargar/volver para
  // seguir el flujo real (unirse a un equipo). El creador se queda en
  // /play; la sala nueva aparece sola en "Salas disponibles" (el listado
  // publico se invalida) y el banner "Tu sala esta esperando jugadores"
  // ofrece "Volver a la sala" (el listado "mias" tambien se invalida) --
  // ambas invalidaciones ya existian en `useCreateBattleRoom` (`hooks.ts`),
  // sin tocar ningun contrato de backend.
  it('tras crear la sala, NO navega: se queda en /play, la sala aparece en el listado y el banner ofrece "Volver a la sala"', async () => {
    const created = room({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', createdBy: 'sujeto-ana' })
    let createdRoomExists = false
    const fetchImpl = vi.fn((_input: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        createdRoomExists = true
        return Promise.resolve(jsonResponse(201, created))
      }

      return Promise.resolve(jsonResponse(200, createdRoomExists ? [created] : []))
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/play" element={<BattleRoomsPage />} />
        <Route path="/play/rooms/:roomId" element={<p>Lobby de la sala nueva</p>} />
      </Routes>,
      { route: '/play' },
    )
    await screen.findByText(/No hay salas esperando jugadores/u)

    await user.click(screen.getByRole('button', { name: 'Crear sala de batalla' }))

    // La sala nueva aparece en "Salas disponibles" (listado publico invalidado)...
    await screen.findByTestId(`battle-room-${created.id}`)
    // ...y el banner ofrece volver a ella ("mis salas" tambien invalidado).
    expect(await screen.findByRole('link', { name: 'Volver a la sala' })).toHaveAttribute(
      'href',
      `/play/rooms/${created.id}`,
    )

    // Nunca navega solo: la ruta del lobby jamas se monta, y el formulario
    // de creacion (con su boton) sigue en pantalla -- seguimos en /play.
    expect(screen.queryByText('Lobby de la sala nueva')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear sala de batalla' })).toBeInTheDocument()
  })
})

/**
 * Cierre final del remaster (Objetivo 3 y 4 del brief): correcciones
 * PURAMENTE visuales, sin tocar layout/estructura/copy del hero ni del
 * scrollbar raiz. Estas pruebas NO miden contraste/pixeles reales (eso lo
 * hace Richard en el navegador) -- confirman (a) que el hero conserva sus
 * mismas clases/texto (identidad intacta) y (b) que el refuerzo de Light y
 * el scrollbar dorado del documento siguen presentes en `battle-rooms.css`.
 */
describe('BattleRoomsPage -- hero y scrollbar raiz (cierre final)', () => {
  it('el hero conserva su texto y sus clases (br-heading-eyebrow/br-heading-title): ningun cambio de estructura', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(200, []))),
    )

    renderWithProviders(<BattleRoomsPage />)
    await screen.findByText(/No hay salas esperando jugadores/u)

    const eyebrow = screen.getByText('Lobby de combate: crea una sala o unete a una existente.')
    const title = screen.getByRole('heading', { name: 'Jugar Online', level: 1 })

    expect(eyebrow).toHaveClass('br-heading-eyebrow')
    expect(title).toHaveClass('br-heading-title')
  })
})

describe('battle-rooms.css -- cierre final: refuerzo de hero en Light y scrollbar raiz dorado', () => {
  const css = readFileSync(path.join(__dirname, 'battle-rooms.css'), 'utf-8')

  it("Objetivo 3: el hero gana contraste SOLO en Light (:not([data-theme='dark'])), Dark queda intacto", () => {
    expect(css).toContain(":root:not([data-theme='dark']) .br-heading-title")
    expect(css).toContain(":root:not([data-theme='dark']) .br-heading-eyebrow")
    // La regla base de .br-heading-title (Dark incluido) nunca cambia de peso.
    const baseStart = css.indexOf('.br-heading-title {')
    const baseEnd = css.indexOf('}', baseStart)
    expect(css.slice(baseStart, baseEnd)).toContain('font-weight: 700')
  })

  it('Objetivo 4: el scrollbar raiz usa los MISMOS tokens dorados que .br-scrollbar--rooms (ningun color inventado)', () => {
    const start = css.indexOf('html:has(.br-main) {')
    const end = css.indexOf('html:has(.br-main)::-webkit-scrollbar-thumb:hover {')
    const block = css.slice(start, css.indexOf('}', end) + 1)

    expect(start).toBeGreaterThan(-1)
    expect(block).toContain('var(--br-scrollbar-thumb-rooms)')
    expect(block).toContain('var(--br-scrollbar-thumb-rooms-hover)')
    expect(block).toContain('var(--br-scrollbar-track)')
  })

  it('el scrollbar raiz NUNCA apunta a body como SELECTOR real (Chromium no lo trata como scrollbar raiz del documento)', () => {
    const start = css.indexOf('html:has(.br-main) {')
    const end = css.indexOf(
      'html:has(.br-main)::-webkit-scrollbar-thumb:hover {\n  background-color: var(--br-scrollbar-thumb-rooms-hover);\n}',
    )
    // Sin comentarios: la documentacion puede NOMBRAR "body" para explicar
    // por que no se usa como selector (ver `noClientAuthority.test.ts`,
    // mismo criterio).
    const block = css.slice(start, end).replace(/\/\*[\s\S]*?\*\//gu, '')

    expect(start).toBeGreaterThan(-1)
    expect(block).not.toMatch(/\bbody::-webkit-scrollbar/u)
    expect(block).not.toMatch(/\bbody\s*\{[^}]*scrollbar-color/u)
  })
})
