import { useEffect, useState } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import clsx from 'clsx'

import { Button } from '@/components/ui/Button'
import { NexusBrandHeader } from '@/components/ui/NexusBrandHeader'
import { useSession } from '@/shared/session'
import { roleLabel } from '@/shared/rbac'
import { NEXUS_DARK_THEME } from '@/shared/publicAuthTheme'
import { ECOMMERCE_PATH } from '@/routes/routes'
import {
  MissingContractError,
  login,
  verifyMfaCode,
  type LoginOutcome,
  type MfaChallenge,
} from './api'
import {
  EMPTY_LOGIN_VALUES,
  FIELD,
  MESSAGES,
  hasErrors,
  validateLoginForm,
  type LoginFormValues,
} from './validation'

type Stage = 'credentials' | 'mfa' | 'success'

const GENERIC_INVALID_CREDENTIALS = 'No fue posible iniciar sesión. Revisa tus credenciales.'

const GENERIC_SERVICE_ERROR =
  'No pudimos completar el inicio de sesión en este momento. Inténtalo de nuevo más tarde.'

const GENERIC_MFA_REJECTED = 'El código no es válido o ya expiró. Inténtalo nuevamente.'

/**
 * Traduce un fallo de transporte a un mensaje seguro para mostrar.
 *
 * Solo se confia en el mensaje de `MissingContractError`: es un mensaje
 * propio, en espanol, redactado para mostrarse (ver `api.ts`). Cualquier otro
 * `Error` -un fallo de red, una excepcion del navegador, lo que sea- podria
 * traer texto tecnico en `.message`, y HU-02 exige explicitamente que un
 * fallo temporal de servicio no revele nada de eso: se muestra siempre el
 * mismo mensaje generico.
 */
const describeFailure = (error: unknown, fallback: string): string =>
  error instanceof MissingContractError ? error.message : fallback

const CONTROL_CLASS =
  'block w-full min-w-0 rounded-md border bg-[var(--nb-field)] px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand'

interface FieldProps {
  readonly id: string
  readonly label: string
  readonly error?: string
  readonly children: (props: {
    readonly id: string
    readonly 'aria-invalid': boolean
    readonly 'aria-describedby': string | undefined
    readonly className: string
  }) => ReactNode
}

/** Campo con su etiqueta y su error asociado. Ver el mismo patron en HU-01. */
const Field = ({ id, label, error, children }: FieldProps): React.JSX.Element => (
  <div className="w-full min-w-0">
    <label htmlFor={id} className="block text-sm font-medium text-ink">
      {label}
    </label>
    <div className="mt-1.5">
      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': error === undefined ? undefined : `${id}-error`,
        className: clsx(CONTROL_CLASS, error === undefined ? 'border-border' : 'border-danger'),
      })}
    </div>
    {error !== undefined && (
      <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
        <span aria-hidden="true" className="font-bold leading-5">
          !
        </span>
        <span>{error}</span>
      </p>
    )}
  </div>
)

export interface LoginPageProps {
  /** Se inyectan para poder probar todos los estados sin depender de un contrato real. */
  readonly loginFn?: typeof login
  readonly verifyMfaCodeFn?: typeof verifyMfaCode
}

/**
 * HU-02 — Inicio de sesion y verificacion de rol (RBAC).
 *
 * Pantalla publica: se monta fuera de `AppLayout` (ver `routes.tsx`) para que
 * quien no tiene sesion no reciba la navegacion ni el avatar de quien si la
 * tiene.
 *
 * El rol NUNCA se decide aqui. Esta pantalla solo envia credenciales y
 * traslada el resultado que el servicio devuelva; el menu posterior (ver
 * `AppLayout`/`routes.tsx`) se construye a partir de `useSession().roles`, que
 * esta pantalla escribe pero no elige.
 */
export const LoginPage = ({
  loginFn = login,
  verifyMfaCodeFn = verifyMfaCode,
}: LoginPageProps = {}): React.JSX.Element => {
  const navigate = useNavigate()
  const establishSession = useSession((state) => state.establishSession)

  const [stage, setStage] = useState<Stage>('credentials')
  const [values, setValues] = useState<LoginFormValues>(EMPTY_LOGIN_VALUES)
  const [touched, setTouched] = useState<Readonly<Record<string, boolean>>>({})
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaAttempted, setMfaAttempted] = useState(false)
  const [mfaMessage, setMfaMessage] = useState<string | null>(null)
  const [sessionRole, setSessionRole] = useState<string | null>(null)
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState(false)

  const errors = validateLoginForm(values)
  const visible = attempted
    ? errors
    : Object.fromEntries(Object.entries(errors).filter(([field]) => touched[field] === true))

  // Redirige tan pronto la pantalla de "acceso completado" se muestra: HU-02
  // exige que el destino sea siempre E-commerce (aclaracion del cliente), no
  // el lugar del que vino la persona. Por eso no se lee ni se muestra el
  // `returnTo` que deja `RequireSession`: el destino nunca varia con el.
  useEffect(() => {
    if (stage !== 'success') {
      return
    }

    void navigate(ECOMMERCE_PATH, { replace: true })
  }, [stage, navigate])

  /**
   * Traduce un `LoginOutcome` a estado de pantalla.
   *
   * `onInvalid` recibe el mensaje de rechazo en lugar de asumir un unico
   * destino: el mismo estado `INVALID_CREDENTIALS` significa "credenciales
   * incorrectas" durante el login y "codigo incorrecto" durante el segundo
   * factor, y cada etapa muestra su mensaje en su propia tarjeta.
   */
  const applyOutcome = (
    outcome: LoginOutcome,
    invalidMessage: string,
    onInvalid: (message: string) => void,
  ): void => {
    if (outcome.status === 'AUTHENTICATED') {
      establishSession(outcome.session)
      setSessionRole(outcome.session.roles[0] ?? null)
      setStage('success')

      return
    }

    if (outcome.status === 'MFA_REQUIRED') {
      setChallenge(outcome.challenge)
      setStage('mfa')

      return
    }

    onInvalid(invalidMessage)
  }

  const handleCredentialsSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (submitting) {
      return
    }

    setAttempted(true)
    setAuthMessage(null)

    if (hasErrors(errors)) {
      return
    }

    setSubmitting(true)

    try {
      const outcome = await loginFn(values)

      applyOutcome(outcome, GENERIC_INVALID_CREDENTIALS, setAuthMessage)
    } catch (error: unknown) {
      setAuthMessage(describeFailure(error, GENERIC_SERVICE_ERROR))
    } finally {
      setSubmitting(false)
    }
  }

  const handleMfaSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (submitting) {
      return
    }

    setMfaAttempted(true)
    setMfaMessage(null)

    if (mfaCode.trim() === '' || challenge === null) {
      return
    }

    setSubmitting(true)

    try {
      const outcome = await verifyMfaCodeFn(challenge.challengeId, mfaCode.trim())

      applyOutcome(outcome, GENERIC_MFA_REJECTED, setMfaMessage)
    } catch (error: unknown) {
      setMfaMessage(describeFailure(error, GENERIC_SERVICE_ERROR))
    } finally {
      setSubmitting(false)
    }
  }

  const showInfoSummary = attempted && hasErrors(errors)

  return (
    <div
      style={NEXUS_DARK_THEME}
      className="flex min-h-dvh flex-col bg-surface px-4 py-10 text-ink"
    >
      <div className="mx-auto w-full max-w-md">
        <NexusBrandHeader />

        <main className="mt-10">
          {stage === 'success' && (
            <div>
              <h1 className="text-2xl font-semibold text-ink">Acceso completado</h1>
              <p role="status" className="mt-2 text-sm text-muted">
                Sesión iniciada
                {sessionRole !== null ? ` como ${roleLabel(sessionRole)}` : ''}. Te llevamos a
                E-commerce.
              </p>
            </div>
          )}

          {stage === 'credentials' && (
            <div>
              <h1 className="text-2xl font-semibold text-ink">Iniciar sesión</h1>
              <p className="mt-2 text-sm text-muted">Ingresa tu correo o apodo y tu contraseña.</p>

              <form
                noValidate
                onSubmit={(event) => void handleCredentialsSubmit(event)}
                className="mt-6 space-y-5"
              >
                {showInfoSummary && (
                  <div role="alert" className="border-l-2 border-danger pl-3">
                    <p className="text-sm font-semibold text-ink">{MESSAGES.summaryTitle}</p>
                    <p className="mt-0.5 text-sm text-muted">{MESSAGES.summaryBody}</p>
                  </div>
                )}

                {authMessage !== null && (
                  <p role="alert" className="border-l-2 border-danger pl-3 text-sm text-danger">
                    {authMessage}
                  </p>
                )}

                <Field
                  id={FIELD.identifier}
                  label="Correo o apodo"
                  {...(visible[FIELD.identifier] === undefined
                    ? {}
                    : { error: visible[FIELD.identifier] })}
                >
                  {(field) => (
                    <input
                      {...field}
                      type="text"
                      autoComplete="username"
                      placeholder="nombre@correo.com o tu apodo"
                      value={values.identifier}
                      onBlur={() => {
                        setTouched((previous) => ({ ...previous, [FIELD.identifier]: true }))
                      }}
                      onChange={(event) => {
                        setValues((previous) => ({ ...previous, identifier: event.target.value }))
                      }}
                    />
                  )}
                </Field>

                <Field
                  id={FIELD.password}
                  label="Contraseña"
                  {...(visible[FIELD.password] === undefined
                    ? {}
                    : { error: visible[FIELD.password] })}
                >
                  {(field) => (
                    <input
                      {...field}
                      type="password"
                      autoComplete="current-password"
                      placeholder="Tu contraseña"
                      value={values.password}
                      onBlur={() => {
                        setTouched((previous) => ({ ...previous, [FIELD.password]: true }))
                      }}
                      onChange={(event) => {
                        setValues((previous) => ({ ...previous, password: event.target.value }))
                      }}
                    />
                  )}
                </Field>

                {/*
                  Apilados, no en fila: es el orden y la disposicion que
                  muestra el Figma (cada enlace en su propia linea), no una
                  barra de acciones secundarias horizontal.
                */}
                <div className="flex flex-col items-start gap-2 text-sm">
                  <button
                    type="button"
                    className="font-medium text-brand underline"
                    onClick={() => {
                      setForgotPasswordNotice(true)
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                  <Link to="/register" className="font-medium text-brand underline">
                    ¿No tienes cuenta? Crear cuenta
                  </Link>
                </div>

                {forgotPasswordNotice && (
                  <p role="status" className="text-xs text-muted">
                    Esta función pertenece a HU-04 — Recuperación de contraseña y aún no está
                    disponible en este incremento.
                  </p>
                )}

                <Button type="submit" loading={submitting} className="w-full">
                  Iniciar sesión
                </Button>
              </form>
            </div>
          )}

          {stage === 'mfa' && (
            <div>
              <h1 className="text-2xl font-semibold text-ink">Verificación adicional</h1>
              <p className="mt-2 text-sm text-muted">
                Tu cuenta requiere un segundo factor. Te enviamos un código por correo electrónico;
                las operaciones administrativas quedan deshabilitadas hasta verificarlo.
              </p>

              <form
                noValidate
                onSubmit={(event) => void handleMfaSubmit(event)}
                className="mt-6 space-y-5"
              >
                {mfaAttempted && mfaCode.trim() === '' && (
                  <div role="alert" className="border-l-2 border-danger pl-3">
                    <p className="text-sm font-semibold text-ink">{MESSAGES.summaryTitle}</p>
                    <p className="mt-0.5 text-sm text-muted">{MESSAGES.summaryBody}</p>
                  </div>
                )}

                {mfaMessage !== null && (
                  <p role="alert" className="border-l-2 border-danger pl-3 text-sm text-danger">
                    {mfaMessage}
                  </p>
                )}

                <Field
                  id="mfa-code"
                  label="Código de verificación"
                  {...(mfaAttempted && mfaCode.trim() === ''
                    ? { error: 'Ingresa el código que recibiste por correo.' }
                    : {})}
                >
                  {(field) => (
                    <input
                      {...field}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={mfaCode}
                      onChange={(event) => {
                        setMfaCode(event.target.value)
                      }}
                    />
                  )}
                </Field>

                <Button type="submit" loading={submitting} className="w-full">
                  Verificar código
                </Button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
