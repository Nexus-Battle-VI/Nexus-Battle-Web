import { useEffect, useState } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import clsx from 'clsx'

import { Button } from '@/components/ui/Button'
import { NexusBrandHeader } from '@/components/ui/NexusBrandHeader'
import { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'
import { roleLabel } from '@/shared/rbac'
import { NEXUS_DARK_THEME } from '@/shared/publicAuthTheme'
import { ECOMMERCE_PATH } from '@/routes/routes'
import { login, completeSecondFactor, type LoginOutcome, type SecondFactorMethod } from './api'
import {
  EMPTY_LOGIN_VALUES,
  FIELD,
  MESSAGES,
  hasErrors,
  validateLoginForm,
  type LoginFormValues,
} from './validation'

type Stage = 'credentials' | 'secondFactor' | 'success'

const GENERIC_INVALID_CREDENTIALS = 'No fue posible iniciar sesión. Revisa tus credenciales.'

const GENERIC_SERVICE_ERROR =
  'No pudimos completar el inicio de sesión en este momento. Inténtalo de nuevo más tarde.'

const GENERIC_SECOND_FACTOR_REJECTED = 'El código no es válido o ya expiró. Inténtalo nuevamente.'

/**
 * Traduce un fallo de transporte a un mensaje seguro para mostrar.
 *
 * Account distingue "credenciales/codigo invalido" de "proveedor no
 * disponible" por el status HTTP (401 frente a 503 u otro fallo), no dentro
 * del cuerpo de una respuesta 200 -ver `api.ts`-. Por eso la clasificacion
 * ocurre aqui, sobre `HttpError.status`, y no leyendo `.message`: el texto que
 * mande el servicio no se muestra tal cual, para no acoplar la pantalla a su
 * redaccion exacta ni arriesgar filtrar detalle tecnico si algun dia cambia.
 */
const describeFailure = (error: unknown, unauthorizedMessage: string): string =>
  error instanceof HttpError && error.isUnauthorized ? unauthorizedMessage : GENERIC_SERVICE_ERROR

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
  /** Se inyectan para poder probar todos los estados sin depender de red real. */
  readonly loginFn?: typeof login
  readonly completeSecondFactorFn?: typeof completeSecondFactor
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
/**
 * Que se le dice a quien tiene que responder el reto.
 *
 * Antes esto era una frase fija: "te enviamos un codigo por correo
 * electronico". El pool reta con la aplicacion autenticadora y NO envia ningun
 * correo, asi que la pantalla mandaba a revisar un buzon vacio. Un mensaje que
 * dirige a alguien al sitio equivocado es peor que uno impreciso.
 *
 * Cuando Account no declara el canal, se dice que hace falta un codigo y no se
 * nombra ninguno. Callar lo que no se sabe es preferible a rellenarlo.
 */
const secondFactorPrompt = (method: SecondFactorMethod | null): string => {
  if (method === 'AUTHENTICATOR_APP') {
    return 'Tu cuenta requiere un segundo factor. Abre tu aplicación autenticadora e ingresa el código que muestra.'
  }

  if (method === 'EMAIL') {
    return 'Tu cuenta requiere un segundo factor. Te enviamos un código por correo electrónico.'
  }

  if (method === 'SMS') {
    return 'Tu cuenta requiere un segundo factor. Te enviamos un código por mensaje de texto.'
  }

  return 'Tu cuenta requiere un segundo factor. Ingresa el código de verificación.'
}

export const LoginPage = ({
  loginFn = login,
  completeSecondFactorFn = completeSecondFactor,
}: LoginPageProps = {}): React.JSX.Element => {
  const navigate = useNavigate()
  const establishSession = useSession((state) => state.establishSession)

  const [stage, setStage] = useState<Stage>('credentials')
  const [values, setValues] = useState<LoginFormValues>(EMPTY_LOGIN_VALUES)
  const [touched, setTouched] = useState<Readonly<Record<string, boolean>>>({})
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [challengeToken, setChallengeToken] = useState<string | null>(null)
  const [secondFactorMethod, setSecondFactorMethod] = useState<SecondFactorMethod | null>(null)
  const [secondFactorCode, setSecondFactorCode] = useState('')
  const [secondFactorAttempted, setSecondFactorAttempted] = useState(false)
  const [secondFactorMessage, setSecondFactorMessage] = useState<string | null>(null)
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
   * Traduce un `LoginOutcome` resuelto (200) a estado de pantalla.
   *
   * Solo cubre `AUTHENTICATED` y `SECOND_FACTOR_REQUIRED`: credenciales o
   * codigo invalidos no llegan aqui, llegan como promesa rechazada (401), y
   * cada llamador los traduce por separado porque el mensaje es distinto en
   * cada etapa (ver `handleCredentialsSubmit`/`handleSecondFactorSubmit`).
   */
  const applyOutcome = (outcome: LoginOutcome): void => {
    if (outcome.status === 'AUTHENTICATED') {
      establishSession(outcome.session)
      setSessionRole(outcome.session.roles[0] ?? null)
      setStage('success')

      return
    }

    setChallengeToken(outcome.challengeToken)
    setSecondFactorMethod(outcome.secondFactorMethod ?? null)
    setStage('secondFactor')
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

      applyOutcome(outcome)
    } catch (error: unknown) {
      // Account devuelve 401 tanto si el correo/apodo no existe como si la
      // contrasena es incorrecta: el mismo mensaje generico cubre ambos casos
      // sin permitir enumerar cuentas.
      setAuthMessage(describeFailure(error, GENERIC_INVALID_CREDENTIALS))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSecondFactorSubmit = async (
    event: SyntheticEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault()

    if (submitting) {
      return
    }

    setSecondFactorAttempted(true)
    setSecondFactorMessage(null)

    if (secondFactorCode.trim() === '' || challengeToken === null) {
      return
    }

    setSubmitting(true)

    try {
      const outcome = await completeSecondFactorFn(
        values.identifier,
        challengeToken,
        secondFactorCode.trim(),
      )

      applyOutcome(outcome)
    } catch (error: unknown) {
      setSecondFactorMessage(describeFailure(error, GENERIC_SECOND_FACTOR_REJECTED))
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
        <Link to="/" className="text-sm font-medium text-muted hover:text-ink">
          ← Volver al menú
        </Link>

        <div className="mt-4">
          <NexusBrandHeader />
        </div>

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

          {stage === 'secondFactor' && (
            <div>
              <h1 className="text-2xl font-semibold text-ink">Verificación adicional</h1>
              <p className="mt-2 text-sm text-muted">
                {secondFactorPrompt(secondFactorMethod)} Las operaciones administrativas quedan
                deshabilitadas hasta verificarlo.
              </p>

              <form
                noValidate
                onSubmit={(event) => void handleSecondFactorSubmit(event)}
                className="mt-6 space-y-5"
              >
                {secondFactorAttempted && secondFactorCode.trim() === '' && (
                  <div role="alert" className="border-l-2 border-danger pl-3">
                    <p className="text-sm font-semibold text-ink">{MESSAGES.summaryTitle}</p>
                    <p className="mt-0.5 text-sm text-muted">{MESSAGES.summaryBody}</p>
                  </div>
                )}

                {secondFactorMessage !== null && (
                  <p role="alert" className="border-l-2 border-danger pl-3 text-sm text-danger">
                    {secondFactorMessage}
                  </p>
                )}

                <Field
                  id="second-factor-code"
                  label="Código de verificación"
                  {...(secondFactorAttempted && secondFactorCode.trim() === ''
                    ? { error: 'Ingresa el código que recibiste por correo.' }
                    : {})}
                >
                  {(field) => (
                    <input
                      {...field}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={secondFactorCode}
                      onChange={(event) => {
                        setSecondFactorCode(event.target.value)
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
