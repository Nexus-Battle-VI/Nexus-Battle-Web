import { useId, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PasswordField } from '@/components/ui/PasswordField'
import { useLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'
import { useTheme } from '@/shared/theme'
import { accountFormControls } from './accountRemasterAssets'
import { AccountPixelIcon } from './AccountPixelIcon'
import { TotpEnrollment, type TotpEnrollmentProps } from './security/TotpEnrollment'
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
  /**
   * Transportes TOTP inyectables, reenviados tal cual a `TotpEnrollment`
   * (mismo patron que `changePassword`). Sin valor: `TotpEnrollment` usa sus
   * propios transportes reales por defecto -produccion no cambia-.
   */
  readonly onTotpEnroll?: TotpEnrollmentProps['onEnroll']
  readonly onTotpConfirm?: TotpEnrollmentProps['onConfirm']
}

export const SecuritySection = ({
  changePassword = changeOwnPassword,
  showLocalAuthNote = false,
  onTotpEnroll,
  onTotpConfirm,
}: SecuritySectionProps = {}): React.JSX.Element => {
  const [fields, setFields] = useState(EMPTY)
  // Guarda la CLAVE del aviso local; se traduce al pintar.
  const [clientError, setClientError] = useState<string | null>(null)
  const errorId = useId()
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)
  const theme = useTheme((state) => state.theme)
  // Ronda 2 (brief seccion 27/28): `PasswordField` es compartido (Registro,
  // Login); el ojo tematico se inyecta SOLO aqui via las props opcionales
  // nuevas, sin tocar el comportamiento del boton real (sigue siendo
  // `<button type="button">` con `aria-label`/`aria-pressed`, solo cambia su
  // representacion visual).
  const eyeIcon = (
    <img src={accountFormControls.eyeShow[theme]} alt="" aria-hidden className="h-4 w-4" />
  )
  const eyeOffIcon = (
    <img src={accountFormControls.eyeHide[theme]} alt="" aria-hidden className="h-4 w-4" />
  )

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
      setClientError('account:security.required')
      return
    }
    if (fields.next !== fields.confirm) {
      setClientError('account:security.mismatch')
      return
    }
    if (fields.next === fields.current) {
      setClientError('account:security.sameAsCurrent')
      return
    }

    setClientError(null)
    mutation.mutate({ currentPassword: fields.current, newPassword: fields.next })
  }

  let backendError: string | null = null
  if (mutation.isError) {
    backendError =
      mutation.error instanceof Error
        ? describeFailure(mutation.error, t, language)
        : t('account:security.changeFailed')
  }
  const shownError = clientError === null ? backendError : t(clientError)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AccountPixelIcon icon="security" size="md" />
        <h2 className="account-title text-lg font-semibold">{t('account:sections.security')}</h2>
      </div>

      {showLocalAuthNote && (
        <Card className="account-subpanel account-info-note">
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">{t('account:security.localNoteTitle')}</span>{' '}
            {t('account:security.localNote')}
          </p>
        </Card>
      )}

      <Card
        className="account-panel"
        title={t('account:security.passwordTitle')}
        description={t('account:security.passwordDescription')}
      >
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="current-password" className={`${FIELD_LABEL_CLASS} account-label`}>
              {t('account:security.current')}
            </label>
            <PasswordField
              id="current-password"
              className={`mt-1 ${FIELD_CLASS}`}
              autoComplete="current-password"
              value={fields.current}
              onChange={update('current')}
              eyeIcon={eyeIcon}
              eyeOffIcon={eyeOffIcon}
            />
          </div>

          <div>
            <label htmlFor="new-password" className={`${FIELD_LABEL_CLASS} account-label`}>
              {t('account:security.new')}
            </label>
            <PasswordField
              id="new-password"
              className={`mt-1 ${FIELD_CLASS}`}
              autoComplete="new-password"
              value={fields.next}
              onChange={update('next')}
              aria-invalid={shownError !== null}
              aria-describedby={shownError !== null ? errorId : undefined}
              eyeIcon={eyeIcon}
              eyeOffIcon={eyeOffIcon}
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className={`${FIELD_LABEL_CLASS} account-label`}>
              {t('account:security.confirm')}
            </label>
            <PasswordField
              id="confirm-password"
              className={`mt-1 ${FIELD_CLASS}`}
              autoComplete="new-password"
              value={fields.confirm}
              onChange={update('confirm')}
              eyeIcon={eyeIcon}
              eyeOffIcon={eyeOffIcon}
            />
          </div>

          {shownError !== null && (
            <p id={errorId} role="alert" className={FIELD_ERROR_CLASS}>
              {shownError}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" variant="account-primary" loading={mutation.isPending}>
              {t('account:security.change')}
            </Button>
            {mutation.isSuccess && (
              <p role="status" className="text-sm text-success">
                {t('account:security.changed')}
              </p>
            )}
          </div>
        </form>
      </Card>

      <Card
        className="account-panel"
        title={t('account:security.totpTitle')}
        description={t('account:security.totpDescription')}
      >
        <TotpEnrollment
          {...(onTotpEnroll === undefined ? {} : { onEnroll: onTotpEnroll })}
          {...(onTotpConfirm === undefined ? {} : { onConfirm: onTotpConfirm })}
        />
      </Card>
    </div>
  )
}
