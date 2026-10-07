import { HttpError } from '@/lib/http'
import type { BroadcastApi, BroadcastObservation } from './api'
export interface ObserverState {
  view: BroadcastObservation | null
  connection: 'connecting' | 'connected' | 'disconnected' | 'forbidden'
  switching: string | null
  error: string | null
}
/** One capture surface; discard any response from an earlier request generation. */
export class BroadcastObserver {
  private state: ObserverState = {
    view: null,
    connection: 'connecting',
    switching: null,
    error: null,
  }
  private readonly listeners = new Set<() => void>()
  private generation = 0
  private running = false
  private online = true
  private timer: ReturnType<typeof setTimeout> | undefined
  private watchdog: ReturnType<typeof setInterval> | undefined
  private request: AbortController | undefined
  private receivedAt = 0
  private readonly api: BroadcastApi
  private readonly id: string
  private readonly interval: number
  private readonly subject: string | undefined
  constructor(api: BroadcastApi, id: string, interval = 1000, subject?: string) {
    this.api = api
    this.id = id
    this.interval = interval
    this.subject = subject
  }
  getSnapshot = (): ObserverState => this.state
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  private update(patch: Partial<ObserverState>): void {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => {
      listener()
    })
  }
  start(): void {
    if (this.running || this.state.connection === 'forbidden') return
    this.running = true
    this.receivedAt = Date.now()
    this.generation++
    this.watchdog = setInterval(() => {
      if (
        ['connected', 'connecting'].includes(this.state.connection) &&
        Date.now() - this.receivedAt > 3500
      )
        this.update({ connection: 'disconnected' })
    }, 500)
    void this.poll()
  }
  stop(): void {
    this.running = false
    this.generation++
    clearTimeout(this.timer)
    clearInterval(this.watchdog)
    this.request?.abort()
  }
  setOnline(online: boolean): void {
    if (this.state.connection === 'forbidden') return
    this.online = online
    this.generation++
    clearTimeout(this.timer)
    this.request?.abort()
    if (!online) this.update({ connection: 'disconnected', switching: null })
    else if (this.running) {
      this.update({ connection: 'connecting', switching: null })
      void this.poll()
    }
  }
  refresh(): void {
    if (
      !this.running ||
      !this.online ||
      this.state.switching !== null ||
      this.state.connection === 'forbidden'
    )
      return
    this.generation++
    clearTimeout(this.timer)
    this.request?.abort()
    void this.poll()
  }
  private accept(view: BroadcastObservation): void {
    const s = view.snapshot
    if (this.subject !== undefined && view.state.broadcasterId !== this.subject)
      throw new HttpError(403, 'La designación fue revocada.', null)
    if (
      view.state.tournamentId !== this.id ||
      (view.state.selectedMatchId !== null && s === null) ||
      (s !== null && (s.tournamentId !== this.id || s.matchId !== view.state.selectedMatchId))
    )
      throw new Error('Se rechazó una respuesta que no corresponde a la justa seleccionada.')
    if (
      s !== null &&
      (!s.combatRoomId ||
        !s.bracketLabel ||
        s.encounterId !== s.matchId ||
        !['IN_PROGRESS', 'FINISHED'].includes(s.status) ||
        !Number.isSafeInteger(s.seq) ||
        s.seq < 0 ||
        s.teams.length !== 2 ||
        s.combatants.length !== 4 ||
        new Set(s.combatants.map((p) => p.playerId)).size !== 4 ||
        !s.combatants.some((p) => p.playerId === s.currentPlayerId) ||
        s.combatants.some((p) => !s.teams.some((t) => t.teamLabel === p.teamLabel)))
    )
      throw new Error('El servicio todavía no ofrece una vista completa y coherente de esta justa.')
    const previous = this.state.view
    if (
      previous !== null &&
      (view.state.revision < previous.state.revision ||
        (view.state.revision === previous.state.revision &&
          view.state.selectedMatchId !== previous.state.selectedMatchId) ||
        (previous.snapshot !== null &&
          s !== null &&
          previous.snapshot.matchId === s.matchId &&
          (s.combatRoomId !== previous.snapshot.combatRoomId ||
            s.seq < previous.snapshot.seq ||
            (previous.snapshot.status === 'FINISHED' && s.status !== 'FINISHED'))))
    )
      throw new Error('Se recibió un estado anterior. Recuperando el estado vigente.')
    this.receivedAt = Date.now()
    this.update({ view, connection: 'connected', error: null })
  }
  private fail(error: unknown, selecting = false): void {
    if (error instanceof HttpError && [401, 403].includes(error.status)) {
      this.revoke()
      return
    }
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'No se pudo recuperar el estado a tiempo. Se conserva la última vista.'
        : error instanceof Error
          ? error.message
          : 'No se pudo recuperar el combate.'
    // A rejected destination keeps the previous selection and its complete snapshot.
    this.update({
      error: message,
      ...(!selecting || !(error instanceof HttpError) || error.status >= 500
        ? { connection: 'disconnected' as const }
        : {}),
    })
  }
  revoke(): void {
    this.stop()
    this.update({
      view: null,
      switching: null,
      connection: 'forbidden',
      error: 'Tu sesión o designación ya no permite observar este torneo.',
    })
  }
  private schedule(): void {
    if (this.running && this.online && this.state.connection !== 'forbidden')
      this.timer = setTimeout(() => void this.poll(), this.interval)
  }
  private async poll(): Promise<void> {
    if (
      !this.running ||
      !this.online ||
      this.state.switching !== null ||
      this.state.connection === 'forbidden'
    )
      return
    const generation = this.generation
    const controller = new AbortController()
    this.request = controller
    const timeout = setTimeout(() => {
      controller.abort()
    }, 6000)
    try {
      const view = await this.api.observe(this.id, controller.signal)
      if (this.isCurrent(generation)) this.accept(view)
    } catch (error: unknown) {
      if (this.isCurrent(generation)) this.fail(error)
    } finally {
      clearTimeout(timeout)
      if (this.isCurrent(generation)) this.schedule()
    }
  }
  private isCurrent(generation: number): boolean {
    return generation === this.generation && this.running
  }
  async select(matchId: string): Promise<void> {
    if (
      !this.running ||
      !this.online ||
      this.state.switching !== null ||
      this.state.view === null ||
      this.state.connection === 'forbidden'
    )
      return
    const generation = ++this.generation
    const revision = this.state.view.state.revision
    clearTimeout(this.timer)
    this.request?.abort()
    this.update({ switching: matchId, error: null })
    const controller = new AbortController()
    this.request = controller
    const timeout = setTimeout(() => {
      controller.abort()
    }, 6000)
    try {
      const view = await this.api.select(this.id, matchId, revision, controller.signal)
      if (this.isCurrent(generation)) this.accept(view)
    } catch (error: unknown) {
      if (this.isCurrent(generation)) this.fail(error, true)
    } finally {
      clearTimeout(timeout)
      if (this.isCurrent(generation)) {
        this.update({ switching: null })
        this.schedule()
      }
    }
  }
}
