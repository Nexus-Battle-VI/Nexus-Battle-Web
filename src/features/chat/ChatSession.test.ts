import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SocketFactory } from '@/features/battle-rooms/realtime'

import { ChatSession, type ChatSessionOptions } from './ChatSession'
import { LOBBY_CHANNEL, type ChatChannel } from './protocol'

/** Doble minimo de `WebSocket`: lo que la sesion usa. */
class FakeSocket extends EventTarget {
  readyState = 0
  readonly sent: string[] = []
  closeCalls = 0

  readonly url: string

  constructor(url: string) {
    super()
    this.url = url
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(code = 1000): void {
    this.closeCalls += 1
    this.readyState = 3
    this.dispatchEvent(new CloseEvent('close', { code }))
  }

  open(): void {
    this.readyState = 1
    this.dispatchEvent(new Event('open'))
  }

  message(data: unknown): void {
    this.dispatchEvent(
      new MessageEvent('message', { data: typeof data === 'string' ? data : JSON.stringify(data) }),
    )
  }

  fail(): void {
    this.dispatchEvent(new Event('error'))
  }

  frames(): Record<string, unknown>[] {
    return this.sent.map((raw) => JSON.parse(raw) as Record<string, unknown>)
  }
}

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
  readonly sockets: FakeSocket[]
  readonly tokens: { current: string | null }
}

const setup = (
  channel: ChatChannel = LOBBY_CHANNEL,
  over: Partial<ChatSessionOptions> = {},
): Harness => {
  const sockets: FakeSocket[] = []
  const tokens: { current: string | null } = { current: 'jwt-1' }
  let n = 0
  const factory: SocketFactory = (url) => {
    const socket = new FakeSocket(url)

    sockets.push(socket)

    return socket as unknown as WebSocket
  }

  const session = new ChatSession({
    channel,
    url: 'ws://localhost/api/v1/combat/realtime',
    getToken: () => tokens.current,
    newCommandId: () => {
      n += 1

      return `cmd-${String(n)}`
    },
    socketFactory: factory,
    ...over,
  })

  return { session, sockets, tokens }
}

/** Abre el socket, autentica y completa la suscripcion inicial. */
const connectFully = (
  h: Harness,
  messages: Record<string, unknown>[] = [],
  upTo = 0,
): FakeSocket => {
  h.session.start()
  const socket = h.sockets.at(-1)

  if (socket === undefined) {
    throw new Error('la sesion no abrio ningun socket')
  }

  socket.open()
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
  it('sin testimonio vigente no se conecta (disabled)', () => {
    const h = setup()

    h.tokens.current = null
    h.session.start()

    expect(h.sockets).toHaveLength(0)
    expect(h.session.getSnapshot().connection).toBe('disabled')
  })

  it('al abrir el socket envia SOLO auth, con el testimonio en el cuerpo', () => {
    const h = setup()

    h.session.start()
    h.sockets[0]?.open()

    expect(h.sockets[0]?.frames()).toEqual([{ type: 'auth', token: 'jwt-1' }])
    expect(h.sockets[0]?.url).not.toContain('jwt-1')
    expect(h.session.getSnapshot().connection).toBe('connecting')
  })

  it('NO se suscribe hasta recibir auth.ok (no depende de que el servidor ordene mensajes seguidos)', () => {
    const h = setup()

    h.session.start()
    h.sockets[0]?.open()

    expect(h.sockets[0]?.frames().map((f) => f.type)).toEqual(['auth'])

    h.sockets[0]?.message({ type: 'auth.ok' })

    expect(h.sockets[0]?.frames().map((f) => f.type)).toEqual(['auth', 'chat.subscribe'])
  })

  it('la primera suscripcion no lleva lastSeq', () => {
    const h = setup()

    h.session.start()
    h.sockets[0]?.open()
    h.sockets[0]?.message({ type: 'auth.ok' })

    expect(h.sockets[0]?.frames()[1]).toEqual({ type: 'chat.subscribe', channel: 'lobby' })
  })

  it('un canal de sala se suscribe con su roomId', () => {
    const h = setup({ kind: 'room', roomId: ROOM })

    h.session.start()
    h.sockets[0]?.open()
    h.sockets[0]?.message({ type: 'auth.ok' })

    expect(h.sockets[0]?.frames()[1]).toEqual({
      type: 'chat.subscribe',
      channel: 'room',
      roomId: ROOM,
    })
  })

  it('chat.subscribed abre la conexion y carga el historial', () => {
    const h = setup()

    connectFully(h, [wire(1), wire(2)], 2)

    expect(h.session.getSnapshot().connection).toBe('open')
    expect(h.session.getSnapshot().state.messages.map((m) => m.seq)).toEqual([1, 2])
  })

  it('un mensaje en vivo se aplica al estado', () => {
    const h = setup()
    const socket = connectFully(h, [], 0)

    socket.message(live(1))

    expect(h.session.getSnapshot().state.messages).toHaveLength(1)
  })

  it('ignora lo que no cumple el contrato sin romper la conexion', () => {
    const h = setup()
    const socket = connectFully(h)

    socket.message('esto no es json')
    socket.message({ type: 'chat.message', seq: 'x' })
    socket.message({ type: 'desconocido' })

    expect(h.session.getSnapshot().state.messages).toEqual([])
    expect(h.session.getSnapshot().connection).toBe('open')
    expect(socket.closeCalls).toBe(0)
  })
})

describe('ChatSession: enviar', () => {
  it('un mensaje vacio o de solo espacios no se envia ni queda pendiente', () => {
    const h = setup()
    const socket = connectFully(h)
    const before = socket.sent.length

    expect(h.session.send('')).toBe('empty')
    expect(h.session.send('     ')).toBe('empty')

    expect(socket.sent).toHaveLength(before)
    expect(h.session.getSnapshot().state.pending).toEqual([])
  })

  it('con el canal confirmado sale de inmediato, recortado y con un commandId nuevo', () => {
    const h = setup()
    const socket = connectFully(h)

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

  it('cada envio usa un commandId distinto', () => {
    const h = setup()
    const socket = connectFully(h)

    h.session.send('uno')
    h.session.send('dos')

    const ids = socket
      .frames()
      .filter((f) => f.type === 'chat.send')
      .map((f) => f.commandId)

    expect(ids).toEqual(['cmd-1', 'cmd-2'])
  })

  it('antes de confirmarse la suscripcion queda pendiente y sale al confirmarse', () => {
    const h = setup()

    h.session.start()
    h.sockets[0]?.open()
    h.session.send('temprano')

    expect(h.sockets[0]?.frames().some((f) => f.type === 'chat.send')).toBe(false)
    expect(h.session.getSnapshot().state.pending).toHaveLength(1)

    h.sockets[0]?.message({ type: 'auth.ok' })
    h.sockets[0]?.message(subscribed([], 0))

    expect(h.sockets[0]?.frames().filter((f) => f.type === 'chat.send')).toEqual([
      { type: 'chat.send', channel: 'lobby', commandId: 'cmd-1', text: 'temprano' },
    ])
  })

  it('llega el mensaje propio: deja de estar pendiente', () => {
    const h = setup()
    const socket = connectFully(h)

    h.session.send('hola')
    socket.message(live(1, { commandId: 'cmd-1', text: 'hola' }))

    expect(h.session.getSnapshot().state.pending).toEqual([])
    expect(h.session.getSnapshot().state.mine.has('cmd-1')).toBe(true)
  })

  describe('reintentar', () => {
    const rejectFirst = (socket: FakeSocket, code: string): void => {
      socket.message({ type: 'command.rejected', command: 'chat.send', commandId: 'cmd-1', code })
    }

    it('reenvia un mensaje fallido con el MISMO commandId', () => {
      const h = setup()
      const socket = connectFully(h)

      h.session.send('hola')
      rejectFirst(socket, 'CHAT_UNAVAILABLE')
      expect(h.session.getSnapshot().state.pending[0]?.status).toBe('failed')

      h.session.retry('cmd-1')

      const sends = socket.frames().filter((f) => f.type === 'chat.send')

      expect(sends).toHaveLength(2)
      expect(sends[1]).toEqual(sends[0])
      expect(h.session.getSnapshot().state.pending[0]?.status).toBe('sending')
    })

    it('reintentar algo que no esta fallido no hace nada', () => {
      const h = setup()
      const socket = connectFully(h)

      h.session.send('hola')
      h.session.retry('cmd-1')
      h.session.retry('no-existe')

      expect(socket.frames().filter((f) => f.type === 'chat.send')).toHaveLength(1)
    })

    it('descartar quita el pendiente', () => {
      const h = setup()
      const socket = connectFully(h)

      h.session.send('hola')
      rejectFirst(socket, 'RATE_LIMITED')
      h.session.dismiss('cmd-1')

      expect(h.session.getSnapshot().state.pending).toEqual([])
    })
  })
})

describe('ChatSession: huecos de seq', () => {
  it('un salto pide el historial con el ultimo seq aplicado, y una sola vez', () => {
    const h = setup()
    const socket = connectFully(h, [wire(1)], 1)

    socket.message(live(3))
    socket.message(live(4))
    socket.message(live(5))

    const resubscribes = socket.frames().filter((f) => f.type === 'chat.subscribe')

    expect(resubscribes).toHaveLength(2) // la inicial y la de resincronizacion
    expect(resubscribes[1]).toEqual({ type: 'chat.subscribe', channel: 'lobby', lastSeq: 1 })
    expect(h.session.getSnapshot().state.messages.map((m) => m.seq)).toEqual([1])
  })

  it('la respuesta trae lo que falta y la sesion sigue funcionando', () => {
    const h = setup()
    const socket = connectFully(h, [wire(1)], 1)

    socket.message(live(3))
    socket.message(subscribed([wire(2), wire(3)], 3))
    socket.message(live(4))

    expect(h.session.getSnapshot().state.messages.map((m) => m.seq)).toEqual([1, 2, 3, 4])
  })

  it('tras resolverse, un nuevo salto vuelve a pedir el historial', () => {
    const h = setup()
    const socket = connectFully(h, [wire(1)], 1)

    socket.message(live(3))
    socket.message(subscribed([wire(2), wire(3)], 3))
    socket.message(live(6))

    expect(socket.frames().filter((f) => f.type === 'chat.subscribe')).toHaveLength(3)
  })
})

describe('ChatSession: reconexion', () => {
  it('al cerrarse reconecta con espera exponencial y vuelve a autenticar y suscribirse con lastSeq', () => {
    const h = setup()
    const first = connectFully(h, [wire(1), wire(2)], 2)

    first.close(1006)
    expect(h.session.getSnapshot().connection).toBe('reconnecting')
    expect(h.sockets).toHaveLength(1)

    vi.advanceTimersByTime(999)
    expect(h.sockets).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(h.sockets).toHaveLength(2)

    const second = h.sockets[1]

    second?.open()
    second?.message({ type: 'auth.ok' })

    expect(second?.frames()).toEqual([
      { type: 'auth', token: 'jwt-1' },
      { type: 'chat.subscribe', channel: 'lobby', lastSeq: 2 },
    ])
  })

  it('la espera crece 1 s, 2 s, 4 s... hasta 10 s y se reinicia al suscribirse', () => {
    const h = setup()

    h.session.start()

    const delays: number[] = []

    for (let i = 0; i < 6; i += 1) {
      const socket = h.sockets.at(-1)

      socket?.close(1006)
      const before = h.sockets.length
      let waited = 0

      while (h.sockets.length === before && waited < 20_000) {
        vi.advanceTimersByTime(500)
        waited += 500
      }

      delays.push(waited)
    }

    expect(delays).toEqual([1_000, 2_000, 4_000, 8_000, 10_000, 10_000])

    // Al conseguir suscribirse, la espera vuelve a empezar en 1 s.
    const last = h.sockets.at(-1)

    last?.open()
    last?.message({ type: 'auth.ok' })
    last?.message(subscribed([], 0))
    last?.close(1006)

    const count = h.sockets.length

    vi.advanceTimersByTime(1_000)

    expect(h.sockets).toHaveLength(count + 1)
  })

  it('lo pendiente se reenvia con el MISMO commandId tras reconectar (sin duplicados)', () => {
    const h = setup()
    const first = connectFully(h)

    h.session.send('no llego el aceptado')
    first.close(1006)
    vi.advanceTimersByTime(1_000)

    const second = h.sockets[1]

    second?.open()
    second?.message({ type: 'auth.ok' })
    second?.message(subscribed([], 0))

    expect(second?.frames().filter((f) => f.type === 'chat.send')).toEqual([
      { type: 'chat.send', channel: 'lobby', commandId: 'cmd-1', text: 'no llego el aceptado' },
    ])
  })

  it('lo escrito mientras esta desconectado sale al reconectar', () => {
    const h = setup()
    const first = connectFully(h)

    first.close(1006)
    h.session.send('sin conexion')

    vi.advanceTimersByTime(1_000)
    const second = h.sockets[1]

    second?.open()
    second?.message({ type: 'auth.ok' })
    second?.message(subscribed([], 0))

    expect(second?.frames().filter((f) => f.type === 'chat.send')).toHaveLength(1)
  })

  it('pide un testimonio NUEVO en cada conexion', () => {
    const h = setup()
    const first = connectFully(h)

    h.tokens.current = 'jwt-2'
    first.close(1006)
    vi.advanceTimersByTime(1_000)
    h.sockets[1]?.open()

    expect(h.sockets[1]?.frames()[0]).toEqual({ type: 'auth', token: 'jwt-2' })
  })

  it('si el testimonio ya no esta vigente al reconectar, queda disabled', () => {
    const h = setup()
    const first = connectFully(h)

    h.tokens.current = null
    first.close(1006)
    vi.advanceTimersByTime(1_000)

    expect(h.sockets).toHaveLength(1)
    expect(h.session.getSnapshot().connection).toBe('disabled')
  })

  it('un cierre 4401 (no autenticado) NO reintenta: queda disabled', () => {
    const h = setup()

    h.session.start()
    h.sockets[0]?.open()
    h.sockets[0]?.close(4401)
    vi.advanceTimersByTime(60_000)

    expect(h.sockets).toHaveLength(1)
    expect(h.session.getSnapshot().connection).toBe('disabled')
  })

  it('un error del socket lo cierra para que se reconecte', () => {
    const h = setup()

    h.session.start()
    h.sockets[0]?.fail()

    expect(h.sockets[0]?.closeCalls).toBe(1)
    vi.advanceTimersByTime(1_000)
    expect(h.sockets).toHaveLength(2)
  })
})

describe('ChatSession: parar', () => {
  it('sale del canal de forma ordenada, cierra y no reconecta', () => {
    const h = setup()
    const socket = connectFully(h)

    h.session.stop()

    expect(socket.frames().at(-1)).toEqual({ type: 'chat.unsubscribe', channel: 'lobby' })
    expect(socket.closeCalls).toBe(1)

    vi.advanceTimersByTime(60_000)
    expect(h.sockets).toHaveLength(1)
  })

  it('cancela una reconexion programada', () => {
    const h = setup()
    const socket = connectFully(h)

    socket.close(1006)
    h.session.stop()
    vi.advanceTimersByTime(60_000)

    expect(h.sockets).toHaveLength(1)
  })

  it('lo que llegue de un socket ya descartado se ignora', () => {
    const h = setup()
    const socket = connectFully(h)

    h.session.stop()
    socket.message(live(1))

    expect(h.session.getSnapshot().state.messages).toEqual([])
  })

  it('start despues de stop vuelve a conectar (React StrictMode monta dos veces)', () => {
    const h = setup()

    h.session.start()
    h.session.stop()
    h.session.start()

    expect(h.sockets).toHaveLength(2)
  })

  it('start repetido no abre un segundo socket', () => {
    const h = setup()

    h.session.start()
    h.session.start()

    expect(h.sockets).toHaveLength(1)
  })
})

describe('ChatSession: suscriptores del estado', () => {
  it('notifica los cambios y deja de notificar al cancelar la suscripcion', () => {
    const h = setup()
    const listener = vi.fn()
    const cancel = h.session.subscribe(listener)
    const socket = connectFully(h)

    expect(listener).toHaveBeenCalled()

    listener.mockClear()
    cancel()
    socket.message(live(1))

    expect(listener).not.toHaveBeenCalled()
  })

  it('la instantanea es la misma mientras no cambie nada (useSyncExternalStore lo exige)', () => {
    const h = setup()
    const socket = connectFully(h)
    const before = h.session.getSnapshot()

    socket.message({ type: 'desconocido' })

    expect(h.session.getSnapshot()).toBe(before)
  })
})
