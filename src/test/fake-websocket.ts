import type { SocketFactory } from '@/features/battle-rooms/realtime'

/**
 * Doble minimo de `WebSocket` para probar el chat (HU-13) sin red: lo que
 * `ChatSession` usa (`readyState`, `send`, `close` y los eventos `open`,
 * `message`, `close` y `error`). `close()` dispara `close` con el codigo dado,
 * como el navegador.
 */
export class FakeWebSocket extends EventTarget {
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

/** Fabrica que registra cada socket creado. */
export const recordingSocketFactory = (): {
  readonly factory: SocketFactory
  readonly sockets: FakeWebSocket[]
} => {
  const sockets: FakeWebSocket[] = []

  return {
    sockets,
    factory: (url) => {
      const socket = new FakeWebSocket(url)

      sockets.push(socket)

      return socket as unknown as WebSocket
    },
  }
}
