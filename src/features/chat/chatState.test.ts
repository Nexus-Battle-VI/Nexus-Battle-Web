import { describe, expect, it } from 'vitest'

import {
  MAX_KEPT_MESSAGES,
  initialChatState,
  reduceChat,
  type ChatAction,
  type ChatState,
} from './chatState'
import { LOBBY_CHANNEL, type ChatMessage, type ServerFrame } from './protocol'

const message = (seq: number, over: Partial<ChatMessage> = {}): ChatMessage => ({
  messageId: `m-${String(seq)}`,
  seq,
  commandId: `c-${String(seq)}`,
  senderName: 'Ana',
  text: `mensaje ${String(seq)}`,
  sentAt: '2026-09-20T12:00:00.000Z',
  ...over,
})

const frame = (f: ServerFrame): ChatAction => ({ type: 'frame', frame: f })

const live = (seq: number, over: Partial<ChatMessage> = {}): ChatAction =>
  frame({ type: 'chat.message', channel: LOBBY_CHANNEL, message: message(seq, over) })

const subscribed = (
  messages: readonly ChatMessage[],
  upTo: number,
  truncated = false,
): ChatAction =>
  frame({ type: 'chat.subscribed', channel: LOBBY_CHANNEL, upTo, truncated, messages })

const run = (actions: readonly ChatAction[], from: ChatState = initialChatState): ChatState =>
  actions.reduce(reduceChat, from)

const seqs = (state: ChatState): number[] => state.messages.map((m) => m.seq)

describe('estado inicial', () => {
  it('sin mensajes, sin pendientes y al dia en 0', () => {
    expect(initialChatState).toMatchObject({
      messages: [],
      lastSeq: 0,
      truncated: false,
      pending: [],
      closedReason: null,
      resync: false,
    })
  })
})

describe('chat.message: orden y sin duplicados', () => {
  it('aplica mensajes consecutivos en orden', () => {
    const state = run([live(1), live(2), live(3)])

    expect(seqs(state)).toEqual([1, 2, 3])
    expect(state.lastSeq).toBe(3)
  })

  it('un seq repetido se ignora', () => {
    const state = run([live(1), live(2), live(2), live(1)])

    expect(seqs(state)).toEqual([1, 2])
  })

  it('un seq anterior al ultimo aplicado se ignora', () => {
    const state = run([live(1), live(2), live(3), live(2)])

    expect(seqs(state)).toEqual([1, 2, 3])
  })

  describe('salto de seq (posible perdida)', () => {
    it('no se aplica y se pide el historial', () => {
      const state = run([live(1), live(3)])

      expect(seqs(state)).toEqual([1])
      expect(state.lastSeq).toBe(1)
      expect(state.resync).toBe(true)
    })

    it('frontera: un salto de exactamente 2 ya es salto; de 1 no', () => {
      expect(run([live(1), live(2)]).resync).toBe(false)
      expect(run([live(1), live(3)]).resync).toBe(true)
    })

    it('mientras se resincroniza, otros saltos no cambian nada mas', () => {
      const state = run([live(1), live(3), live(4), live(5)])

      expect(seqs(state)).toEqual([1])
      expect(state.resync).toBe(true)
    })

    it('la respuesta del historial trae lo que falta, en orden, y cierra la resincronizacion', () => {
      const state = run([live(1), live(4), subscribed([message(2), message(3), message(4)], 4)])

      expect(seqs(state)).toEqual([1, 2, 3, 4])
      expect(state.lastSeq).toBe(4)
      expect(state.resync).toBe(false)
    })

    it('un hueco INOCUO (el 3 no existe): el historial cubre hasta upTo y sigue', () => {
      const state = run([live(1), live(2), live(4), subscribed([message(4)], 4), live(5)])

      expect(seqs(state)).toEqual([1, 2, 4, 5])
      expect(state.lastSeq).toBe(5)
      expect(state.resync).toBe(false)
    })
  })
})

describe('chat.subscribed', () => {
  it('carga el historial recibido, ordenado, y queda al dia hasta upTo', () => {
    const state = run([subscribed([message(3), message(1), message(2)], 3)])

    expect(seqs(state)).toEqual([1, 2, 3])
    expect(state.lastSeq).toBe(3)
  })

  it('upTo mayor que el ultimo mensaje: al dia hasta upTo (los intermedios no existen)', () => {
    const state = run([subscribed([message(2)], 5)])

    expect(state.lastSeq).toBe(5)
    // Un mensaje 4 tardio ya no se aplica: upTo dijo que esta al dia.
    expect(seqs(run([live(4)], state))).toEqual([2])
  })

  it('lastSeq nunca retrocede', () => {
    const state = run([live(1), live(2), live(3), subscribed([], 1)])

    expect(state.lastSeq).toBe(3)
  })

  it('tras reconectar solo suma lo posterior al ultimo aplicado (sin repetir)', () => {
    const state = run([live(1), live(2), subscribed([message(2), message(3)], 3)])

    expect(seqs(state)).toEqual([1, 2, 3])
  })

  it('conserva el aviso de que habia mas mensajes de los que caben', () => {
    expect(run([subscribed([message(9)], 9, true)]).truncated).toBe(true)
    expect(run([subscribed([message(9)], 9, true), subscribed([], 9, false)]).truncated).toBe(false)
  })

  it('reabre un canal que se habia cerrado', () => {
    const closed = run([
      frame({ type: 'chat.unsubscribed', channel: LOBBY_CHANNEL, reason: 'ROOM_NOT_ACTIVE' }),
    ])

    expect(closed.closedReason).toBe('ROOM_NOT_ACTIVE')
    expect(run([subscribed([], 0)], closed).closedReason).toBeNull()
  })

  it(`solo conserva los ultimos ${String(MAX_KEPT_MESSAGES)} mensajes`, () => {
    const many = Array.from({ length: MAX_KEPT_MESSAGES + 25 }, (_v, i) => message(i + 1))
    const state = run([subscribed(many, many.length)])

    expect(state.messages).toHaveLength(MAX_KEPT_MESSAGES)
    expect(state.messages[0]?.seq).toBe(26)
    expect(state.messages.at(-1)?.seq).toBe(MAX_KEPT_MESSAGES + 25)
  })
})

describe('mensajes propios y pendientes', () => {
  const send = (commandId: string, text = 'hola'): ChatAction => ({
    type: 'local.send',
    commandId,
    text,
  })

  it('enviar deja el mensaje pendiente y lo marca como propio', () => {
    const state = run([send('c-1')])

    expect(state.pending).toEqual([
      { commandId: 'c-1', text: 'hola', status: 'sending', failure: null },
    ])
    expect(state.mine.has('c-1')).toBe(true)
  })

  it('llega el mensaje propio: deja de estar pendiente y no se duplica', () => {
    const state = run([send('c-1'), live(1, { commandId: 'c-1', text: 'hola' })])

    expect(state.pending).toEqual([])
    expect(state.messages).toHaveLength(1)
  })

  it('chat.accepted quita el pendiente aunque el mensaje aun no haya llegado', () => {
    const state = run([
      send('c-1'),
      frame({
        type: 'chat.accepted',
        commandId: 'c-1',
        seq: 4,
        messageId: 'm-4',
        duplicate: false,
      }),
    ])

    expect(state.pending).toEqual([])
  })

  it('un aceptado duplicado tambien lo quita (reintento tras reconectar)', () => {
    const state = run([
      send('c-1'),
      frame({ type: 'chat.accepted', commandId: 'c-1', seq: 4, messageId: 'm-4', duplicate: true }),
    ])

    expect(state.pending).toEqual([])
  })

  it('el historial que ya trae el mensaje propio lo quita de los pendientes', () => {
    const state = run([send('c-9'), subscribed([message(9, { commandId: 'c-9' })], 9)])

    expect(state.pending).toEqual([])
    expect(state.messages).toHaveLength(1)
  })

  it('solo se quita el pendiente correcto', () => {
    const state = run([send('c-1'), send('c-2'), live(1, { commandId: 'c-1' })])

    expect(state.pending.map((p) => p.commandId)).toEqual(['c-2'])
  })

  describe('rechazos', () => {
    const rejected = (over: Record<string, unknown>): ChatAction =>
      frame({
        type: 'command.rejected',
        command: 'chat.send',
        commandId: 'c-1',
        code: 'RATE_LIMITED',
        retryAfterMs: 3000,
        maxLength: null,
        ...over,
      })

    it('marca fallido el pendiente correspondiente con su motivo', () => {
      const state = run([send('c-1'), send('c-2'), rejected({})])

      expect(state.pending[0]).toMatchObject({
        commandId: 'c-1',
        status: 'failed',
        failure: { code: 'RATE_LIMITED', retryAfterMs: 3000 },
      })
      expect(state.pending[1]).toMatchObject({ commandId: 'c-2', status: 'sending' })
    })

    it('un rechazo de un comando que no se conoce no cambia nada', () => {
      const before = run([send('c-1')])

      expect(run([rejected({ commandId: 'c-99' })], before).pending).toEqual(before.pending)
    })

    it.each(['NOT_A_PARTICIPANT', 'ROOM_NOT_ACTIVE', 'ROOM_NOT_FOUND'])(
      '%s al enviar significa que se perdio el acceso al canal',
      (code) => {
        expect(run([send('c-1'), rejected({ code })]).closedReason).toBe(code)
      },
    )

    it('otros rechazos NO cierran el canal', () => {
      expect(run([send('c-1'), rejected({ code: 'EMPTY_MESSAGE' })]).closedReason).toBeNull()
    })

    it('un rechazo sin comando (la suscripcion) cierra el canal con su codigo', () => {
      const state = run([
        frame({
          type: 'command.rejected',
          command: 'chat.subscribe',
          commandId: null,
          code: 'NOT_A_PARTICIPANT',
          retryAfterMs: null,
          maxLength: null,
        }),
      ])

      expect(state.closedReason).toBe('NOT_A_PARTICIPANT')
    })
  })

  describe('reintentar y descartar', () => {
    const failed = (): ChatState =>
      run([
        send('c-1'),
        frame({
          type: 'command.rejected',
          command: 'chat.send',
          commandId: 'c-1',
          code: 'CHAT_UNAVAILABLE',
          retryAfterMs: null,
          maxLength: null,
        }),
      ])

    it('reintentar vuelve a «enviando» y limpia el fallo', () => {
      const state = run([{ type: 'local.retry', commandId: 'c-1' }], failed())

      expect(state.pending[0]).toMatchObject({ status: 'sending', failure: null })
    })

    it('descartar lo quita', () => {
      expect(run([{ type: 'local.dismiss', commandId: 'c-1' }], failed()).pending).toEqual([])
    })
  })

  it('el servidor expulsa del canal: lo pendiente se declara fallido, no se pierde en silencio', () => {
    const state = run([
      send('c-1'),
      frame({ type: 'chat.unsubscribed', channel: LOBBY_CHANNEL, reason: 'NOT_A_PARTICIPANT' }),
    ])

    expect(state.closedReason).toBe('NOT_A_PARTICIPANT')
    expect(state.pending[0]).toMatchObject({
      status: 'failed',
      failure: { code: 'NOT_A_PARTICIPANT' },
    })
  })

  it('salir por decision propia (REQUESTED) no cierra ni falla nada', () => {
    const state = run([
      send('c-1'),
      frame({ type: 'chat.unsubscribed', channel: LOBBY_CHANNEL, reason: 'REQUESTED' }),
    ])

    expect(state.closedReason).toBeNull()
    expect(state.pending[0]?.status).toBe('sending')
  })
})

describe('auth.ok', () => {
  it('no cambia el estado', () => {
    expect(run([frame({ type: 'auth.ok' })])).toBe(initialChatState)
  })
})
