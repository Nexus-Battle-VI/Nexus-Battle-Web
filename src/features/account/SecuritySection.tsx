import { useId, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PasswordField } from '@/components/ui/PasswordField'
import { TotpEnrollment } from './security/TotpEnrollment'
import { changeOwnPassword, type ChangePasswordInput } from './security/passwordApi'
import { FIELD_CLASS, FIELD_ERROR_CLASS, FIELD_LABEL_CLASS } from './fieldStyles'

/**
 * Seguridad de la cuenta (HU-05.4).
 *
 * - Cambio de contrasena contra el contrato REAL `POST /api/accounts/me/password`
 *   (payload `{ currentPassword, newPassword }`, respuesta 204). Reutiliza
 *   `PasswordField`. Las contrasenas viven solo en estado local del componente y
 *   se limpian al terminar: nunca en `localStorage`, Zustand, cache ni logs.
 * - Segundo factor: se integra el `TotpEnrollment` YA existente sin
 *   reimplementarlo.
 */

const EMPTY = { current: '', next: '', confirm: '' }

export interface SecuritySectionProps {
  /** Transporte inyectable (pruebas / vista previa). Produccion: `changeOwnPassword`. */
  readonly changePassword?: (input: ChangePasswordInput) => Promise<void>
  /** Nota honesta sobre la limitacion de autenticacion del entorno local. */
  readonly showLocalAuthNote?: boolean
}

export const SecuritySection = ({
  changePassword = changeOwnPassword,
  showLocalAuthNote = false,
}: SecuritySectionProps = {}): React.JSX.Element => {
  const [fields, setFields] = useState(EMPTY)
  const [clientError, setClientError] = useState<string | null>(null)
  const errorId = useId()

  const mutation = useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
    onSuccess: () => {
      setFields(EMPTY)
    },
  })

  const update = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFields((previous) => ({ ...previous, [key]: event.target.value }))
    setClientError(null)
    mutation.reset()
  }

  const handleSubmit = (event: React.SyntheticEvent): void => {
    event.preventDefault()
    mutation.reset()

    if (fields.current === '' || fields.next === '' || fields.confirm === '') {
      setClientError('Completa los tres campos.')
      return
    }
    if (fields.next !== fields.confirm) {
      setClientError('La confirmación no coincide con la contraseña nueva.')
      return
    }
    if (fields.next === fields.current) {
      setClientError('La contraseña nueva debe ser distinta de la actual.')
      return
    }

    setClientError(null)
    mutation.mutate({ currentPassword: fields.current, newPassword: fields.next })
  }

  let backendError: string | null = null
  if (mutation.isError) {
    backendError =
      mutation.error instanceof Error ? mutation.error.message : 'No se pudo cambiar la contraseña.'
  }
  const shownError = clientError ?? backendError

  return (
    <div className="space-y-4">
      {showLocalAuthNote && (
        <Card>
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">Entorno local:</span> el proveedor de identidad
            de desarrollo no valida credenciales reales, asi que el cambio de contraseña y el
            segundo factor no completan de extremo a extremo aqui. La interfaz y sus estados son los
            definitivos.
          </p>
        </Card>
      )}

      <Card
        title="Cambiar contraseña"
        description="Necesitas tu contraseña actual. La nueva la valida el proveedor de identidad."
      >
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="current-password" className={FIELD_LABEL_CLASS}>
              Contraseña actual
            </label>
            <PasswordField
              id="current-password"
              className={`mt-1 ${FIELD_CLASS}`}
              autoComplete="current-password"
              value={fields.current}
              onChange={update('current')}
            />
          </div>

          <div>
            <label htmlFor="new-password" className={FIELD_LABEL_CLASS}>
              Contraseña nueva
            </label>
            <PasswordField
              id="new-password"
              className={`mt-1 ${FIELD_CLASS}`}
              autoComplete="new-password"
              value={fields.next}
              onChange={update('next')}
              aria-invalid={shownError !== null}
              aria-describedby={shownError !== null ? errorId : undefined}
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className={FIELD_LABEL_CLASS}>
              Repite la contraseña nueva
            </label>
            <PasswordField
              id="confirm-password"
              className={`mt-1 ${FIELD_CLASS}`}
              autoComplete="new-password"
              value={fields.confirm}
              onChange={update('confirm')}
            />
          </div>

          {shownError !== null && (
            <p id={errorId} role="alert" className={FIELD_ERROR_CLASS}>
              {shownError}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" loading={mutation.isPending}>
              Cambiar contraseña
            </Button>
            {mutation.isSuccess && (
              <p role="status" className="text-sm text-success">
                Contraseña actualizada.
              </p>
            )}
          </div>
        </form>
      </Card>

      <Card
        title="Segundo factor"
        description="Anade una aplicacion autenticadora (TOTP) como segundo factor."
      >
        <TotpEnrollment />
      </Card>
    </div>
  )
}
