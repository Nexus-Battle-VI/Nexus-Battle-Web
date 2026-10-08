import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/http'
import { BroadcastObserver } from './BroadcastObserver'
import type { BroadcastApi, BroadcastObservation } from './api'
import { BroadcastPreviewApi, previewSnapshot } from '@/test/tournament-broadcast'
const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
describe('HU-79/81: respuestas tardías, reconexión y eliminación de datos al revocar', () => {
  let api: BroadcastPreviewApi, observer: BroadcastObserver
  beforeEach(() => {
    vi.useFakeTimers()
    api = new BroadcastPreviewApi()
    observer = new BroadcastObserver(api, 'DEMO')
  })
  afterEach(() => {
    observer.stop()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
  const start = async () => {
    observer.start()
    await vi.advanceTimersByTimeAsync(0)
  }
  it.each([1, 2, 3] as const)(
    'observa y cambia una justa con %i integrante(s) por lado sin truncarlos',
    async (teamSize) => {
      api = new BroadcastPreviewApi(teamSize)
      observer = new BroadcastObserver(api, 'DEMO')
      await start()
      expect(observer.getSnapshot().connection).toBe('connected')
      expect(observer.getSnapshot().view?.snapshot?.combatants).toHaveLength(teamSize * 2)
      await observer.select('encounter-02')
      expect(observer.getSnapshot().connection).toBe('connected')
      expect(observer.getSnapshot().view?.snapshot?.matchId).toBe('encounter-02')
      api.advance('encounter-02')
      observer.refresh()
      await vi.advanceTimersByTimeAsync(0)
      expect(observer.getSnapshot().view?.snapshot?.lastAction.type).toBe('basicAttackResolved')
      expect(observer.getSnapshot().view?.snapshot?.combatants.at(-1)?.health?.current).toBe(92)
    },
  )
  it.each([
    'mixto',
    'duplicado',
    'parcial',
    'etiqueta ajena',
    'lado duplicado',
    'asiento duplicado',
    'posición inválida',
    'subtipo inválido',
    'inicio inválido',
  ])('rechaza un roster %s y conserva la vista anterior', async (invalid) => {
    await start()
    const before = structuredClone(observer.getSnapshot().view!)
    const bad = structuredClone(before)
    bad.snapshot = previewSnapshot('encounter-01', 3)
    if (invalid === 'mixto') bad.snapshot.combatants[2]!.teamLabel = 'B'
    if (invalid === 'duplicado')
      bad.snapshot.combatants[5]!.playerId = bad.snapshot.combatants[0]!.playerId
    if (invalid === 'parcial') bad.snapshot.combatants.pop()
    if (invalid === 'etiqueta ajena') bad.snapshot.combatants[5]!.teamLabel = 'C'
    if (invalid === 'lado duplicado') bad.snapshot.teams[1]!.teamLabel = 'A'
    if (invalid === 'asiento duplicado') bad.snapshot.combatants[1]!.seat = 0
    if (invalid === 'posición inválida') bad.snapshot.combatants[1]!.position = 99
    if (invalid === 'subtipo inválido') bad.snapshot.combatants[1]!.heroSubtype = {} as string
    if (invalid === 'inicio inválido') bad.snapshot.startedAt = 'sin fecha'
    vi.spyOn(api, 'observe').mockResolvedValueOnce(bad)
    observer.refresh()
    await vi.advanceTimersByTimeAsync(0)
    expect(observer.getSnapshot().view).toEqual(before)
    expect(observer.getSnapshot().connection).toBe('disconnected')
    expect(observer.getSnapshot().error).toContain('vista completa y coherente')
  })
  it('un poll de E1 que llega después de seleccionar E2 no cambia equipos, turno ni resultado', async () => {
    await start()
    const old = await api.observe()
    const late = deferred<BroadcastObservation>()
    vi.spyOn(api, 'observe').mockImplementationOnce(() => late.promise)
    await vi.advanceTimersByTimeAsync(1000)
    await observer.select('encounter-02')
    expect(observer.getSnapshot().view?.snapshot?.matchId).toBe('encounter-02')
    late.resolve(old)
    await vi.advanceTimersByTimeAsync(0)
    expect(observer.getSnapshot().view?.snapshot?.teams[0]?.name).toBe('Aurora')
    expect(observer.getSnapshot().view?.snapshot?.result).toBeNull()
    expect(observer.getSnapshot().view?.state.selectedMatchId).toBe('encounter-02')
  })
  it('una selección rechazada conserva toda la vista previa y permite reintentar', async () => {
    await start()
    const before = observer.getSnapshot().view
    const select = vi
      .spyOn(api, 'select')
      .mockRejectedValueOnce(new HttpError(409, 'Justa finalizada.', null))
    await observer.select('encounter-02')
    expect(observer.getSnapshot().view).toEqual(before)
    expect(observer.getSnapshot().error).toBe('Justa finalizada.')
    await observer.select('encounter-02')
    expect(select).toHaveBeenCalledTimes(2)
    expect(observer.getSnapshot().view?.snapshot?.matchId).toBe('encounter-02')
  })
  it('marca la vista como desconectada, deja avanzar al servidor y recupera el estado vigente', async () => {
    await start()
    api.disconnected = true
    await vi.advanceTimersByTimeAsync(1000)
    expect(observer.getSnapshot().connection).toBe('disconnected')
    api.advance('encounter-01')
    api.advance('encounter-01')
    api.disconnected = false
    observer.refresh()
    await vi.advanceTimersByTimeAsync(0)
    expect(observer.getSnapshot().connection).toBe('connected')
    expect(observer.getSnapshot().view?.snapshot?.turnsCompleted).toBe(2)
    expect(observer.getSnapshot().view?.snapshot?.seq).toBe(3)
  })
  it('un silencio prolongado no deja el estado congelado marcado como conectado', async () => {
    await start()
    const pending = deferred<BroadcastObservation>()
    vi.spyOn(api, 'observe').mockImplementationOnce(() => pending.promise)
    await vi.advanceTimersByTimeAsync(4000)
    expect(observer.getSnapshot().connection).toBe('disconnected')
    api.advance('encounter-01')
    pending.resolve(await api.observe())
    await vi.advanceTimersByTimeAsync(0)
    expect(observer.getSnapshot().connection).toBe('connected')
  })
  it('revocar el permiso borra la captura y detiene reintentos', async () => {
    await start()
    api.revoked = true
    const poll = vi.spyOn(api, 'observe')
    await vi.advanceTimersByTimeAsync(1000)
    expect(observer.getSnapshot().connection).toBe('forbidden')
    expect(observer.getSnapshot().view).toBeNull()
    await vi.advanceTimersByTimeAsync(10000)
    expect(poll).toHaveBeenCalledTimes(1)
  })
  it.each([401, 403])(
    'un %i limpia la captura incluso después de eventos offline/online',
    async (status) => {
      await start()
      const poll = vi
        .spyOn(api, 'observe')
        .mockRejectedValue(new HttpError(status, 'Acceso revocado', null))
      await vi.advanceTimersByTimeAsync(1000)
      expect(observer.getSnapshot().view).toBeNull()
      observer.setOnline(false)
      observer.setOnline(true)
      observer.refresh()
      await vi.advanceTimersByTimeAsync(10000)
      expect(observer.getSnapshot().connection).toBe('forbidden')
      expect(poll).toHaveBeenCalledTimes(1)
    },
  )
  it('aborta a seis segundos, no solapa el poll y recupera la selección oficial', async () => {
    await start()
    let signal: AbortSignal | null = null
    const poll = vi
      .spyOn(api as BroadcastApi, 'observe')
      .mockImplementationOnce((_id, incoming) => {
        signal = incoming
        return new Promise((_resolve, reject) => {
          incoming.addEventListener(
            'abort',
            () => {
              reject(new DOMException('Timeout', 'AbortError'))
            },
            { once: true },
          )
        })
      })
    await vi.advanceTimersByTimeAsync(6500)
    expect(poll).toHaveBeenCalledTimes(1)
    expect(observer.getSnapshot().connection).toBe('disconnected')
    await vi.advanceTimersByTimeAsync(500)
    expect(signal!.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    expect(poll).toHaveBeenCalledTimes(2)
    expect(observer.getSnapshot().connection).toBe('connected')
  })
  it('desmontar descarta respuestas pendientes; se rechazan snapshots ajenos o con secuencia anterior', async () => {
    await start()
    api.advance('encounter-01')
    observer.refresh()
    await vi.advanceTimersByTimeAsync(0)
    const before = structuredClone(observer.getSnapshot().view!)
    const bad = structuredClone(before)
    bad.snapshot!.seq = 0
    vi.spyOn(api, 'observe').mockResolvedValueOnce(bad)
    observer.refresh()
    await vi.advanceTimersByTimeAsync(0)
    expect(observer.getSnapshot().view).toEqual(before)
    expect(observer.getSnapshot().connection).toBe('disconnected')
    const late = deferred<BroadcastObservation>()
    vi.spyOn(api, 'observe').mockImplementationOnce(() => late.promise)
    observer.refresh()
    observer.stop()
    late.resolve(await api.observe())
    await vi.advanceTimersByTimeAsync(0)
    expect(observer.getSnapshot().view).toEqual(before)
  })
  it('respuesta de selección perdida se resuelve leyendo la selección canónica del servidor', async () => {
    await start()
    const select = api.select.bind(api)
    vi.spyOn(api, 'select').mockImplementationOnce(async (...args) => {
      await select(...args)
      throw new Error('Respuesta perdida')
    })
    await observer.select('encounter-02')
    expect(observer.getSnapshot().connection).toBe('disconnected')
    await vi.advanceTimersByTimeAsync(1000)
    expect(observer.getSnapshot().view?.state.selectedMatchId).toBe('encounter-02')
    expect(observer.getSnapshot().connection).toBe('connected')
  })
  it('offline invalida la consulta pendiente y online obtiene una instantánea nueva', async () => {
    await start()
    observer.setOnline(false)
    api.advance('encounter-01')
    await vi.advanceTimersByTimeAsync(3000)
    expect(observer.getSnapshot().connection).toBe('disconnected')
    observer.setOnline(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(observer.getSnapshot().view?.snapshot?.seq).toBe(2)
  })
  it('una selección sin respuesta vence y permite recuperar la vista en lugar de bloquearla', async () => {
    await start()
    vi.spyOn(api, 'select').mockImplementationOnce(
      (_id, _matchId, _revision, signal?: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener(
            'abort',
            () => {
              reject(new DOMException('Timeout', 'AbortError'))
            },
            { once: true },
          )
        }),
    )
    const selection = observer.select('encounter-02')
    await vi.advanceTimersByTimeAsync(6000)
    await selection
    expect(observer.getSnapshot().switching).toBeNull()
    expect(observer.getSnapshot().connection).toBe('disconnected')
    observer.refresh()
    await vi.advanceTimersByTimeAsync(0)
    expect(observer.getSnapshot().connection).toBe('connected')
  })
})
