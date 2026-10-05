import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import type { EntryTeam, RegistrationApi } from './api'
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
}: {
  readonly subject: string
  readonly id: string
  readonly generation: string
  readonly api: RegistrationApi
  readonly canMutate: boolean
  readonly onResult: (team: EntryTeam) => Promise<void>
  readonly avatarDownload?: AvatarDownload | undefined
}): React.JSX.Element => {
  const operation = useOperation(JSON.stringify([subject, id, 'register', generation]))
  const draft = (() => {
    if (operation.intent === null) return null
    try {
      const value: unknown = JSON.parse(operation.intent.fingerprint)
      return Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === 'string')
        ? (value as [string, string, string])
        : null
    } catch {
      return null
    }
  })()
  const [name, setName] = useState(draft?.[0] ?? '')
  const [companionId, setCompanionId] = useState(draft?.[1] ?? '')
  const [avatarOwner, setAvatarOwner] = useState(
    draft?.[2] === subject || draft === null ? 'self' : 'companion',
  )
  const avatarSubject = avatarOwner === 'self' ? subject : companionId.trim()
  const fingerprint = JSON.stringify([
    name.trim().replace(/\s+/gu, ' '),
    companionId.trim(),
    avatarSubject,
  ])
  const submit = async (): Promise<void> => {
    const result = await operation.run(fingerprint, fingerprint, (operationId) =>
      api.register(id, {
        operationId,
        name,
        companionId: companionId.trim(),
        avatar: { kind: 'ACCOUNT_AVATAR', subject: avatarSubject },
      }),
    )
    if (result !== null) await onResult(result)
  }
  const locked = operation.busy || operation.intent !== null
  return (
    <Card>
      <form
        className="grid gap-4"
        aria-label="Registro del equipo"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <h2 className="font-game-display text-xl">Registra tu equipo</h2>
        <TextField
          label="Nombre del equipo"
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
        <TextField
          label="Código de tu compañero"
          value={companionId}
          required
          disabled={locked || !canMutate}
          error={
            companionId.trim() === subject
              ? 'Elige otro jugador; los dos integrantes deben ser distintos.'
              : undefined
          }
          hint="Pídele el código que aparece al abrir Torneo desde su cuenta."
          onChange={(event) => {
            setCompanionId(event.target.value)
          }}
        />
        <SelectField
          label="Avatar del equipo"
          value={avatarOwner}
          disabled={locked || !canMutate}
          options={[
            { value: 'self', label: 'Mi avatar de cuenta' },
            { value: 'companion', label: 'Avatar de cuenta del compañero' },
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
          Al registrar aceptas este nombre, avatar e integrantes. Tu compañero acepta desde su
          cuenta. Este registro aún no reserva un cupo.
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
          disabled={
            !canMutate || companionId.trim() === subject || operation.intent?.phase === 'REJECTED'
          }
        >
          {operation.intent?.phase === 'UNCERTAIN'
            ? 'Comprobar el mismo registro'
            : 'Registrar equipo'}
        </Button>
      </form>
    </Card>
  )
}
