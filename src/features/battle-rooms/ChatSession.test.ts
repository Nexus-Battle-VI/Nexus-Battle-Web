import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TicketProvider } from './realtime'
import { recordingSocketFactory, type FakeWebSocket } from '@/test/fake-websocket'

import { ChatSession, type ChatSessionOptions } from './ChatSession'
import { LOBBY_CHANNEL, type ChatChannel } from './chatProtocol'

/**
 * La sesion de chat sobre la conexion compartida de HU-17 (`openRealtimeConnection`):
 * ticket por HTTP -> `auth` -> `auth.ok` -> el chat se suscribe. El backoff de la
 * reconexion y el ticket nuevo por conexion los prueba la suite de esa conexion
 * (`useBattleRoomRealtime.test.tsx`); aqui se comprueba lo que el chat construye
 * encima: cuando se suscribe, como recupera, que reenvia y como se para.
 */
const ROOM = '11111111-1111-4111-8111-111111111111'

const wire = (seq: number, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  messageId: `m-${String(seq)}`,
  channel: 'lobby',
  seq,
  commandId: `c-srv-${String(seq)}`,
  sender: { displayName: 'Beto' },
  text: `mensaje ${String(seq)}`,
  sentAt: '2026-09-20T12:00:00.000Z',
  ...over,
})

const live = (seq: number, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  type: 'chat.message',
  ...wire(seq, over),
})

const subscribed = (
  messages: Record<string, unknown>[],
  upTo: number,
  channel: Record<string, unknown> = { channel: 'lobby' },
): Record<string, unknown> => ({
  type: 'chat.subscribed',
  ...channel,
  upTo,
  truncated: false,
  messages,
})

interface Harness {
  readonly session: ChatSession
  readonly sockets: FakeWebSocket[]
  readonly ticketProvider: ReturnType<typeof vi.fn<TicketProvider>>
  /** `false` simula que la sesion vencio. */
  readonly signedIn: { current: boolean }
}

const setup = (
  channel: ChatChannel = LOBBY_CHANNEL,
  over: Partial<ChatSessionOptions> = {},
): Harness => {
  const { factory, sockets } = recordingSocketFactory()
  const signedIn = { current: true }
  let commands = 0
  let tickets = 0
  const ticketProvider = vi.fn<TicketProvider>(() => {
    tickets += 1

    return Promise.resolve(`ticket-${String(tickets)}`)
  })

  const session = new ChatSession({
    channel,
    newCommandId: () => {
      commands += 1

      return `cmd-${String(commands)}`
    },
    socketFactory: factory,
    ticketProvider,
    hasSession: () => signedIn.current,
    ...over,
  })

  return { session, sockets, ticketProvider, signedIn }
}

/** Deja correr las promesas pendientes (el ticket se pide de forma asincrona). */
const settle = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0)
}

const lastSocket = (h: Harness): FakeWebSocket => {
  const socket = h.sockets.at(-1)

  if (socket === undefined) {
    throw new Error('la sesion no abrio ningun socket')
  }

  return socket
}

/** Arranca la sesion y abre el socket, sin autenticar todavia. */
const startAndOpen = async (h: Harness): Promise<FakeWebSocket> => {
  h.session.start()
  await settle()
  const socket = lastSocket(h)

  socket.open()

  return socket
}

/** Abre el socket, autentica y completa la suscripcion inicial. */
const connectFully = async (
  h: Harness,
  messages: Record<string, unknown>[] = [],
  upTo = 0,
): Promise<FakeWebSocket> => {
  const socket = await startAndOpen(h)

  socket.message({ type: 'auth.ok' })
  socket.message(subscribed(messages, upTo))

  return socket
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ChatSession: conexion y protocolo', () => {
  it('sin sesion no pide ticket ni abre socket: disabled', async () => {
    const h = setup()

    h.signedIn.current = false
    h.session.start()
    await settle()

    expect(h.ticketProvider).not.toHaveBeenCalled()
    expect(h.sockets).toHaveLength(0)
    expect(h.session.getSnapshot().connection).toBe('disabled')
  })

  it('al abrir el socket envia SOLO auth, con el ticket y sin credenciales en la URL', async () => {
    const h = setup()

    const socket = await startAndOpen(h)

    expect(socket.frames()).toEqual([{ type: 'auth', ticket: 'ticket-1' }])
    expect(socket.url).not.toContain('ticket-1')
    expect(h.session.getSnapshot().connection).toBe('connecting')
  })

  it('NO se suscribe hasta recibir auth.ok (no depende de que el servidor ordene mensajes seguidos)', async () => {
    const h = setup()
    const socket = await startAndOpen(h)

    expect(socket.frames().map((f) => f.type)).toEqual(['auth'])

    socket.message({ type: 'auth.ok' })

    expect(socket.frames().map((f) => f.type)).toEqual(['auth', 'chat.subscribe'])
  })

  it('autenticado pero sin confirmar el canal, la conexion aun no esta abierta', async () => {
    const h = setup()
    const socket = await startAndOpen(h)

    socket.message({ type: 'auth.ok' })

    expect(h.session.getSnapshot().connection).toBe('connecting')
  })

  it('la primera suscripcion no lleva lastSeq', async () => {
    const h = setup()
    const socket = await startAndOpen(h)

    socket.message({ type: 'auth.ok' })

    expect(socket.frames()[1]).toEqual({ type: 'chat.subscribe', channel: 'lobby' })
  })

  it('un canal de sala se suscribe con su roomId', async () => {
    const h = setup({ kind: 'room', roomId: ROOM })
    const socket = await startAndOpen(h)

    socket.message({ type: 'auth.ok' })

    expect(socket.frames()[1]).toEqual({ type: 'chat.subscribe', channel: 'room', roomId: ROOM })
  })

  it('chat.subscribed abre la conexion y carga el historial', async () => {
    const h = setup()

    await connectFully(h, [wire(1), wire(2)], 2)

    expect(h.session.getSnapshot().connection).toBe('open')
    expect(h.session.getSnapshot().state.messages.map((m) => m.seq)).toEqual([1, 2])
  })

  it('un mensaje en vivo se aplica al estado', async () => {
    const h = setup()
    const socket = await connectFully(h, [], 0)

    socket.message(live(1))

    expect(h.session.getSnapshot().state.messages).toHaveLength(1)
  })

  it('ignora lo que no cumple el contrato sin romper la conexion', async () => {
    const h = setup()
    const socket = await connectFully(h)

    socket.message('esto no es json')
    socket.message({ type: 'chat.message', seq: 'x' })
    socket.message({ type: 'desconocido' })

    expect(h.session.getSnapshot().state.messages).toEqual([])
    expect(h.session.getSnapshot().connection).toBe('open')
    expect(socket.closeCalls).toBe(0)
  })
})

describe('ChatSession: enviar', () => {
  it('un mensaje vacio o de solo espacios no se envia ni queda pendiente', async () => {
    const h = setup()
    const socket = await connectFully(h)
    const before = socket.sent.length

    expect(h.session.send('')).toBe('empty')
    expect(h.session.send('     ')).toBe('empty')

    expect(socket.sent).toHaveLength(before)
    expect(h.session.getSnapshot().state.pending).toEqual([])
  })

  it('con el canal confirmado sale de inmediato, recortado y con un commandId nuevo', async () => {
    const h = setup()
    const socket = await connectFully(h)

    expect(h.session.send('  hola a todos  ')).toBe('sent')

    expect(socket.frames().at(-1)).toEqual({
      type: 'chat.send',
      channel: 'lobby',
      commandId: 'cmd-1',
      text: 'hola a todos',
    })
    expect(h.session.getSnapshot().state.pending).toMatchObject([
      { commandId: 'cmd-1', status: 'sending' },
    ])
  })

  it('cada envio usa un commandId distinto', async () => {
    const h = setup()
    const socket = await connectFully(h)

    h.session.send('uno')
    h.session.send('dos')

    const ids = socket
      .frames()
      .filter((f) => f.type === 'chat.send')
      .map((f) => f.commandId)

    expect(ids).toEqual(['cmd-1', 'cmd-2'])
  })

  it('antes de confirmarse la suscripcion queda pendiente y sale al confirmarse', async () => {
    const h = setup()
    const socket = await startAndOpen(h)

    h.session.send('temprano')

    expect(socket.frames().some((f) => f.type === 'chat.send')).toBe(false)
    expect(h.session.getSnapshot().state.pending).toHaveLength(1)

    socket.message({ type: 'auth.ok' })
    socket.message(subscribed([], 0))

    expect(socket.frames().filter((f) => f.type === 'chat.send')).toEqual([
      { type: 'chat.send', channel: 'lobby', commandId: 'cmd-1', text: 'temprano' },
    ])
  })

  it('llega el mensaje propio: deja de estar pendiente', async () => {
    const h = setup()
    const socket = await connectFully(h)

    h.session.send('hola')
    socket.message(live(1, { commandId: 'cmd-1', text: 'hola' }))

    expect(h.session.getSnapshot().state.pending).toEqual([])
    expect(h.session.getSnapshot().state.mine.has('cmd-1')).toBe(true)
  })

  describe('reintentar', () => {
    const rejectFirst = (socket: FakeWebSocket, code: string): void => {
      socket.message({ type: 'command.rejected', command: 'chat.send', commandId: 'cmd-1', code })
    }

    it('reenvia un mensaje fallido con el MISMO commandId', async () => {
      const h = setup()
      const socket = await connectFully(h)

      h.session.send('hola')
      rejectFirst(socket, 'CHAT_UNAVAILABLE')
      expect(h.session.getSnapshot().state.pending[0]?.status).toBe('failed')

      h.session.retry('cmd-1')

      const sends = socket.frames().filter((f) => f.type === 'chat.send')

      expect(sends).toHaveLength(2)
      expect(sends[1]).toEqual(sends[0])
      expect(h.session.getSnapshot().state.pending[0]?.status).toBe('sending')
    })

    it('reintentar algo que no esta fallido no hace nada', async () => {
      const h = setup()
      const socket = await connectFully(h)

      h.session.send('hola')
      h.session.retry('cmd-1')
      h.session.retry('no-existe')

      expect(socket.frames().filter((f) => f.type === 'chat.send')).toHaveLength(1)
    })

    it('descartar quita el pendiente', async () => {
      const h = setup()
      const socket = await connectFully(h)

      h.session.send('hola')
      rejectFirst(socket, 'RATE_LIMITED')
      h.session.dismiss('cmd-1')

      expect(h.session.getSnapshot().state.pending).toEqual([])
    })
  })
})

describe('ChatSession: huecos de seq', () => {
  it('un salto pide el historial con el ultimo seq aplicado, y una sola vez', async () => {
    const h = setup()
    const socket = await connectFully(h, [wire(1)], 1)

    socket.message(live(3))
    socket.message(live(4))
    socket.message(live(5))

    const resubscribes = socket.frames().filter((f) => f.type === 'chat.subscribe')

    expect(resubscribes).toHaveLength(2) // la inicial y la de resincronizacion
    expect(resubscribes[1]).toEqual({ type: 'chat.subscribe', channel: 'lobby', lastSeq: 1 })
    expect(h.session.getSnapshot().state.messages.map((m) => m.seq)).toEqual([1])
  })

  it('la respuesta trae lo que falta y la sesion sigue funcionando', async () => {
    const h = setup()
    const socket = await connectFully(h, [wire(1)], 1)

    socket.message(live(3))
    socket.message(subscribed([wire(2), wire(3)], 3))
    socket.message(live(4))

    expect(h.session.getSnapshot().state.messages.map((m) => m.seq)).toEqual([1, 2, 3, 4])
  })

  it('tras resolverse, un nuevo salto vuelve a pedir el historial', async () => {
    const h = setup()
    const socket = await connectFully(h, [wire(1)], 1)

    socket.message(live(3))
    socket.message(subscribed([wire(2), wire(3)], 3))
    socket.message(live(6))

    expect(socket.frames().filter((f) => f.type === 'chat.subscribe')).toHaveLength(3)
  })
})

describe('ChatSession: reconexion (lo que el chat construye sobre la conexion compartida)', () => {
  it('al perderse la conexion pide un ticket NUEVO y vuelve a suscribirse con lastSeq', async () => {
    const h = setup()
    const first = await connectFully(h, [wire(1), wire(2)], 2)

    first.close(1006)
    expect(h.session.getSnapshot().connection).toBe('reconnecting')

    await vi.advanceTimersByTimeAsync(1_000)
    const second = lastSocket(h)

    expect(second).not.toBe(first)
    second.open()
    second.message({ type: 'auth.ok' })

    expect(second.frames()).toEqual([
      { type: 'auth', ticket: 'ticket-2' },
      { type: 'chat.subscribe', channel: 'lobby', lastSeq: 2 },
    ])
    expect(h.ticketProvider).toHaveBeenCalledTimes(2)
  })

  it('lo pendiente se reenvia con el MISMO commandId tras reconectar (sin duplicados)', async () => {
    const h = setup()
    const first = await connectFully(h)

    h.session.send('no llego el aceptado')
    first.close(1006)
    await vi.advanceTimersByTimeAsync(1_000)

    const second = lastSocket(h)

    second.open()
    second.message({ type: 'auth.ok' })
    second.message(subscribed([], 0))

    expect(second.frames().filter((f) => f.type === 'chat.send')).toEqual([
      { type: 'chat.send', channel: 'lobby', commandId: 'cmd-1', text: 'no llego el aceptado' },
    ])
  })

  it('lo escrito mientras esta desconectado sale al reconectar', async () => {
    const h = setup()
    const first = await connectFully(h)

    first.close(1006)
    h.session.send('sin conexion')

    await vi.advanceTimersByTimeAsync(1_000)
    const second = lastSocket(h)

    second.open()
    second.message({ type: 'auth.ok' })
    second.message(subscribed([], 0))

    expect(second.frames().filter((f) => f.type === 'chat.send')).toHaveLength(1)
  })

  it('si la sesion venció al reconectar, queda disabled y no abre otro socket', async () => {
    const h = setup()
    const first = await connectFully(h)

    h.signedIn.current = false
    first.close(1006)
    await vi.advanceTimersByTimeAsync(1_000)

    expect(h.sockets).toHaveLength(1)
    expect(h.session.getSnapshot().connection).toBe('disabled')
  })

  it('cuando el servidor rechaza el ticket varias veces seguidas (4401), queda disabled', async () => {
    const h = setup()

    h.session.start()

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await vi.advanceTimersByTimeAsync(10_000)
      lastSocket(h).close(4401)
    }

    await vi.advanceTimersByTimeAsync(60_000)

    expect(h.session.getSnapshot().connection).toBe('disabled')
    expect(h.sockets).toHaveLength(3)
  })
})

describe('ChatSession: parar', () => {
  it('sale del canal de forma ordenada, cierra y no reconecta', async () => {
    const h = setup()
    const socket = await connectFully(h)

    h.session.stop()

    expect(socket.frames().at(-1)).toEqual({ type: 'chat.unsubscribe', channel: 'lobby' })
    expect(socket.closeCalls).toBe(1)

    await vi.advanceTimersByTimeAsync(60_000)
    expect(h.sockets).toHaveLength(1)
  })

  it('cancela una reconexion programada', async () => {
    const h = setup()
    const socket = await connectFully(h)

    socket.close(1006)
    h.session.stop()
    await vi.advanceTimersByTimeAsync(60_000)

    expect(h.sockets).toHaveLength(1)
  })

  it('parar antes de que llegue el ticket no abre ningun socket', async () => {
    const h = setup()

    h.session.start()
    h.session.stop()
    await settle()

    expect(h.sockets).toHaveLength(0)
  })

  it('lo que llegue de un socket ya descartado se ignora', async () => {
    const h = setup()
    const socket = await connectFully(h)

    h.session.stop()
    socket.message(live(1))

    expect(h.session.getSnapshot().state.messages).toEqual([])
  })

  it('start despues de stop vuelve a conectar (React StrictMode monta dos veces)', async () => {
    const h = setup()

    h.session.start()
    h.session.stop()
    h.session.start()
    await settle()

    // El primer intento se cancelo antes de abrir su socket: solo queda el segundo.
    expect(h.sockets).toHaveLength(1)
    expect(h.ticketProvider).toHaveBeenCalledTimes(2)
  })

  it('start repetido no abre un segundo socket', async () => {
    const h = setup()

    h.session.start()
    h.session.start()
    await settle()

    expect(h.sockets).toHaveLength(1)
    expect(h.ticketProvider).toHaveBeenCalledTimes(1)
  })
})

describe('ChatSession: suscriptores del estado', () => {
  it('notifica los cambios y deja de notificar al cancelar la suscripcion', async () => {
    const h = setup()
    const listener = vi.fn()
    const cancel = h.session.subscribe(listener)
    const socket = await connectFully(h)

    expect(listener).toHaveBeenCalled()

    listener.mockClear()
    cancel()
    socket.message(live(1))

    expect(listener).not.toHaveBeenCalled()
  })

  it('la instantanea es la misma mientras no cambie nada (useSyncExternalStore lo exige)', async () => {
    const h = setup()
    const socket = await connectFully(h)
    const before = h.session.getSnapshot()

    socket.message({ type: 'desconocido' })

    expect(h.session.getSnapshot()).toBe(before)
  })
})
