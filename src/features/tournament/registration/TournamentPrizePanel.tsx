import { TournamentHeading } from '../TournamentVisuals'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TournamentButton as Button } from '../TournamentVisuals'
import { TournamentCard as Card } from '../TournamentVisuals'
import { TextField } from '@/components/ui/form/TextField'
import { useSession } from '@/shared/session'
import { HttpError } from '@/lib/http'
import { invalidateWallet } from '@/shared/wallet'
import { useTournamentRequestScope } from '../requestScope'
import { readIntent } from './operationIntents'
import { useOperation } from './useOperation'
import { prizeApi, type PrizeApi, type PrizeView } from './prizeApi'
const statusLabel = {
  PENDING: 'Premio pendiente',
  PARTIAL: 'Premio parcialmente entregado',
  COMPLETED: 'Premio completado',
} as const

const restoredDraft = (scope: string): { credits: string[]; epics: string[] } => {
  try {
    const allocations: unknown = JSON.parse(readIntent(scope)?.fingerprint ?? 'null')
    if (Array.isArray(allocations) && allocations.length === 2) {
      const entries = allocations as { credits?: unknown; epicProductId?: unknown }[]
      return {
        credits: entries.map((a) => (typeof a.credits === 'string' ? a.credits : '')),
        epics: entries.map((a) => (typeof a.epicProductId === 'string' ? a.epicProductId : '')),
      }
    }
  } catch {
    /* A damaged draft never becomes an approval. */
  }
  return { credits: ['', ''], epics: ['', ''] }
}
const requiresReview = (code: string | null): boolean =>
  code === 'PRIZE_DESTINATION_CONFLICT' || code === 'PRIZE_RECEIPT_CONFLICT'

const PrizeContent = ({
  id,
  api,
  subject,
  roles,
  canConfigure,
}: {
  readonly id: string
  readonly api: PrizeApi
  readonly subject: string
  readonly roles: readonly string[]
  readonly canConfigure: boolean
}): React.JSX.Element => {
  const admin = roles.some((r) => r === 'ADMINISTRATOR' || r === 'SUPER_ADMINISTRATOR')
  const client = useQueryClient()
  const isCurrent = useTournamentRequestScope(id)
  const key = ['tournament-prize', subject, id]
  const view = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.view(id, signal),
    retry: false,
    refetchInterval: (q) => (q.state.data?.delivery?.status === 'COMPLETED' ? false : 5000),
  })
  const scope = JSON.stringify([subject, id, 'prize-configuration'])
  const [credits, setCredits] = useState(() => restoredDraft(scope).credits)
  const [epics, setEpics] = useState(() => restoredDraft(scope).epics)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const busyRef = useRef(false)
  const denied = view.error instanceof HttpError && [401, 403].includes(view.error.status)
  const snapshot = denied ? undefined : view.data
  const operation = useOperation(scope, () => snapshot?.configuration != null)
  const approvalState = JSON.stringify([subject, id])
  const locked = operation.busy || busy || operation.intent?.phase === 'UNCERTAIN'
  const receipts = useRef(new Set<string>())
  useEffect(() => {
    for (const line of snapshot?.delivery?.lines ?? []) {
      if (
        line.playerId !== subject ||
        line.status !== 'DELIVERED' ||
        !line.receiptId?.trim() ||
        receipts.current.has(line.receiptId)
      )
        continue
      receipts.current.add(line.receiptId)
      if (line.kind === 'CREDITS') invalidateWallet(client)
      else void client.invalidateQueries({ queryKey: ['inventory', 'me'] })
    }
  }, [snapshot, subject, client])
  const run = async (action: () => Promise<PrizeView>): Promise<void> => {
    if (busyRef.current || view.isError) return
    busyRef.current = true
    setBusy(true)
    setNotice(null)
    try {
      const data = await action()
      if (!isCurrent()) return
      client.setQueryData(key, data)
    } catch (error: unknown) {
      if (!isCurrent()) return
      setNotice(
        error instanceof Error
          ? error.message
          : 'No se pudo confirmar el premio. Puedes reintentar.',
      )
      await view.refetch()
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  const approve = async (): Promise<void> => {
    if (view.isError || !canConfigure || !admin) return
    const allocations = ([0, 1] as const).map((memberIndex) => {
      const productId = epics[memberIndex]?.trim() ?? ''
      return {
        memberIndex,
        credits: credits[memberIndex] ?? '',
        epicProductId: productId === '' ? null : productId,
      }
    })
    const result = await operation.run(JSON.stringify(allocations), approvalState, (operationId) =>
      api.approve(id, { operationId, allocations }),
    )
    if (!isCurrent()) return
    if (result !== null) client.setQueryData(key, result)
    else await view.refetch()
  }
  return (
    <Card>
      <section id="tournament-prize" aria-label="Premio del torneo" className="grid gap-4">
        <TournamentHeading icon="prize">Premio del torneo</TournamentHeading>
        {view.isPending && <p role="status">Consultando premio…</p>}
        {view.isError && (
          <div role="alert">
            <p>No se pudo consultar el premio.</p>
            <Button variant="secondary" onClick={() => void view.refetch()}>
              Volver a consultar premio
            </Button>
          </div>
        )}
        {snapshot && (
          <>
            <p>
              {snapshot.champion
                ? `Campeón confirmado · ${snapshot.champion.teamName ?? snapshot.champion.teamId}`
                : 'El premio se entregará cuando la final confirme un campeón.'}
            </p>
            {snapshot.configuration ? (
              <>
                <p className="font-semibold">Premio aprobado</p>
                <ul className="grid gap-2">
                  {snapshot.configuration.allocations.map((a) => (
                    <li key={a.memberIndex}>
                      Integrante {String(a.memberIndex + 1)} · {a.credits} créditos ·{' '}
                      {a.epicProductId ? `épica ${a.epicProductId}` : 'sin épica'}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p>
                  No hay premio aprobado.
                  {admin
                    ? ' Define los créditos de ambos integrantes y quién recibirá la épica según la política acordada.'
                    : ''}
                </p>
                {admin && canConfigure && !view.isError && (
                  <form
                    className="grid gap-4"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void approve()
                    }}
                  >
                    <p className="text-sm text-muted">
                      Los integrantes conservan el orden de inscripción del equipo campeón. Aprobar
                      fija este reparto antes de la entrega.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[0, 1].map((index) => (
                        <fieldset key={index} className="grid gap-3">
                          <legend className="mb-2 font-semibold">
                            Integrante {String(index + 1)}
                          </legend>
                          <TextField
                            label={`Créditos del integrante ${String(index + 1)}`}
                            inputMode="numeric"
                            pattern="[1-9][0-9]*"
                            required
                            disabled={locked}
                            value={credits[index] ?? ''}
                            onChange={(e) => {
                              setCredits((c) => c.map((v, n) => (n === index ? e.target.value : v)))
                            }}
                          />
                          <TextField
                            label={`Código de épica del integrante ${String(index + 1)}`}
                            hint="Vacío si este integrante no recibe épica."
                            disabled={locked}
                            value={epics[index] ?? ''}
                            onChange={(e) => {
                              setEpics((c) => c.map((v, n) => (n === index ? e.target.value : v)))
                            }}
                          />
                        </fieldset>
                      ))}
                    </div>
                    <Button
                      type="submit"
                      loading={operation.busy}
                      disabled={operation.busy || busy || !epics.some((v) => v.trim() !== '')}
                    >
                      Aprobar premio
                    </Button>
                  </form>
                )}
                {admin && !canConfigure && (
                  <p>La configuración del premio estará disponible al publicar las llaves.</p>
                )}
                {operation.intent?.phase === 'UNCERTAIN' && (
                  <p role="status">
                    La aprobación está pendiente de comprobar. Reintenta el mismo reparto; los
                    campos se conservan.
                  </p>
                )}
                {operation.intent?.phase === 'REJECTED' && (
                  <Button variant="secondary" onClick={operation.resetRejected}>
                    Corregir configuración rechazada
                  </Button>
                )}
              </>
            )}
            {snapshot.delivery ? (
              <>
                <p role="status" className="font-semibold">
                  {statusLabel[snapshot.delivery.status]}
                </p>
                <ul className="grid gap-3">
                  {snapshot.delivery.lines.map((line) => (
                    <li
                      key={line.operationId}
                      className="rounded-lg border border-border p-3 text-sm"
                    >
                      <p>
                        Jugador {line.playerId} · Héroe {line.heroId}
                      </p>
                      <p>
                        {line.kind === 'CREDITS'
                          ? `${line.amount ?? ''} créditos`
                          : `Épica ${line.productId ?? ''}`}{' '}
                        · {line.status === 'DELIVERED' ? 'Entregado' : 'Pendiente'}
                      </p>
                      {line.receiptId && (
                        <p className="break-all text-muted">Comprobante: {line.receiptId}</p>
                      )}
                      {line.lastError && line.status === 'PENDING' && (
                        <p>
                          {requiresReview(line.lastError)
                            ? 'Esta entrega requiere revisión administrativa antes de continuar.'
                            : 'Entrega sin confirmar. Se reintentará con el mismo derecho de premio.'}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              snapshot.champion && snapshot.configuration && <p>Premio listo para entregar.</p>
            )}
            {admin &&
              !view.isError &&
              snapshot.configuration &&
              snapshot.champion &&
              snapshot.delivery?.status !== 'COMPLETED' &&
              (snapshot.delivery === null ||
                snapshot.delivery.lines.some(
                  (line) => line.status === 'PENDING' && !requiresReview(line.lastError),
                )) && (
                <Button
                  loading={busy}
                  disabled={busy}
                  onClick={() => void run(() => api.deliver(id))}
                >
                  {snapshot.delivery ? 'Reintentar pendientes' : 'Entregar premio'}
                </Button>
              )}
          </>
        )}
        {notice && <p role="alert">{notice}</p>}
        {operation.error?.state === approvalState && <p role="alert">{operation.error.message}</p>}
      </section>
    </Card>
  )
}

export const TournamentPrizePanel = ({
  id,
  api = prizeApi,
  identity,
  canConfigure = true,
}: {
  readonly id: string
  readonly api?: PrizeApi
  readonly identity?: { readonly subject: string; readonly roles: readonly string[] }
  readonly canConfigure?: boolean
}): React.JSX.Element => {
  const sessionSubject = useSession((s) => s.subject)
  const sessionRoles = useSession((s) => s.roles)
  const subject = identity?.subject ?? sessionSubject
  const roles = identity?.roles ?? sessionRoles
  if (subject === null) return <p>Inicia sesión para consultar el premio.</p>
  return (
    <PrizeContent
      key={JSON.stringify([id, subject])}
      id={id}
      api={api}
      subject={subject}
      roles={roles}
      canConfigure={canConfigure}
    />
  )
}
