import { useTournamentAssets } from '../tournamentAssets'
import { TournamentHeading } from '../TournamentVisuals'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TournamentButton as Button } from '../TournamentVisuals'
import { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'
import type { SpectatorArenaRenderer } from '@/shared/battle/observation'
import { useTournamentRequestScope } from '../requestScope'
import { broadcastApi, type BroadcastApi, type BroadcastSnapshot } from './api'
import { BroadcastObserver } from './BroadcastObserver'

const track = (value: BroadcastSnapshot['track']): string =>
  value === 'MAIN' ? 'Ganadores' : value === 'SECONDARY' ? 'Secundarios' : 'Final'
const actions: Record<string, string> = {
  battleStarted: 'Comienza el combate',
  turnAdvanced: 'Cambio de turno',
  basicAttackResolved: 'Ataque básico',
  skillUsed: 'Habilidad utilizada',
  healSkillUsed: 'Curación',
  directDamageSkillUsed: 'Habilidad de daño',
  turnTimedOut: 'Turno agotado',
  battleFinished: 'Finaliza el combate',
}
export const BroadcastCapture = ({
  id,
  api = broadcastApi,
  arena: Arena,
}: {
  readonly id: string
  readonly api?: BroadcastApi
  readonly arena: SpectatorArenaRenderer
}): React.JSX.Element => {
  const subject = useSession((s) => s.subject)
  const roles = useSession((s) => s.roles)
  const token = useSession((s) => s.accessToken)
  const identity = useMemo(() => ({ subject, token }), [subject, token])
  const admin = roles.some((r) => r === 'ADMINISTRATOR' || r === 'SUPER_ADMINISTRATOR')
  const observer = useMemo(
    () => new BroadcastObserver(api, id, 1000, identity.subject ?? undefined),
    [api, id, identity],
  )
  const state = useSyncExternalStore(observer.subscribe, observer.getSnapshot, observer.getSnapshot)
  const frame = useRef<HTMLElement>(null)
  const [fullscreenError, setFullscreenError] = useState(false)
  const matches = useQuery({
    queryKey: ['tournament-broadcast-active', id, subject],
    queryFn: ({ signal }) => api.active(id, signal),
    enabled:
      subject !== null &&
      state.connection !== 'forbidden' &&
      roles.some((r) => r === 'ADMINISTRATOR' || r === 'SUPER_ADMINISTRATOR'),
    refetchInterval: state.connection === 'forbidden' ? false : 3000,
    retry: false,
  })
  const denied = matches.error instanceof HttpError && [401, 403].includes(matches.error.status)
  useEffect(() => {
    if (denied) observer.revoke()
  }, [denied, observer])
  useEffect(() => {
    if (subject === null || !admin) {
      observer.revoke()
      return
    }
    observer.start()
    const offline = (): void => {
      observer.setOnline(false)
    }
    const online = (): void => {
      observer.setOnline(true)
    }
    if (!navigator.onLine) offline()
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    return () => {
      observer.stop()
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', online)
    }
  }, [observer, subject, admin])
  const view = state.view?.snapshot
  if (subject === null || !roles.some((r) => r === 'ADMINISTRATOR' || r === 'SUPER_ADMINISTRATOR'))
    return <p>No tienes permiso para observar este torneo.</p>
  return (
    <section aria-label="Vista de retransmisión" className="grid gap-4">
      <p className="text-sm text-muted">
        Selecciona la justa que verá el público. Inicia y detén la emisión y el audio del
        presentador desde OBS u otra herramienta externa.
      </p>
      {state.connection === 'forbidden' || denied ? (
        <p role="alert">{state.error}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" aria-label="Justas en curso">
            {matches.data?.matches.map((m) => (
              <Button
                key={m.matchId}
                variant="secondary"
                disabled={
                  state.switching !== null ||
                  state.view === null ||
                  state.connection !== 'connected'
                }
                aria-pressed={state.view?.state.selectedMatchId === m.matchId}
                onClick={() => void observer.select(m.matchId)}
              >
                Mostrar {m.bracketLabel} · {m.teams.map((t) => t.name).join(' vs. ')} ·{' '}
                {track(m.track)}, ronda {String(m.round)}
              </Button>
            ))}
          </div>
          {matches.data?.matches.length === 0 && (
            <p>No hay justas en curso para transmitir. El último resultado permanece visible.</p>
          )}
          {matches.isError && <p role="alert">No se pudo actualizar la lista de justas.</p>}
          {state.switching && (
            <p role="status">
              Cargando la justa seleccionada. La vista conserva la justa anterior hasta confirmar el
              cambio.
            </p>
          )}
          {state.error && <p role="alert">{state.error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                observer.refresh()
              }}
            >
              Recuperar conexión
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const target = frame.current
                if (!target?.requestFullscreen) {
                  setFullscreenError(true)
                  return
                }
                void target.requestFullscreen().catch(() => {
                  setFullscreenError(true)
                })
              }}
            >
              Pantalla completa para captura
            </Button>
          </div>
          {fullscreenError && (
            <p role="status">
              El navegador no permitió pantalla completa. Puedes capturar esta ventana.
            </p>
          )}
          <section
            ref={frame}
            aria-label="Combate capturable"
            className="tournament-broadcast-frame grid gap-2 rounded-xl bg-surface text-ink"
          >
            <p
              role="status"
              className={
                state.connection === 'connected' ? 'text-brand' : 'font-semibold text-danger'
              }
            >
              {state.connection === 'connected'
                ? view
                  ? 'Conectada a Combat'
                  : 'Lista para seleccionar una justa'
                : state.connection === 'connecting'
                  ? 'Conectando con Combat…'
                  : 'Vista desconectada · el estado mostrado puede estar desactualizado'}
            </p>
            {!view ? (
              <p>Selecciona una justa en curso para preparar la captura.</p>
            ) : (
              <>
                <header className="flex flex-wrap items-center justify-between gap-2 px-3">
                  <p className="text-sm text-muted">
                    {view.tournamentName} · {track(view.track)} · Ronda {String(view.round)}
                  </p>
                  <h2 className="font-game-display text-xl">Justa {view.bracketLabel}</h2>
                  <p className="text-sm text-muted">
                    {view.combatants.length / 2}v{view.combatants.length / 2} · Solo lectura
                  </p>
                </header>
                <Arena
                  key={view.combatRoomId}
                  observation={view}
                  connected={state.connection === 'connected'}
                />
                <p>{actions[view.lastAction.type] ?? 'Actualización del combate'}</p>
                {view.result && (
                  <p className="text-2xl font-semibold">
                    {view.result.outcome === 'WIN'
                      ? `Ganador: ${view.teams.find((t) => t.teamLabel === view.result?.winnerTeamLabel)?.name ?? view.result.winnerTeamLabel ?? ''}`
                      : 'Combat finalizó sin ganador.'}
                  </p>
                )}
                <p className="text-xs text-muted">
                  Último estado recibido: {new Date(view.observedAt).toLocaleTimeString('es-CO')} ·
                  Evento {String(view.seq)}
                </p>
              </>
            )}
          </section>
        </>
      )}
    </section>
  )
}

type TournamentBroadcastPanelProps = {
  readonly id: string
  readonly api?: BroadcastApi
} & (
  | { readonly captureOnly: true; readonly arena: SpectatorArenaRenderer }
  | { readonly captureOnly?: false }
)

export const TournamentBroadcastPanel = (
  props: TournamentBroadcastPanelProps,
): React.JSX.Element | null => {
  const { id, api = broadcastApi } = props
  const captureOnly = props.captureOnly ?? false
  const subject = useSession((s) => s.subject)
  const roles = useSession((s) => s.roles)
  const admin = roles.some((r) => r === 'ADMINISTRATOR' || r === 'SUPER_ADMINISTRATOR')
  const client = useQueryClient()
  const isCurrent = useTournamentRequestScope(id)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const config = useQuery({
    queryKey: ['tournament-broadcast-config', id, subject],
    queryFn: ({ signal }) => api.configuration(id, signal),
    enabled: subject !== null && admin,
    refetchInterval: 3000,
    retry: false,
  })
  const designate = async (replace: boolean): Promise<void> => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await api.designate(id, replace ? config.data?.revision : undefined)
      if (!isCurrent()) return
      await client.invalidateQueries({ queryKey: ['tournament-broadcast-config', id, subject] })
    } catch (e: unknown) {
      if (!isCurrent()) return
      setError(e instanceof Error ? e.message : 'No se pudo confirmar la designación.')
      await config.refetch()
    } finally {
      setBusy(false)
    }
  }
  if (subject === null || !admin)
    return captureOnly ? <p>No tienes permiso administrativo para abrir esta vista.</p> : null
  const forbidden = config.error instanceof HttpError && [401, 403].includes(config.error.status)
  const own = !forbidden && config.data?.broadcasterId === subject
  return (
    <section
      aria-label="Transmisión del torneo"
      className="grid gap-4 rounded-xl border border-border p-5"
    >
      <TournamentHeading icon="transmission">Transmisión del torneo</TournamentHeading>
      {config.isPending && <p role="status">Comprobando la designación…</p>}
      {config.isError && (
        <div role="alert">
          <p>No se pudo comprobar el permiso de transmisión.</p>
          <Button variant="secondary" onClick={() => void config.refetch()}>
            Volver a comprobar designación
          </Button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {config.data && !own && !config.isError && (
        <>
          <p>
            {config.data.broadcasterId === null
              ? 'Este torneo todavía no tiene transmisor.'
              : `Transmisor designado: ${config.data.broadcasterId}. Sustituirlo revoca su acceso.`}
          </p>
          <Button
            disabled={busy}
            onClick={() => void designate(config.data.broadcasterId !== null)}
          >
            {config.data.broadcasterId === null
              ? 'Designarme transmisor'
              : 'Sustituir al transmisor y asumir la emisión'}
          </Button>
        </>
      )}
      {own && (
        <>
          {!props.captureOnly ? (
            <Link
              to={`/tournament/${encodeURIComponent(id)}/broadcast`}
              className="text-brand underline"
            >
              Abrir vista capturable en esta ventana
            </Link>
          ) : (
            <BroadcastCapture key={`${id}:${subject}`} id={id} api={api} arena={props.arena} />
          )}
        </>
      )}
    </section>
  )
}
export const TournamentBroadcastPage = ({
  arena,
}: {
  readonly arena: SpectatorArenaRenderer
}): React.JSX.Element => {
  const { id = '' } = useParams()
  return (
    <main
      style={useTournamentAssets()}
      className="tournament-skin min-h-dvh bg-surface p-4 text-ink sm:p-8"
    >
      <Link to="/tournament" className="mb-4 inline-block text-brand underline">
        Volver al torneo
      </Link>
      <TournamentBroadcastPanel key={id} id={id} captureOnly arena={arena} />
    </main>
  )
}
