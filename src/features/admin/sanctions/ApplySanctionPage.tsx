import { useState, type SyntheticEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { TextField } from '@/components/ui/form/TextField'
import { User } from '@/components/ui/icons'
import { formatDateTime } from '@/lib/format'
import { HttpError } from '@/lib/http'
import { primaryRole, roleLabel } from '@/shared/rbac'
import { useSession } from '@/shared/session'
import {
  applySanction,
  type AppliedSanction,
  type ApplySanctionInput,
  type SanctionType,
} from './api'

const SANCTION_LABELS: Readonly<Record<SanctionType, string>> = {
  WARNING: 'Advertencia',
  TEMPORARY_SUSPENSION: 'Suspensión temporal',
  PERMANENT_BAN: 'Baneo definitivo',
}

const SANCTION_DESCRIPTIONS: Readonly<Record<SanctionType, string>> = {
  WARNING: 'Notifica al usuario, sin restricción de acceso.',
  TEMPORARY_SUSPENSION: 'Restringe el acceso durante un período configurable.',
  PERMANENT_BAN: 'Restringe el acceso de forma permanente.',
}

export interface SanctionTarget {
  readonly targetAccountId: string
  readonly displayName?: string
}

export interface ApplySanctionLocationState {
  readonly sanctionTarget?: SanctionTarget
}

export type ApplySanctionTransport = typeof applySanction

export interface ApplySanctionPageProps {
  readonly submitSanction?: ApplySanctionTransport
  readonly initialTarget?: SanctionTarget
}

interface FieldErrors {
  readonly target?: string | undefined
  readonly reason?: string | undefined
  readonly type?: string | undefined
  readonly duration?: string | undefined
}

const targetFromState = (state: unknown): SanctionTarget | null => {
  if (typeof state !== 'object' || state === null || !('sanctionTarget' in state)) {
    return null
  }

  const candidate = state.sanctionTarget

  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    !('targetAccountId' in candidate) ||
    typeof candidate.targetAccountId !== 'string' ||
    candidate.targetAccountId.trim() === ''
  ) {
    return null
  }

  return {
    targetAccountId: candidate.targetAccountId.trim(),
    ...('displayName' in candidate && typeof candidate.displayName === 'string'
      ? { displayName: candidate.displayName }
      : {}),
  }
}

const errorMessage = (error: unknown): string => {
  if (error instanceof HttpError && error.isUnauthorized) {
    return 'Tu sesión ha caducado. Vuelve a iniciar sesión antes de aplicar una sanción.'
  }

  if (error instanceof HttpError && error.isForbidden) {
    return 'Account rechazó la operación: tu sesión no está autorizada para este tipo de sanción.'
  }

  if (error instanceof HttpError && error.isNotFound) {
    return 'Account no encontró la cuenta indicada. Verifica el identificador del usuario.'
  }

  if (error instanceof HttpError && error.isClientError) {
    return error.message
  }

  return 'No se pudo confirmar la operación. Revisa el estado antes de intentarlo nuevamente.'
}

const dateValue = (value: string): React.JSX.Element => (
  <time dateTime={value}>{formatDateTime(value)}</time>
)

const SummaryRows = ({ children }: { readonly children: React.ReactNode }): React.JSX.Element => (
  <dl className="space-y-3 rounded-lg border border-border bg-surface p-4 text-sm">{children}</dl>
)

const SummaryRow = ({
  label,
  children,
}: {
  readonly label: string
  readonly children: React.ReactNode
}): React.JSX.Element => (
  <div className="grid gap-1 sm:grid-cols-[minmax(7rem,0.7fr)_minmax(0,1fr)] sm:gap-3">
    <dt className="text-muted">{label}</dt>
    <dd className="break-words font-medium text-ink">{children}</dd>
  </div>
)

/**
 * Aplicación de sanciones progresivas (HU-42).
 *
 * Usa el contrato de Account directamente a través del cliente HTTP compartido.
 * Esta pantalla solo valida la forma del request; Account decide la existencia
 * del objetivo y la autorización efectiva para cada tipo de sanción.
 */
export const ApplySanctionPage = ({
  submitSanction = applySanction,
  initialTarget: targetOverride,
}: ApplySanctionPageProps = {}): React.JSX.Element => {
  const location = useLocation()
  const navigate = useNavigate()
  const roles = useSession((state) => state.roles)
  const currentRole = primaryRole(roles)
  const initialTarget = targetOverride ?? targetFromState(location.state)
  const [selectedTarget, setSelectedTarget] = useState<SanctionTarget | null>(initialTarget)
  const [manualTargetId, setManualTargetId] = useState('')
  const [reason, setReason] = useState('')
  const [type, setType] = useState<SanctionType | ''>('')
  const [durationDays, setDurationDays] = useState('')
  const [showBanConfirmation, setShowBanConfirmation] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const mutation = useMutation({
    mutationFn: ({
      targetAccountId,
      input,
    }: {
      targetAccountId: string
      input: ApplySanctionInput
    }) => submitSanction(targetAccountId, input),
  })

  const targetAccountId = selectedTarget?.targetAccountId ?? manualTargetId.trim()
  const candidateName = selectedTarget?.displayName?.trim()
  const targetName = candidateName === undefined || candidateName === '' ? null : candidateName
  const canApplyPermanentBan =
    currentRole === 'ADMINISTRATOR' || currentRole === 'SUPER_ADMINISTRATOR'
  const result: AppliedSanction | undefined = mutation.data

  const submit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault()

    const nextErrors: {
      target?: string
      reason?: string
      type?: string
      duration?: string
    } = {}

    if (targetAccountId === '') nextErrors.target = 'Indica el ID de la cuenta que se sancionará.'
    if (reason.trim() === '') nextErrors.reason = 'La causal es obligatoria.'
    if (type === '') nextErrors.type = 'Selecciona un tipo de sanción.'

    let durationMinutes: number | undefined

    if (type === 'TEMPORARY_SUSPENSION') {
      const days = Number(durationDays)

      if (durationDays.trim() === '' || !Number.isSafeInteger(days) || days <= 0) {
        nextErrors.duration = 'Indica una duración en días como número entero positivo.'
      } else {
        durationMinutes = days * 24 * 60

        if (!Number.isSafeInteger(durationMinutes)) {
          nextErrors.duration = 'La duración indicada no se puede representar de forma segura.'
        }
      }
    }

    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || type === '') return

    if (type === 'PERMANENT_BAN' && !canApplyPermanentBan) return

    if (type === 'PERMANENT_BAN') {
      mutation.reset()
      setShowBanConfirmation(true)
      return
    }

    runSanction(type, durationMinutes)
  }

  const runSanction = (selectedType: SanctionType, suspensionDurationMinutes?: number): void => {
    setShowBanConfirmation(false)
    mutation.reset()
    const input: ApplySanctionInput = {
      type: selectedType,
      reason: reason.trim(),
      ...(selectedType === 'TEMPORARY_SUSPENSION' && suspensionDurationMinutes !== undefined
        ? { suspensionDurationMinutes }
        : {}),
    }

    mutation.mutate({ targetAccountId, input })
  }

  const confirmBan = (): void => {
    if (type === 'PERMANENT_BAN' && canApplyPermanentBan) {
      runSanction('PERMANENT_BAN')
    }
  }

  const clearTarget = (): void => {
    setSelectedTarget(null)
    setManualTargetId('')
  }

  const goBackToModeration = (): void => {
    void navigate('/admin/comments/moderation')
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Breadcrumb
        items={[
          { label: 'Inicio', to: '/ecommerce' },
          { label: 'Moderación de comentarios', to: '/admin/comments/moderation' },
          { label: 'Aplicar sanción' },
        ]}
      />

      <Card className="mx-auto mt-6 w-full max-w-sm">
        <h1 className="text-base font-semibold text-ink">
          {result?.type === 'PERMANENT_BAN'
            ? 'Baneo definitivo aplicado'
            : result === undefined
              ? 'Aplicar sanción'
              : 'Sanción aplicada'}
        </h1>
        {!result && (
          <div className="mt-3 mb-4 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-full border border-brand bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              Rol: {currentRole === null ? 'No disponible' : roleLabel(currentRole)}
            </span>
          </div>
        )}

        {result === undefined ? (
          <>
            {mutation.isPending && (
              <div
                className="mb-4 space-y-2 rounded-lg border border-border bg-surface p-3"
                aria-live="polite"
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-ink">Procesando solicitud</span>
                  <span role="status" className="text-muted">
                    Aplicando sanción…
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-brand" />
                </div>
              </div>
            )}

            {mutation.isError && (
              <div
                role="alert"
                className="mb-4 rounded-lg border-l-4 border-danger bg-danger/10 p-3 text-sm text-ink"
              >
                <p className="font-semibold">No se pudo aplicar la sanción</p>
                <p className="mt-1 text-muted">{errorMessage(mutation.error)}</p>
                {targetAccountId !== '' && (
                  <SummaryRows>
                    <SummaryRow label="Usuario">{targetName ?? targetAccountId}</SummaryRow>
                    {type !== '' && (
                      <SummaryRow label="Tipo de sanción">{SANCTION_LABELS[type]}</SummaryRow>
                    )}
                  </SummaryRows>
                )}
              </div>
            )}

            <form className="space-y-5" onSubmit={submit} noValidate hidden={showBanConfirmation}>
              <section aria-labelledby="sanction-target-label" className="space-y-2">
                <h3 id="sanction-target-label" className="text-sm font-medium text-ink">
                  Usuario sancionado <span aria-hidden="true">*</span>
                </h3>

                {selectedTarget === null ? (
                  <TextField
                    label="ID de la cuenta"
                    required
                    value={manualTargetId}
                    onChange={(event) => {
                      setManualTargetId(event.target.value)
                      setFieldErrors((current) => ({ ...current, target: undefined }))
                    }}
                    placeholder="Ingresa el ID de Account"
                    hint="También puedes abrir este formulario desde la cola de moderación o el panel de usuarios."
                    error={fieldErrors.target}
                    disabled={mutation.isPending}
                  />
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                        <User aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-ink">
                          {targetName ?? 'Cuenta seleccionada'}
                        </p>
                        <p className="break-all text-xs text-muted">ID: {targetAccountId}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0 px-3 py-1.5 text-xs"
                      disabled={mutation.isPending}
                      onClick={clearTarget}
                    >
                      Cambiar
                    </Button>
                  </div>
                )}

                {selectedTarget === null && targetAccountId !== '' && (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                      <User aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">ID objetivo indicado</p>
                      <p className="break-all text-xs text-muted">ID: {targetAccountId}</p>
                    </div>
                  </div>
                )}
              </section>

              <TextareaField
                label="Causal de la sanción"
                required
                rows={3}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  setFieldErrors((current) => ({ ...current, reason: undefined }))
                }}
                placeholder="Describe el motivo de la sanción..."
                error={fieldErrors.reason}
                disabled={mutation.isPending}
              />

              <fieldset
                className="space-y-2"
                aria-describedby={fieldErrors.type ? 'sanction-type-error' : undefined}
              >
                <legend className="text-sm font-medium text-ink">
                  Tipo de sanción <span aria-hidden="true">*</span>
                </legend>
                <div className="space-y-2">
                  {(['WARNING', 'TEMPORARY_SUSPENSION', 'PERMANENT_BAN'] as const).map((option) => {
                    const disabled =
                      mutation.isPending || (option === 'PERMANENT_BAN' && !canApplyPermanentBan)
                    const checked = type === option

                    return (
                      <label
                        key={option}
                        className={`flex min-h-20 items-center gap-3 rounded-lg border p-3 transition-colors ${
                          disabled
                            ? 'cursor-not-allowed border-border bg-surface opacity-55'
                            : checked
                              ? 'cursor-pointer border-brand bg-brand/10'
                              : 'cursor-pointer border-border bg-surface hover:border-brand/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name="sanction-type"
                          value={option}
                          checked={checked}
                          disabled={disabled}
                          onChange={() => {
                            setType(option)
                            setFieldErrors((current) => ({
                              ...current,
                              type: undefined,
                              duration: undefined,
                            }))
                          }}
                          className="h-5 w-5 shrink-0 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink">
                            {SANCTION_LABELS[option]}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">
                            {option === 'PERMANENT_BAN' && !canApplyPermanentBan
                              ? 'No disponible para tu rol'
                              : SANCTION_DESCRIPTIONS[option]}
                          </span>
                        </span>
                        {option === 'PERMANENT_BAN' && !canApplyPermanentBan && (
                          <span aria-hidden="true" className="text-muted">
                            🔒
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
                {fieldErrors.type !== undefined && (
                  <p id="sanction-type-error" role="alert" className="text-xs text-danger">
                    {fieldErrors.type}
                  </p>
                )}
              </fieldset>

              {type === 'TEMPORARY_SUSPENSION' && (
                <TextField
                  label="Duración de la suspensión (días)"
                  required
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={durationDays}
                  onChange={(event) => {
                    setDurationDays(event.target.value)
                    setFieldErrors((current) => ({ ...current, duration: undefined }))
                  }}
                  hint="Account recibe la duración en minutos; se convierte desde los días indicados."
                  error={fieldErrors.duration}
                  disabled={mutation.isPending}
                />
              )}

              {!canApplyPermanentBan && (
                <p className="rounded-md border border-border bg-surface p-3 text-xs text-muted">
                  El baneo definitivo requiere rol Administrador o Super Administrador. Account
                  también valida este permiso.
                </p>
              )}

              <Button type="submit" className="w-full" loading={mutation.isPending}>
                {mutation.isError ? 'Reintentar' : 'Aplicar sanción'}
              </Button>
            </form>

            {showBanConfirmation && (
              <section
                role="region"
                aria-labelledby="ban-confirmation-title"
                aria-describedby="ban-confirmation-description"
                className="mt-5 space-y-4 rounded-lg border border-danger bg-surface p-4"
              >
                <div className="border-l-4 border-danger pl-3">
                  <h3 id="ban-confirmation-title" className="font-semibold text-ink">
                    Esta acción es irreversible
                  </h3>
                  <p id="ban-confirmation-description" className="mt-1 text-sm text-muted">
                    El usuario perderá acceso permanente a la plataforma. Account aplicará la
                    sanción si el permiso es válido.
                  </p>
                </div>
                <SummaryRows>
                  <SummaryRow label="Usuario">{targetName ?? targetAccountId}</SummaryRow>
                  <SummaryRow label="Causal">{reason.trim()}</SummaryRow>
                  <SummaryRow label="Tipo de sanción">Baneo definitivo</SummaryRow>
                </SummaryRows>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={mutation.isPending}
                    onClick={() => {
                      setShowBanConfirmation(false)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    loading={mutation.isPending}
                    onClick={confirmBan}
                  >
                    Confirmar baneo
                  </Button>
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="mt-4 space-y-4">
            <p
              role="status"
              className="inline-flex rounded-full border border-success bg-success/10 px-3 py-1.5 text-xs font-semibold text-success"
            >
              {result.type === 'PERMANENT_BAN'
                ? 'Baneo definitivo aplicado'
                : 'Sanción registrada y aplicada'}
            </p>
            <SummaryRows>
              <SummaryRow label="Usuario">{targetName ?? result.targetAccountId}</SummaryRow>
              <SummaryRow label="Tipo de sanción">{SANCTION_LABELS[result.type]}</SummaryRow>
              {result.type === 'TEMPORARY_SUSPENSION' && (
                <SummaryRow label="Duración">
                  {durationDays} {durationDays === '1' ? 'día' : 'días'}
                </SummaryRow>
              )}
              {result.type === 'TEMPORARY_SUSPENSION' && result.expiresAt !== null && (
                <SummaryRow label="Vigente hasta">{dateValue(result.expiresAt)}</SummaryRow>
              )}
              <SummaryRow label="Aplicado por">
                {result.actorAccountId}
                {currentRole === null ? '' : ` (${roleLabel(currentRole)})`}
              </SummaryRow>
              <SummaryRow label="Apelación hasta">{dateValue(result.appealDeadline)}</SummaryRow>
            </SummaryRows>
            <p className="text-xs text-muted">
              La respuesta de Account no informa el estado de entrega del correo; por eso no se
              muestra como enviado.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" className="w-full" onClick={goBackToModeration}>
                Volver al panel
              </Button>
              <Link
                to="/admin/sanctions/apply"
                className="inline-flex w-full items-center justify-center rounded-md border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                onClick={() => {
                  mutation.reset()
                  setSelectedTarget(null)
                  setManualTargetId('')
                  setReason('')
                  setType('')
                  setDurationDays('')
                }}
              >
                Aplicar otra sanción
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
