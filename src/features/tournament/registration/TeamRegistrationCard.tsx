import { useState } from 'react'
import { TournamentButton as Button } from '../TournamentVisuals'
import { TournamentCard as Card } from '../TournamentVisuals'
import { tournamentHumanName } from '../tournamentHeroIdentity'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import type { EntryPolicy, EntryTeam, RegistrationApi, SimulatedCard } from './api'
import { TeamAvatar, type AvatarDownload } from './TeamAvatar'
import { dateLabel, priceLabel, teamStatus } from './presentation'
import { useOperation } from './useOperation'
import { membersOf } from './modalities'

const emptyCard: SimulatedCard = { holder: '', number: '', expiry: '', securityCode: '' }
export const TeamRegistrationCard = ({
  subject,
  id,
  team,
  policy,
  open,
  available,
  api,
  onResult,
  canMutate,
  avatarDownload,
  displayName,
}: {
  readonly subject: string
  readonly id: string
  readonly team: EntryTeam
  readonly policy: EntryPolicy
  readonly open: boolean
  readonly available: number
  readonly api: RegistrationApi
  readonly onResult: (team: EntryTeam) => Promise<void>
  readonly canMutate: boolean
  readonly avatarDownload?: AvatarDownload | undefined
  readonly displayName?: string | null
}): React.JSX.Element => {
  const members = membersOf(team)
  const self = members.find((member) => member.subject === subject)
  const operation = useOperation(
    JSON.stringify([subject, id, 'team', team.id, members.length, 'members-v3']),
    (intent) =>
      (intent.fingerprint.startsWith('entry:') && team.status === 'CONFIRMED') ||
      (intent.fingerprint === 'accept' && self?.consentAt != null) ||
      (['reject', 'cancel'].includes(intent.fingerprint) && team.status === 'CANCELLED'),
  )
  const [method, setMethod] = useState(() =>
    operation.intent?.fingerprint.startsWith('entry:')
      ? operation.intent.fingerprint.slice(6)
      : !policy.free && policy.methods.length === 1
        ? (policy.methods[0]?.method ?? '')
        : '',
  )
  const [card, setCard] = useState<SimulatedCard>(emptyCard)
  const owner = subject === team.ownerId
  const state = JSON.stringify([team.status, team.failure, team.entryReceipt?.id, open, members])
  const receipt = team.entryReceipt
  const paidMethod = !policy.free ? policy.methods.find((m) => m.method === method) : undefined
  const fingerprint = policy.free ? 'entry:FREE' : `entry:${method}`
  const entryIntent = operation.intent?.fingerprint.startsWith('entry:') === true
  const pending = team.status === 'PAYMENT_PENDING' || team.status === 'COMPENSATING'
  const run = async (action: 'accept' | 'reject' | 'cancel' | 'entry'): Promise<void> => {
    if (self === undefined || (action === 'entry' && !owner)) return
    const result = await operation.run(
      action === 'entry' ? fingerprint : action,
      state,
      (operationId) =>
        action === 'entry'
          ? api.enter(id, team.id, {
              operationId,
              ...(paidMethod === undefined ? {} : { method: paidMethod.method }),
              ...(paidMethod?.method === 'SIMULATED_MONEY' &&
              [card.holder, card.number, card.expiry, card.securityCode].every(
                (value) => value.trim() !== '',
              )
                ? { card }
                : {}),
            })
          : action === 'cancel'
            ? api.cancel(id, team.id, operationId)
            : api.consent(id, team.id, operationId, action === 'accept'),
      (value) => value.status === 'PAYMENT_PENDING' || value.status === 'COMPENSATING',
    )
    setCard(emptyCard)
    if (result !== null) {
      await onResult(result)
    }
  }
  const locked = operation.intent !== null || operation.busy
  return (
    <Card>
      <div className="flex flex-wrap items-start gap-4">
        <TeamAvatar
          subject={subject}
          avatarSubject={team.avatar.subject}
          {...(avatarDownload ? { download: avatarDownload } : {})}
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-game-display text-xl text-ink">{team.name}</h2>
          <p className="mt-2 font-semibold" role="status">
            {team.status === 'AWAITING_CONSENT' && members.length === 2
              ? 'Esperando aceptación del compañero'
              : teamStatus[team.status]}
          </p>
        </div>
      </div>
      <ul
        className="tournament-team-members"
        aria-label="Integrantes y consentimiento de inscripción"
      >
        {members.map((member, index) => (
          <li key={member.subject}>
            <TeamAvatar
              subject={subject}
              avatarSubject={member.subject}
              {...(avatarDownload ? { download: avatarDownload } : {})}
            />
            <div>
              <p className="font-semibold">
                {member.subject === subject
                  ? (tournamentHumanName(displayName) ?? 'Tu cuenta')
                  : (tournamentHumanName(member.displayName) ??
                    (members.length === 2
                      ? 'Nombre del compañero pendiente'
                      : `Integrante ${String(index + 1)}`))}
                {member.subject === subject ? ' (tú)' : ''}
              </p>
              <p className="text-sm">
                {member.subject === team.ownerId ? 'Creador y responsable del pago' : 'Compañero'}
              </p>
              <p className="text-sm">
                {member.consentAt === null
                  ? 'Inscripción: esperando su aceptación'
                  : `Inscripción aceptada: ${dateLabel(member.consentAt)}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <details className="tournament-technical">
        <summary>Códigos de los integrantes</summary>
        <p className="break-all">Creador: {team.ownerId}</p>
        {members
          .filter((member) => member.subject !== team.ownerId)
          .map((member) => (
            <p key={member.subject} className="break-all">
              Compañero: {member.subject}
            </p>
          ))}
      </details>
      <p className="mt-3 text-sm">
        Aceptar la inscripción no acepta las justas: cada persona responde de nuevo antes de su
        combate.
      </p>
      <details className="mt-4">
        <summary className="cursor-pointer font-semibold">Comprobante de registro</summary>
        <p className="mt-2 break-all text-sm">{team.registrationReceipt.id}</p>
        <p className="text-sm text-muted">
          Acredita el registro del equipo. El pago y el cupo se comprueban por separado.
        </p>
      </details>
      {team.status === 'AWAITING_CONSENT' &&
        (owner || self?.consentAt != null ? (
          <p className="mt-4 text-muted">
            Cada compañero pendiente debe entrar a Torneo desde su cuenta y aceptar este nombre,
            avatar e integrantes.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            <p>
              Al aceptar participas con este nombre, avatar e integrantes. Aún no se reserva un
              cupo.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={
                  !open ||
                  !canMutate ||
                  self === undefined ||
                  (locked && operation.intent?.fingerprint !== 'accept')
                }
                loading={operation.busy}
                onClick={() => void run('accept')}
              >
                Aceptar participar
              </Button>
              <Button
                variant="secondary"
                disabled={
                  !canMutate ||
                  self === undefined ||
                  (locked && operation.intent?.fingerprint !== 'reject')
                }
                onClick={() => void run('reject')}
              >
                Rechazar
              </Button>
            </div>
          </div>
        ))}
      {(team.status === 'PENDING_PAYMENT' || pending) && !owner && (
        <p className="mt-4 text-muted">
          El creador del equipo debe confirmar el cupo con el método configurado.
        </p>
      )}
      {(team.status === 'PENDING_PAYMENT' || pending) && owner && (
        <form
          className="mt-5 grid gap-4"
          aria-label="Confirmación del cupo"
          onSubmit={(event) => {
            event.preventDefault()
            void run('entry')
          }}
        >
          <h3 className="font-semibold">Confirma la inscripción</h3>
          {policy.free ? (
            <p>Inscripción gratuita. Confirma para solicitar un cupo, sin cobro.</p>
          ) : (
            <SelectField
              label="Método de inscripción"
              value={method}
              required
              disabled={locked || pending || !canMutate}
              placeholder="Elige un método"
              options={policy.methods.map((m) => ({ value: m.method, label: priceLabel(m) }))}
              onChange={(event) => {
                setMethod(event.target.value)
                setCard(emptyCard)
              }}
            />
          )}
          {paidMethod && (
            <p className="font-semibold">Importe: {priceLabel(paidMethod)}. Paga el creador.</p>
          )}
          {paidMethod?.method === 'SIMULATED_MONEY' && !pending && (
            <>
              <p className="text-sm text-muted">
                Simulación de pago. No se mueve dinero real. Los datos se envían solo para este
                intento.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['holder', 'Titular de la tarjeta de prueba', 'text'],
                    ['number', 'Número de tarjeta de prueba', 'text'],
                    ['expiry', 'Vencimiento de prueba', 'text'],
                    ['securityCode', 'Código de seguridad de prueba', 'password'],
                  ] as const
                ).map(([field, label, type]) => (
                  <TextField
                    key={field}
                    label={label}
                    type={type}
                    value={card[field]}
                    autoComplete="off"
                    inputMode={field === 'number' || field === 'securityCode' ? 'numeric' : 'text'}
                    required={!entryIntent}
                    disabled={locked || !canMutate}
                    onChange={(event) => {
                      setCard((current) => ({ ...current, [field]: event.target.value }))
                    }}
                  />
                ))}
              </div>
            </>
          )}
          {entryIntent && operation.intent?.phase === 'UNCERTAIN' && (
            <p role="status">
              El resultado está pendiente de comprobar. Reintenta la misma operación antes de
              cambiar el método.
            </p>
          )}
          {pending && (
            <p>
              La comprobación y una posible devolución conservan su intención. No inicies otro pago.
            </p>
          )}
          {!open && !pending && !entryIntent && <p>La inscripción está cerrada.</p>}
          {available === 0 && !pending && !entryIntent && (
            <p>No hay cupos disponibles según el servidor.</p>
          )}
          <Button
            type="submit"
            loading={operation.busy}
            disabled={
              !canMutate ||
              (!entryIntent && !pending && (!open || available === 0)) ||
              (!policy.free && paidMethod === undefined) ||
              operation.intent?.phase === 'REJECTED' ||
              (pending && !entryIntent)
            }
          >
            {entryIntent || pending
              ? 'Comprobar el mismo intento'
              : policy.free
                ? 'Confirmar cupo gratis'
                : paidMethod
                  ? `Pagar ${priceLabel(paidMethod)} y confirmar`
                  : 'Confirmar inscripción'}
          </Button>
        </form>
      )}
      {team.failure !== null && team.status !== 'CONFIRMED' && (
        <p role="status" className="mt-3">
          {team.failure.message}
        </p>
      )}
      {operation.error?.state === state && (
        <p role="alert" className="mt-3">
          {operation.error.message}
        </p>
      )}
      {operation.intent?.phase === 'REJECTED' && (
        <Button
          className="mt-3"
          variant="secondary"
          disabled={operation.busy}
          onClick={() => {
            operation.resetRejected()
            setCard(emptyCard)
          }}
        >
          Corregir y realizar un nuevo intento
        </Button>
      )}
      {['AWAITING_CONSENT', 'PENDING_PAYMENT'].includes(team.status) && (
        <Button
          className="mt-4"
          variant="secondary"
          disabled={
            !canMutate ||
            operation.busy ||
            (operation.intent !== null && operation.intent.fingerprint !== 'cancel')
          }
          onClick={() => void run('cancel')}
        >
          Cancelar registro
        </Button>
      )}
      {team.status === 'CONFIRMED' && receipt !== null && (
        <section
          className="mt-5 rounded-lg border border-brand/30 p-4"
          aria-label="Comprobante de inscripción confirmada"
        >
          <h3 className="font-semibold">Cupo {String(receipt.slot)} confirmado</h3>
          <details className="mt-2">
            <summary className="cursor-pointer font-semibold">
              Comprobantes de inscripción y pago
            </summary>
            <p className="break-all text-sm">Comprobante de inscripción: {receipt.id}</p>
            <p className="mt-2">{priceLabel(receipt.payment)}</p>
            {receipt.payment.chargeId !== null && (
              <p className="break-all text-sm">Comprobante de pago: {receipt.payment.chargeId}</p>
            )}
            {receipt.payment.method === 'SIMULATED_MONEY' && (
              <>
                <p className="break-all text-sm">
                  Referencia simulada: {receipt.payment.reference} · Tarjeta:{' '}
                  {receipt.payment.maskedCard}
                </p>
                <p className="text-sm">No se movió dinero real.</p>
              </>
            )}
          </details>
        </section>
      )}
    </Card>
  )
}
