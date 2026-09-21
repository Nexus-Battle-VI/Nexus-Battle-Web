import { describe, expect, it } from 'vitest'

import {
  LOBBY_CHANNEL,
  channelFromKey,
  channelKey,
  parseServerFrame,
  sendFrame,
  subscribeFrame,
  unsubscribeFrame,
} from './chatProtocol'

const ROOM = '11111111-1111-4111-8111-111111111111'

const wireMessage = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  messageId: 'm-1',
  channel: 'lobby',
  seq: 1,
  commandId: 'c-1',
  sender: { displayName: 'Ana' },
  text: 'hola',
  sentAt: '2026-09-20T12:00:00.000Z',
  ...over,
})

const parse = (value: unknown) => parseServerFrame(JSON.stringify(value))

describe('canal', () => {
  it('la clave del lobby y de una sala', () => {
    expect(channelKey(LOBBY_CHANNEL)).toBe('lobby')
    expect(channelKey({ kind: 'room', roomId: ROOM })).toBe(`room:${ROOM}`)
  })

  it('channelFromKey es la inversa de channelKey', () => {
    expect(channelFromKey('lobby')).toEqual(LOBBY_CHANNEL)
    expect(channelFromKey(`room:${ROOM}`)).toEqual({ kind: 'room', roomId: ROOM })
  })
})

describe('mensajes del cliente', () => {
  it('subscribe al lobby sin lastSeq cuando aun no se aplico nada', () => {
    expect(subscribeFrame(LOBBY_CHANNEL, 0)).toEqual({
      type: 'chat.subscribe',
      channel: 'lobby',
    })
  })

  it('subscribe a una sala con lastSeq cuando ya se aplico algo', () => {
    expect(subscribeFrame({ kind: 'room', roomId: ROOM }, 7)).toEqual({
      type: 'chat.subscribe',
      channel: 'room',
      roomId: ROOM,
      lastSeq: 7,
    })
  })

  it('send lleva el canal, el commandId y el texto', () => {
    expect(sendFrame({ kind: 'room', roomId: ROOM }, 'c-9', 'hola')).toEqual({
      type: 'chat.send',
      channel: 'room',
      roomId: ROOM,
      commandId: 'c-9',
      text: 'hola',
    })
  })

  it('unsubscribe del lobby no lleva roomId', () => {
    expect(unsubscribeFrame(LOBBY_CHANNEL)).toEqual({
      type: 'chat.unsubscribe',
      channel: 'lobby',
    })
  })
})

describe('parseServerFrame', () => {
  it('auth.ok no es un mensaje de chat: lo consume la conexion compartida', () => {
    expect(parse({ type: 'auth.ok' })).toBeNull()
  })

  it('chat.message del lobby', () => {
    expect(parse({ type: 'chat.message', ...wireMessage() })).toEqual({
      type: 'chat.message',
      channel: LOBBY_CHANNEL,
      message: {
        messageId: 'm-1',
        seq: 1,
        commandId: 'c-1',
        senderName: 'Ana',
        text: 'hola',
        sentAt: '2026-09-20T12:00:00.000Z',
      },
    })
  })

  it('chat.message de una sala conserva el roomId', () => {
    const frame = parse({ type: 'chat.message', ...wireMessage({ channel: 'room', roomId: ROOM }) })

    expect(frame).toMatchObject({ type: 'chat.message', channel: { kind: 'room', roomId: ROOM } })
  })

  it('el texto se conserva TAL CUAL: HTML incluido', () => {
    const frame = parse({
      type: 'chat.message',
      ...wireMessage({ text: '<img src=x onerror=alert(1)>' }),
    })

    expect(frame).toMatchObject({ message: { text: '<img src=x onerror=alert(1)>' } })
  })

  it('chat.subscribed con historial', () => {
    const frame = parse({
      type: 'chat.subscribed',
      channel: 'lobby',
      upTo: 3,
      truncated: true,
      messages: [
        wireMessage({ seq: 2 }),
        wireMessage({ messageId: 'm-2', commandId: 'c-2', seq: 3 }),
      ],
    })

    expect(frame).toMatchObject({ type: 'chat.subscribed', upTo: 3, truncated: true })
    expect(frame !== null && frame.type === 'chat.subscribed' && frame.messages).toHaveLength(2)
  })

  it('chat.subscribed con historial vacio', () => {
    expect(
      parse({ type: 'chat.subscribed', channel: 'lobby', upTo: 0, truncated: false, messages: [] }),
    ).toMatchObject({ upTo: 0, messages: [] })
  })

  it('un elemento invalido descarta TODO el historial (no se aplica a medias)', () => {
    expect(
      parse({
        type: 'chat.subscribed',
        channel: 'lobby',
        upTo: 2,
        truncated: false,
        messages: [wireMessage({ seq: 1 }), wireMessage({ seq: 'x' })],
      }),
    ).toBeNull()
  })

  it('chat.accepted', () => {
    expect(
      parse({ type: 'chat.accepted', commandId: 'c-1', seq: 4, messageId: 'm-4', duplicate: true }),
    ).toEqual({
      type: 'chat.accepted',
      commandId: 'c-1',
      seq: 4,
      messageId: 'm-4',
      duplicate: true,
    })
  })

  it('chat.unsubscribed', () => {
    expect(
      parse({
        type: 'chat.unsubscribed',
        channel: 'room',
        roomId: ROOM,
        reason: 'ROOM_NOT_ACTIVE',
      }),
    ).toEqual({
      type: 'chat.unsubscribed',
      channel: { kind: 'room', roomId: ROOM },
      reason: 'ROOM_NOT_ACTIVE',
    })
  })

  it('command.rejected con y sin commandId, con datos opcionales', () => {
    expect(
      parse({
        type: 'command.rejected',
        command: 'chat.send',
        commandId: 'c-1',
        code: 'RATE_LIMITED',
        retryAfterMs: 4000,
      }),
    ).toEqual({
      type: 'command.rejected',
      command: 'chat.send',
      commandId: 'c-1',
      code: 'RATE_LIMITED',
      retryAfterMs: 4000,
      maxLength: null,
    })
    expect(
      parse({ type: 'command.rejected', command: 'chat.subscribe', code: 'NOT_A_PARTICIPANT' }),
    ).toMatchObject({ commandId: null, retryAfterMs: null, maxLength: null })
  })

  describe('lo que se descarta', () => {
    it.each([
      ['no es texto', 42],
      ['no es JSON', '{no'],
      ['JSON que no es objeto', '[1,2]'],
      ['sin type', '{"a":1}'],
      ['type desconocido', '{"type":"chat.otra-cosa"}'],
      ['type que no es texto', '{"type":5}'],
    ])('%s', (_label, raw) => {
      expect(parseServerFrame(raw)).toBeNull()
    })

    it.each([
      ['seq 0', { seq: 0 }],
      ['seq negativo', { seq: -1 }],
      ['seq decimal', { seq: 1.5 }],
      ['seq como texto', { seq: '1' }],
      ['sin messageId', { messageId: '' }],
      ['sin commandId', { commandId: undefined }],
      ['sin remitente', { sender: undefined }],
      ['nombre vacio', { sender: { displayName: '' } }],
      ['texto que no es cadena', { text: 5 }],
      ['sin fecha', { sentAt: '' }],
      ['canal desconocido', { channel: 'global' }],
      ['sala sin roomId', { channel: 'room' }],
    ])('chat.message con %s', (_label, over) => {
      expect(parse({ type: 'chat.message', ...wireMessage(over) })).toBeNull()
    })

    it.each([
      ['upTo negativo', { upTo: -1 }],
      ['upTo decimal', { upTo: 1.2 }],
      ['truncated que no es booleano', { truncated: 'no' }],
      ['messages que no es arreglo', { messages: 'x' }],
    ])('chat.subscribed con %s', (_label, over) => {
      expect(
        parse({
          type: 'chat.subscribed',
          channel: 'lobby',
          upTo: 0,
          truncated: false,
          messages: [],
          ...over,
        }),
      ).toBeNull()
    })

    it('chat.accepted incompleto', () => {
      expect(parse({ type: 'chat.accepted', commandId: 'c-1' })).toBeNull()
    })

    it('chat.unsubscribed sin motivo', () => {
      expect(parse({ type: 'chat.unsubscribed', channel: 'lobby' })).toBeNull()
    })

    it('command.rejected sin codigo', () => {
      expect(parse({ type: 'command.rejected', command: 'chat.send' })).toBeNull()
    })
  })
})
