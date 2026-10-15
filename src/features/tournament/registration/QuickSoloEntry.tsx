import { useRef, useState } from 'react'
import { Check, Swords, Ticket } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { TextField } from '@/components/ui/form/TextField'
import { avatarPathForSubject } from '@/shared/avatar'
import { TournamentButton as Button, TournamentCard as Card } from '../TournamentVisuals'
import { tournamentHumanName } from '../tournamentHeroIdentity'
import { useTournamentRequestScope } from '../requestScope'
import type { EntryTeam, RegistrationApi } from './api'
import { useOperation } from './useOperation'

/** Only free 1v1 entries: two durable server operations behind one personal action. */
export const QuickSoloEntry = ({
  subject,
  id,
  displayName,
  team,
  generation,
  contractVersion,
  api,
  open,
  available,
  canMutate,
  bracketPublished,
  onResult,
  onBracket,
}: {
  readonly subject: string
  readonly id: string
  readonly displayName: string | null
  readonly team: EntryTeam | undefined
  readonly generation: string
  readonly contractVersion: string
  readonly api: RegistrationApi
  readonly open: boolean
  readonly available: number
  readonly canMutate: boolean
  readonly bracketPublished: boolean
  readonly onResult: (team: EntryTeam) => Promise<void>
  readonly onBracket: () => void
}) => {
  const scope = JSON.stringify([subject, id, 'solo-free', contractVersion, generation])
  const isCurrent = useTournamentRequestScope(scope)
  const registration = useOperation(
    JSON.stringify([subject, id, 'register', contractVersion, 'SOLO', generation]),
  )
  const entry = useOperation(scope, () => team?.status === 'CONFIRMED')
  const draft = (() => {
    try {
      const value: unknown = JSON.parse(registration.intent?.fingerprint ?? 'null')
      return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : null
    } catch {
      return null
    }
  })()
  const [name, setName] = useState(
    draft ?? team?.name ?? tournamentHumanName(displayName)?.slice(0, 32) ?? '',
  )
  const [editingName, setEditingName] = useState(() => name.trim().length < 3)
  const [localTeam, setLocalTeam] = useState<EntryTeam | null>(null)
  const [working, setWorking] = useState(false)
  const busy = useRef(false)
  const active = team?.status === 'CONFIRMED' ? team : (localTeam ?? team)
  const confirmed = active?.status === 'CONFIRMED' && active.entryReceipt !== null
  const nameValid = name.trim().length >= 3 && name.trim().length <= 32
  const locked =
    working || registration.intent !== null || entry.intent !== null || active !== undefined
  const pending = registration.intent?.phase === 'UNCERTAIN' || entry.intent?.phase === 'UNCERTAIN'
  const rejected = registration.intent?.phase === 'REJECTED' || entry.intent?.phase === 'REJECTED'
  const canStart = open && available > 0
  const submit = async (): Promise<void> => {
    if (busy.current || !canMutate || rejected || (!active && !pending && !canStart)) return
    busy.current = true
    setWorking(true)
    try {
      const registered =
        active ??
        (await registration.run(
          JSON.stringify([name.trim().replace(/\s+/gu, ' '), '', '', 'self']),
          name,
          (operationId) =>
            api.register(id, {
              operationId,
              name: name.trim(),
              invitedMemberIds: [],
              avatar: { kind: 'ACCOUNT_AVATAR', subject },
            }),
        ))
      if (!registered || !isCurrent()) return
      setLocalTeam(registered)
      if (
        registered.status !== 'PENDING_PAYMENT' &&
        registered.status !== 'PAYMENT_PENDING' &&
        registered.status !== 'COMPENSATING'
      ) {
        await onResult(registered)
        return
      }
      const entered = await entry.run(
        registered.id,
        registered.id,
        (operationId) => api.enter(id, registered.id, { operationId }),
        (result) => result.status === 'PAYMENT_PENDING' || result.status === 'COMPENSATING',
      )
      if (!isCurrent()) return
      if (entered) setLocalTeam(entered)
      await onResult(entered ?? registered)
    } finally {
      busy.current = false
      if (isCurrent()) setWorking(false)
    }
  }
  return (
    <Card className="tournament-quick-entry">
      <div className="tournament-entry-art" aria-hidden="true">
        <span>{confirmed ? <Check size={36} /> : <Swords size={36} />}</span>
      </div>
      <div className="tournament-entry-content">
        <span className="tournament-entry-kicker">
          {confirmed ? 'INSCRIPCIÓN CONFIRMADA' : 'TU LUGAR EN LA ARENA'}
        </span>
        <h2>{confirmed ? '¡Ya estás dentro!' : 'Entra al torneo'}</h2>
        <p className="tournament-entry-intro">
          {confirmed
            ? bracketPublished
              ? 'Tus llaves están listas. Consulta tu próximo encuentro.'
              : 'Espera las llaves. Tu próxima batalla aparecerá aquí.'
            : 'Juega con tu cuenta y demuestra de qué estás hecho.'}
        </p>
        <form
          aria-label="Inscripción individual gratuita"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className="tournament-entry-identity">
            <Avatar
              avatarUrl={avatarPathForSubject(subject)}
              alt="Tu avatar"
              initials={(name.trim()[0] ?? '?').toUpperCase()}
              size="lg"
            />
            <div>
              <small>TÚ</small>
              <strong>{active?.name ?? (name.trim() || 'Elige tu nombre')}</strong>
            </div>
            <span className="tournament-entry-badge">
              <Ticket size={16} aria-hidden="true" />
              {confirmed ? `Cupo ${String(active.entryReceipt.slot)}` : 'Gratis'}
            </span>
          </div>
          {!active && (
            <details
              className="tournament-entry-edit"
              open={editingName}
              onToggle={(event) => {
                setEditingName(event.currentTarget.open)
              }}
            >
              <summary>Cambiar nombre</summary>
              <TextField
                label="Nombre de tu participación"
                value={name}
                minLength={3}
                maxLength={32}
                required
                disabled={locked || !canMutate}
                onChange={(event) => {
                  setName(event.target.value)
                }}
              />
            </details>
          )}
          {confirmed ? (
            <Button className="tournament-simple-primary" onClick={onBracket}>
              Ver llaves
            </Button>
          ) : (
            <>
              {registration.error && <p role="alert">{registration.error.message}</p>}
              {entry.error && <p role="alert">{entry.error.message}</p>}
              {pending && !working && (
                <p role="status">Estamos comprobando tu cupo. Reintenta sin crear otro registro.</p>
              )}
              {rejected && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    registration.resetRejected()
                    entry.resetRejected()
                  }}
                >
                  Corregir inscripción
                </Button>
              )}
              {!canStart && !pending && (
                <p role="status">
                  {!open ? 'La inscripción está cerrada.' : 'No hay cupos disponibles.'}
                </p>
              )}
              <Button
                className="tournament-simple-primary"
                type="submit"
                loading={working}
                disabled={!canMutate || rejected || !nameValid || (!canStart && !pending)}
              >
                {pending
                  ? 'Comprobar inscripción'
                  : active
                    ? 'Completar inscripción gratis'
                    : 'Inscribirme gratis'}
              </Button>
              <p className="tournament-entry-footnote">
                Sin cobro. Aceptas tu participación; confirmarás cada batalla después.
              </p>
            </>
          )}
        </form>
        {confirmed && (
          <details className="tournament-simple-options">
            <summary>Ver comprobantes</summary>
            <p>Inscripción: {active.registrationReceipt.id}</p>
            <p>Cupo: {active.entryReceipt.id}</p>
          </details>
        )}
      </div>
    </Card>
  )
}
