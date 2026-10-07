import { useState } from 'react'
import { TournamentButton as Button, TournamentCard as Card } from '../TournamentVisuals'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import type { EntryTeam, RegistrationApi, TournamentMode } from './api'
import { modalities } from './modalities'
import { TeamAvatar, type AvatarDownload } from './TeamAvatar'
import { useOperation } from './useOperation'

export const RegisterTeamForm = ({
  subject,
  id,
  api,
  onResult,
  canMutate,
  generation,
  avatarDownload,
  mode = 'DUO',
  contractVersion = 'torneos-hu77-84-78-hu83-v2.0.0',
}: {
  readonly subject: string
  readonly id: string
  readonly generation: string
  readonly api: RegistrationApi
  readonly canMutate: boolean
  readonly onResult: (team: EntryTeam) => Promise<void>
  readonly avatarDownload?: AvatarDownload | undefined
  readonly mode?: TournamentMode
  readonly contractVersion?: string
}): React.JSX.Element => {
  const operation = useOperation(
    JSON.stringify([subject, id, 'register', contractVersion, mode, generation]),
  )
  const draft = (() => {
    try {
      const value: unknown = JSON.parse(operation.intent?.fingerprint ?? 'null')
      return Array.isArray(value) && value.length === 4 && value.every((v) => typeof v === 'string')
        ? (value as [string, string, string, string])
        : null
    } catch {
      return null
    }
  })()
  const [name, setName] = useState(draft?.[0] ?? '')
  const [invites, setInvites] = useState([draft?.[1] ?? '', draft?.[2] ?? ''])
  const [avatarOwner, setAvatarOwner] = useState(draft?.[3] ?? 'self')
  const needed = modalities[mode].size - 1
  const invited = invites.slice(0, needed).map((value) => value.trim())
  const avatarSubject =
    avatarOwner === 'self'
      ? subject
      : (invited[avatarOwner === 'companion' ? 0 : Number(avatarOwner)] ?? '')
  const fingerprint = JSON.stringify([
    name.trim().replace(/\s+/gu, ' '),
    invites[0],
    invites[1],
    avatarOwner,
  ])
  const duplicate =
    new Set([subject, ...invited.filter(Boolean)]).size !== 1 + invited.filter(Boolean).length
  const submit = async (): Promise<void> => {
    if (duplicate || !canMutate) return
    const result = await operation.run(fingerprint, fingerprint, (operationId) =>
      api.register(id, {
        operationId,
        name,
        ...(contractVersion === 'torneos-hu77-84-78-hu83-v2.0.0' && mode === 'DUO'
          ? { companionId: invited[0] ?? '' }
          : { invitedMemberIds: invited }),
        avatar: { kind: 'ACCOUNT_AVATAR', subject: avatarSubject },
      }),
    )
    if (result !== null) await onResult(result)
  }
  const locked = operation.busy || operation.intent !== null
  return (
    <Card>
      <form
        className="tournament-registration-form grid gap-4"
        aria-label="Registro del equipo"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <h2 className="font-game-display text-xl">
          {mode === 'SOLO' ? 'Registra tu participación' : 'Registra tu equipo'}
        </h2>
        <p>
          {modalities[mode].label} · {modalities[mode].summary}
        </p>
        <TextField
          label={mode === 'SOLO' ? 'Nombre de tu participación' : 'Nombre del equipo'}
          value={name}
          required
          minLength={3}
          maxLength={32}
          disabled={locked || !canMutate}
          hint="Entre 3 y 32 caracteres. Account comprueba el nombre."
          onChange={(event) => {
            setName(event.target.value)
          }}
        />
        {needed > 0 && (
          <div className="tournament-member-fields">
            {invited.map((value, index) => (
              <TextField
                key={index}
                label={
                  mode === 'DUO'
                    ? 'Código de tu compañero'
                    : `Código del integrante ${String(index + 2)}`
                }
                value={value}
                required
                disabled={locked || !canMutate}
                error={
                  value !== '' &&
                  (value === subject ||
                    invited.some((other, position) => position !== index && other === value))
                    ? mode === 'DUO'
                      ? 'Elige otro jugador; los dos integrantes deben ser distintos.'
                      : 'Cada integrante debe ser una persona distinta.'
                    : undefined
                }
                hint="Pídele su código de jugador. Aceptará desde su propia cuenta."
                onChange={(event) => {
                  setInvites((current) =>
                    current.map((previous, position) =>
                      position === index ? event.target.value : previous,
                    ),
                  )
                }}
              />
            ))}
          </div>
        )}
        <SelectField
          label={mode === 'SOLO' ? 'Avatar de tu participación' : 'Avatar del equipo'}
          value={avatarOwner}
          disabled={locked || !canMutate}
          options={[
            { value: 'self', label: 'Mi avatar de cuenta' },
            ...invited.map((_, index) => ({
              value: mode === 'DUO' ? 'companion' : String(index),
              label:
                mode === 'DUO'
                  ? 'Avatar de cuenta del compañero'
                  : `Avatar del integrante ${String(index + 2)}`,
            })),
          ]}
          onChange={(event) => {
            setAvatarOwner(event.target.value)
          }}
        />
        {avatarSubject !== '' && (
          <TeamAvatar
            key={avatarSubject}
            subject={subject}
            avatarSubject={avatarSubject}
            {...(avatarDownload ? { download: avatarDownload } : {})}
          />
        )}
        <p className="text-sm text-muted">
          {mode === 'SOLO'
            ? 'Al registrar aceptas tu participación.'
            : 'Al registrar aceptas este nombre, avatar e integrantes. Cada compañero acepta desde su propia cuenta.'}{' '}
          La inscripción aún no reserva un cupo. Aceptar cada justa es un paso distinto, durante su
          ventana de dos minutos.
        </p>
        {operation.intent?.phase === 'UNCERTAIN' && (
          <p role="status">Registro pendiente de comprobar. Reintenta con los mismos datos.</p>
        )}
        {operation.error?.state === fingerprint && <p role="alert">{operation.error.message}</p>}
        {operation.intent?.phase === 'REJECTED' && (
          <Button variant="secondary" onClick={operation.resetRejected}>
            Corregir el registro
          </Button>
        )}
        <Button
          type="submit"
          loading={operation.busy}
          disabled={!canMutate || duplicate || operation.intent?.phase === 'REJECTED'}
        >
          {operation.intent?.phase === 'UNCERTAIN'
            ? 'Comprobar el mismo registro'
            : mode === 'SOLO'
              ? 'Registrar participación'
              : 'Registrar equipo'}
        </Button>
      </form>
    </Card>
  )
}
