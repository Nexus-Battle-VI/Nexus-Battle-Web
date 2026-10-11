import { useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'

import { AuthField } from '@/components/auth/AuthField'
import { AuthPixelIcon } from '@/components/auth/AuthPixelIcon'
import type { AuthIconName } from '@/components/auth/authRemasterAssets'
import { AuthScene } from '@/components/auth/AuthScene'
import { HeroParade, type HeroParadeMood } from '@/components/auth/HeroParade'
import { Button } from '@/components/ui/Button'
import { PasswordField } from '@/components/ui/PasswordField'
import { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'
import { roleLabel } from '@/shared/rbac'
import { ECOMMERCE_PATH } from '@/routes/routes'
import {
  login,
  completeSecondFactor,
  chooseSecondFactor,
  type LoginOutcome,
  type SecondFactorMethod,
} from './api'
import {
  EMPTY_LOGIN_VALUES,
  FIELD,
  MESSAGES,
  hasErrors,
  validateLoginForm,
  type LoginFormValues,
} from './validation'

type Stage = 'credentials' | 'selection' | 'secondFactor' | 'success'

// Claves de traduccion, no textos: el estado guarda la CLAVE y la pantalla la
// traduce al pintar, asi un cambio de idioma tambien cambia el aviso visible.
const GENERIC_INVALID_CREDENTIALS = 'auth:login.invalidCredentials'

const GENERIC_SERVICE_ERROR = 'auth:login.serviceError'

const GENERIC_SECOND_FACTOR_REJECTED = 'auth:login.secondFactorRejected'

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

/** Icono de cada factor en las tarjetas de eleccion. */
const FACTOR_ICON: Readonly<Record<SecondFactorMethod, AuthIconName>> = {
  AUTHENTICATOR_APP: 'authenticator',
  EMAIL: 'mail',
  SMS: 'bell',
}

export interface LoginPageProps {
  /** Se inyectan para poder probar todos los estados sin depender de red real. */
  readonly loginFn?: typeof login
  readonly completeSecondFactorFn?: typeof completeSecondFactor
  readonly chooseSecondFactorFn?: typeof chooseSecondFactor
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
/**
 * Como se llama cada factor en la pantalla de eleccion.
 *
 * Deliberadamente NO dice nada sobre disponibilidad ni limites de entrega: la
 * pantalla ofrece lo que el proveedor ofrece, y describir aqui condiciones del
 * entorno mezclaria configuracion con interfaz.
 */
const factorLabelKey = (method: SecondFactorMethod): string => `auth:login.factors.${method}`

const factorHintKey = (method: SecondFactorMethod): string => `auth:login.factorHints.${method}`

const secondFactorPromptKey = (method: SecondFactorMethod | null): string =>
  method === null ? 'auth:login.prompt.unknown' : `auth:login.prompt.${method}`

export const LoginPage = ({
  loginFn = login,
  completeSecondFactorFn = completeSecondFactor,
  chooseSecondFactorFn = chooseSecondFactor,
}: LoginPageProps = {}): React.JSX.Element => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const establishSession = useSession((state) => state.establishSession)

  const [stage, setStage] = useState<Stage>('credentials')
  const [values, setValues] = useState<LoginFormValues>(EMPTY_LOGIN_VALUES)
  const [touched, setTouched] = useState<Readonly<Record<string, boolean>>>({})
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [challengeToken, setChallengeToken] = useState<string | null>(null)
  const [secondFactorMethod, setSecondFactorMethod] = useState<SecondFactorMethod | null>(null)
  const [availableFactors, setAvailableFactors] = useState<readonly SecondFactorMethod[]>([])
  const [secondFactorCode, setSecondFactorCode] = useState('')
  const [secondFactorAttempted, setSecondFactorAttempted] = useState(false)
  const [secondFactorMessage, setSecondFactorMessage] = useState<string | null>(null)
  const [sessionRole, setSessionRole] = useState<string | null>(null)
  // Solo el ESTADO del formulario llega al desfile de heroes, nunca valores.
  const [parade, setParade] = useState<{ readonly mood: HeroParadeMood; readonly beat: number }>({
    mood: 'idle',
    beat: 0,
  })
  const bump = (mood: HeroParadeMood): void => {
    setParade((previous) => ({ mood, beat: previous.beat + 1 }))
  }

  const errors = validateLoginForm(values)
  const visible = attempted
    ? errors
    : Object.fromEntries(Object.entries(errors).filter(([field]) => touched[field] === true))

  // Redirige tan pronto la pantalla de "acceso completado" se muestra: HU-02
  // exige que el destino sea siempre E-commerce (aclaracion del cliente), no
  // el lugar del que vino la persona: el destino nunca varia.
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
      bump('success')
      setStage('success')

      return
    }

    setChallengeToken(outcome.challengeToken)

    if (outcome.status === 'SECOND_FACTOR_SELECTION_REQUIRED') {
      setAvailableFactors(outcome.availableSecondFactors)
      setStage('selection')

      return
    }

    setSecondFactorMethod(outcome.secondFactorMethod ?? null)
    setStage('secondFactor')
  }

  /**
   * Elegir factor. NO autentica: lo que devuelve es el reto del factor
   * elegido, y por eso vuelve a pasar por `applyOutcome` como cualquier otra
   * etapa en lugar de establecer sesion aqui.
   */
  const handleFactorChoice = async (method: SecondFactorMethod): Promise<void> => {
    if (submitting || challengeToken === null) {
      return
    }

    setSubmitting(true)
    setAuthMessage(null)

    try {
      applyOutcome(await chooseSecondFactorFn(values.identifier, challengeToken, method))
    } catch (error: unknown) {
      // Mismo ayudante que las otras etapas: distingue 503 de 401 sin que esta
      // pantalla invente su propia clasificacion.
      setAuthMessage(describeFailure(error, GENERIC_INVALID_CREDENTIALS))
      setStage('credentials')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCredentialsSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (submitting) {
      return
    }

    setAttempted(true)
    setAuthMessage(null)

    if (hasErrors(errors)) {
      bump('error')
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
      bump('error')
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
      bump('error')
    } finally {
      setSubmitting(false)
    }
  }

  const showInfoSummary = attempted && hasErrors(errors)

  return (
    <AuthScene
      back={{ to: '/', label: t('auth:backToMenu') }}
      footer={<HeroParade mood={parade.mood} beat={parade.beat} />}
    >
      <main className="auth-panel">
        {stage === 'success' && (
          <div className="auth-stage text-center">
            <AuthPixelIcon icon="check" size="xl" className="mx-auto" />
            <h1 className="auth-title mt-2">{t('auth:login.successTitle')}</h1>
            <p role="status" className="auth-subtitle">
              {sessionRole !== null
                ? t('auth:login.successBodyRole', { role: roleLabel(sessionRole) })
                : t('auth:login.successBody')}
            </p>
          </div>
        )}

        {stage === 'credentials' && (
          <div className="auth-stage">
            <h1 className="auth-title">{t('auth:login.title')}</h1>
            <p className="auth-subtitle">{t('auth:login.subtitle')}</p>

            <form
              noValidate
              onSubmit={(event) => void handleCredentialsSubmit(event)}
              className="mt-6 space-y-5"
            >
              {showInfoSummary && (
                <div role="alert" className="auth-alert">
                  <p className="font-semibold">{MESSAGES.summaryTitle}</p>
                  <p className="mt-0.5">{MESSAGES.summaryBody}</p>
                </div>
              )}

              {authMessage !== null && (
                <p role="alert" className="auth-alert">
                  {t(authMessage)}
                </p>
              )}

              <AuthField
                id={FIELD.identifier}
                label={t('auth:login.identifier')}
                {...(visible[FIELD.identifier] === undefined
                  ? {}
                  : { error: visible[FIELD.identifier] })}
              >
                {(field) => (
                  <input
                    {...field}
                    type="text"
                    autoComplete="username"
                    placeholder={t('auth:login.identifierPlaceholder')}
                    value={values.identifier}
                    onBlur={() => {
                      setTouched((previous) => ({ ...previous, [FIELD.identifier]: true }))
                    }}
                    onChange={(event) => {
                      bump('typing')
                      setValues((previous) => ({ ...previous, identifier: event.target.value }))
                    }}
                  />
                )}
              </AuthField>

              <AuthField
                id={FIELD.password}
                label={t('auth:login.password')}
                {...(visible[FIELD.password] === undefined
                  ? {}
                  : { error: visible[FIELD.password] })}
              >
                {(field) => (
                  <PasswordField
                    {...field}
                    autoComplete="current-password"
                    placeholder={t('auth:login.passwordPlaceholder')}
                    value={values.password}
                    eyeIcon={<AuthPixelIcon icon="eye" size="sm" />}
                    eyeOffIcon={<AuthPixelIcon icon="eye-off" size="sm" />}
                    onBlur={() => {
                      setTouched((previous) => ({ ...previous, [FIELD.password]: true }))
                    }}
                    onChange={(event) => {
                      bump('typing')
                      setValues((previous) => ({ ...previous, password: event.target.value }))
                    }}
                  />
                )}
              </AuthField>

              {/*
                Apilados, no en fila: es el orden y la disposicion que muestra el
                Figma (cada enlace en su propia linea).
              */}
              <div className="flex flex-col items-start gap-2 text-sm">
                <Link to="/recover" className="auth-link">
                  {t('auth:login.forgot')}
                </Link>
                <Link to="/register" className="auth-link">
                  {t('auth:login.noAccount')}
                </Link>
              </div>

              <Button type="submit" variant="auth-primary" loading={submitting} className="w-full">
                {t('auth:login.submit')}
              </Button>
            </form>
          </div>
        )}

        {stage === 'selection' && (
          <div className="auth-stage">
            <h1 className="auth-title">{t('auth:login.chooseTitle')}</h1>
            <p className="auth-subtitle">{t('auth:login.chooseBody')}</p>

            <div className="mt-6 flex flex-col gap-3">
              {availableFactors.map((factor) => (
                <button
                  key={factor}
                  type="button"
                  disabled={submitting}
                  data-testid={`choose-factor-${factor}`}
                  className="auth-choice"
                  onClick={() => {
                    void handleFactorChoice(factor)
                  }}
                >
                  <AuthPixelIcon icon={FACTOR_ICON[factor]} size="lg" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{t(factorLabelKey(factor))}</span>
                    <span className="auth-hint mt-0.5 block">{t(factorHintKey(factor))}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === 'secondFactor' && (
          <div className="auth-stage">
            <h1 className="auth-title">{t('auth:login.verifyTitle')}</h1>
            <p className="auth-subtitle">
              {t(secondFactorPromptKey(secondFactorMethod))} {t('auth:login.adminLocked')}
            </p>

            <form
              noValidate
              onSubmit={(event) => void handleSecondFactorSubmit(event)}
              className="mt-6 space-y-5"
            >
              {secondFactorAttempted && secondFactorCode.trim() === '' && (
                <div role="alert" className="auth-alert">
                  <p className="font-semibold">{MESSAGES.summaryTitle}</p>
                  <p className="mt-0.5">{MESSAGES.summaryBody}</p>
                </div>
              )}

              {secondFactorMessage !== null && (
                <p role="alert" className="auth-alert">
                  {t(secondFactorMessage)}
                </p>
              )}

              <AuthField
                id="second-factor-code"
                label={t('auth:login.code')}
                {...(secondFactorAttempted && secondFactorCode.trim() === ''
                  ? { error: t('auth:login.codeRequired') }
                  : {})}
              >
                {(field) => (
                  <div className="auth-code">
                    <input
                      {...field}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={secondFactorCode}
                      onChange={(event) => {
                        bump('typing')
                        setSecondFactorCode(event.target.value)
                      }}
                    />
                  </div>
                )}
              </AuthField>

              <Button type="submit" variant="auth-primary" loading={submitting} className="w-full">
                {t('auth:login.verify')}
              </Button>
            </form>
          </div>
        )}
      </main>
    </AuthScene>
  )
}
