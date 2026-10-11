import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'

import { AuthField } from '@/components/auth/AuthField'
import { AuthPixelIcon } from '@/components/auth/AuthPixelIcon'
import { AuthScene } from '@/components/auth/AuthScene'
import { HeroParade, type HeroParadeMood } from '@/components/auth/HeroParade'
import { PasswordRequirements } from '@/components/auth/PasswordRequirements'
import {
  AUTH_STEP_SEALS,
  authAvatarFrame,
  authStepSeals,
  type AuthStepSeal,
} from '@/components/auth/authRemasterAssets'
import { Button } from '@/components/ui/Button'
import { PasswordField } from '@/components/ui/PasswordField'
import { useLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'
import { useTheme } from '@/shared/theme'
import { LEGAL_DOCUMENTS, SECURITY_QUESTIONS } from './constants'
import { confirmRegistration, registerAccount } from './api'
import { passwordRequirements } from './passwordRequirements'
import {
  EMPTY_VALUES,
  FIELD,
  MESSAGES,
  NICKNAME_MAX_LENGTH,
  hasErrors,
  securityFieldId,
  validateRegistration,
  type RegistrationErrors,
  type RegistrationValues,
} from './validation'

/**
 * El tema lo gobierna la fuente unica global (`@/shared/theme`) a traves de
 * `ThemeToggle`. Aqui no se persiste nada del formulario: ni la contrasena, ni
 * el avatar, ni las respuestas de seguridad tocan el almacenamiento del
 * navegador. El asistente guarda lo escrito solo en memoria, asi volver a un
 * paso anterior no borra nada.
 */
type StepId = AuthStepSeal

const STEPS: readonly StepId[] = AUTH_STEP_SEALS

/** Que campos valida cada paso antes de dejar avanzar. */
const STEP_FIELDS: Readonly<Record<StepId, readonly string[]>> = {
  personal: [FIELD.firstName, FIELD.lastName, FIELD.email, FIELD.nickname, FIELD.password],
  avatar: [FIELD.avatar],
  security: SECURITY_QUESTIONS.map((question) => securityFieldId(question.id)),
  terms: [FIELD.terms],
}

const stepOfField = (field: string): number =>
  STEPS.findIndex((step) => STEP_FIELDS[step].includes(field))

/** Fila de dos campos que se apila en una sola columna cuando falta espacio. */
const FieldRow = ({ children }: { readonly children: React.ReactNode }): React.JSX.Element => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
)

interface ConfirmationStepProps {
  readonly email: string
  readonly code: string
  readonly onCodeChange: (value: string) => void
  readonly onConfirm: () => void
  readonly confirming: boolean
  readonly confirmed: boolean
  readonly failure: string | null
  readonly onGoToLogin: () => void
}

/**
 * Ultimo paso del alta: confirmar el correo con el codigo que el proveedor
 * envio al buzon.
 *
 * Es una pantalla distinta, no un aviso al pie del formulario: el registro ya se
 * acepto y lo unico que queda es el codigo. Mostrar de nuevo el formulario
 * entero invitaria a reenviarlo, que crearia un segundo intento con el mismo
 * correo -y ese choca contra la identidad ya creada-.
 */
const ConfirmationStep = ({
  email,
  code,
  onCodeChange,
  onConfirm,
  confirming,
  confirmed,
  failure,
  onGoToLogin,
}: ConfirmationStepProps): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <div className="auth-stage mx-auto max-w-md">
      {confirmed ? (
        <div className="space-y-5 text-center">
          <AuthPixelIcon icon="check" size="xl" className="mx-auto" />
          <h1 className="auth-title">{t('account:registration.activatedTitle')}</h1>
          <p role="status" className="auth-notice">
            {t('account:registration.activatedBody')}
          </p>
          <div className="flex justify-center">
            <Button variant="auth-primary" onClick={onGoToLogin}>
              {t('account:registration.goToLogin')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <AuthPixelIcon icon="mail" size="xl" className="mx-auto" />
          <h1 className="auth-title mt-2 text-center">{t('account:registration.confirmTitle')}</h1>
          <p className="auth-subtitle mx-auto max-w-sm text-center">
            {t('account:registration.confirmSentBefore')}{' '}
            <span className="font-semibold">{email}</span>
            {t('account:registration.confirmSentAfter')}
          </p>

          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              onConfirm()
            }}
            className="mt-6 space-y-4"
          >
            {failure !== null && (
              <p role="alert" className="auth-alert">
                {failure}
              </p>
            )}

            <AuthField
              id="confirmation-code"
              label={t('account:registration.code')}
              hint={t('account:registration.codeHint')}
              required
            >
              {(field) => (
                <div className="auth-code">
                  <input
                    {...field}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => {
                      onCodeChange(event.target.value)
                    }}
                  />
                </div>
              )}
            </AuthField>

            <div className="flex justify-end">
              <Button type="submit" variant="auth-primary" loading={confirming}>
                {t('account:registration.confirm')}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

/**
 * Indicador del asistente: un sello por paso. Es navegacion de solo lectura
 * (los pasos se recorren con Continuar/Atras, que validan), y anuncia el paso
 * actual con `aria-current="step"`.
 */
const StepSeals = ({ current }: { readonly current: number }): React.JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme((state) => state.theme)
  return (
    <ol aria-label={t('account:registration.stepsLabel')} className="auth-steps">
      {STEPS.map((step, index) => (
        <li
          key={step}
          className="auth-step"
          aria-current={index === current ? 'step' : undefined}
          data-state={index < current ? 'done' : index === current ? 'current' : 'pending'}
        >
          <img src={authStepSeals[step][theme]} alt="" aria-hidden="true" />
          {index < current && <AuthPixelIcon icon="check" size="sm" className="auth-step-check" />}
          <span>
            <span className="sr-only">
              {t('account:registration.stepCounter', {
                current: String(index + 1),
                total: String(STEPS.length),
              })}
              {': '}
            </span>
            {t(`account:registration.steps.${step}`)}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Vista previa del avatar dentro del marco del kit. La URL se libera al cambiar. */
const AvatarPreview = ({ file }: { readonly file: File | null }): React.JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme((state) => state.theme)
  const url = useMemo(
    () =>
      file !== null && file.type.startsWith('image/') && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(file)
        : null,
    [file],
  )

  useEffect(
    () => () => {
      if (url !== null) URL.revokeObjectURL(url)
    },
    [url],
  )

  return (
    <div className="auth-avatar-preview">
      {url === null ? (
        <span className="auth-avatar-empty">
          <AuthPixelIcon icon="portrait" size="xl" />
        </span>
      ) : (
        <img
          src={url}
          alt={t('account:registration.avatarPreview')}
          className="auth-avatar-photo"
        />
      )}
      <img src={authAvatarFrame[theme]} alt="" aria-hidden="true" className="auth-avatar-frame" />
    </div>
  )
}

export interface RegistrationPageProps {
  /** Transporte del registro. Se inyecta para poder ejercitar el envio sin red. */
  readonly onSubmit?: (values: RegistrationValues) => Promise<void>
  /**
   * Transporte de la confirmacion por codigo (segundo paso del alta). Se inyecta
   * igual que `onSubmit` para ejercitar la pantalla sin red.
   */
  readonly onConfirm?: (identifier: string, code: string) => Promise<void>
}

/**
 * HU-01 — Registro de cuenta de jugador, como asistente de cuatro pasos
 * (remaster EN-031): datos, avatar, preguntas de seguridad y terminos. Despues
 * llega la confirmacion del correo.
 *
 * Es una pantalla **publica** y se monta fuera de `AppLayout`: quien todavia no
 * tiene cuenta no puede tener catalogo, inventario ni pedidos.
 *
 * Mismas reglas que el formulario de una sola pagina: cada paso valida solo sus
 * campos antes de avanzar, y el envio final vuelve a validar TODO con
 * `validateRegistration`. Los errores no aparecen mientras se escribe por
 * primera vez: un campo vacio que aun no se ha tocado no esta mal, esta sin
 * empezar.
 */
export const RegistrationPage = ({
  onSubmit = registerAccount,
  onConfirm = confirmRegistration,
}: RegistrationPageProps = {}): React.JSX.Element => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)

  const [values, setValues] = useState<RegistrationValues>(EMPTY_VALUES)
  const [touched, setTouched] = useState<Readonly<Record<string, boolean>>>({})
  const [step, setStep] = useState(0)
  // Pasos en los que ya se intento avanzar (o enviar): sus errores se ven.
  const [checkedSteps, setCheckedSteps] = useState<ReadonlySet<number>>(new Set())
  const [sending, setSending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [unavailableDocument, setUnavailableDocument] = useState<string | null>(null)
  const [parade, setParade] = useState<{ readonly mood: HeroParadeMood; readonly beat: number }>({
    mood: 'idle',
    beat: 0,
  })

  // Segundo paso del alta. `pendingEmail` distinto de null significa que el
  // registro fue aceptado y la cuenta espera el codigo que el proveedor envio al
  // correo; `confirmed` significa que ya se activo.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmFailure, setConfirmFailure] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const summaryRef = useRef<HTMLDivElement>(null)
  const [focusSummaryToken, setFocusSummaryToken] = useState(0)

  const errors = useMemo(() => validateRegistration(values), [values])

  const visible: RegistrationErrors = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(errors).filter(
          ([field]) => touched[field] === true || checkedSteps.has(stepOfField(field)),
        ),
      ),
    [errors, touched, checkedSteps],
  )

  const bump = (mood: HeroParadeMood): void => {
    setParade((previous) => ({ mood, beat: previous.beat + 1 }))
  }

  const markTouched = (field: string): void => {
    setTouched((previous) => ({ ...previous, [field]: true }))
  }

  const setValue = <K extends keyof RegistrationValues>(
    key: K,
    value: RegistrationValues[K],
  ): void => {
    bump('typing')
    setValues((previous) => ({ ...previous, [key]: value }))
  }

  const currentStep = STEPS[step] ?? 'personal'
  const stepIssues = Object.entries(errors).filter(
    ([field]) => checkedSteps.has(step) && STEP_FIELDS[currentStep].includes(field),
  )

  const checkStep = (index: number): void => {
    setCheckedSteps((previous) => new Set([...previous, index]))
  }

  /** Avanza solo si el paso actual no tiene errores; si los tiene, los muestra. */
  const handleNext = (): void => {
    checkStep(step)
    if (STEP_FIELDS[currentStep].some((field) => errors[field] !== undefined)) {
      bump('error')
      setFocusSummaryToken((token) => token + 1)
      return
    }
    setStep((index) => index + 1)
  }

  const handleSubmit = async (): Promise<void> => {
    // Un segundo envio mientras el primero esta en curso crearia dos cuentas
    // con el mismo correo. La guarda va antes que cualquier otra cosa.
    if (sending) {
      return
    }

    setFailure(null)

    if (hasErrors(errors)) {
      // El envio valida TODO: si un paso anterior quedo invalido (por ejemplo,
      // tras volver atras y borrar un dato), se lleva a ese paso con sus
      // errores a la vista.
      const firstInvalid = STEPS.findIndex((candidate) =>
        STEP_FIELDS[candidate].some((field) => errors[field] !== undefined),
      )
      checkStep(firstInvalid)
      setStep(firstInvalid)
      bump('error')
      setFocusSummaryToken((token) => token + 1)
      return
    }

    setSending(true)

    try {
      await onSubmit(values)
      // El alta quedo aceptada pero PENDIENTE: el proveedor envio un codigo al
      // correo y la cuenta no se activa hasta confirmarlo.
      setPendingEmail(values.email)
    } catch (error: unknown) {
      bump('error')
      setFailure(
        error instanceof Error
          ? describeFailure(error, t, language)
          : t('account:registration.failed'),
      )
    } finally {
      setSending(false)
    }
  }

  const handleConfirm = async (): Promise<void> => {
    if (confirming || pendingEmail === null) {
      return
    }

    setConfirmFailure(null)

    if (code.trim() === '') {
      setConfirmFailure(t('account:registration.codeRequired'))
      return
    }

    setConfirming(true)

    try {
      await onConfirm(pendingEmail, code.trim())
      setConfirmed(true)
      bump('success')
    } catch (error: unknown) {
      bump('error')
      setConfirmFailure(
        error instanceof Error
          ? describeFailure(error, t, language)
          : t('account:registration.confirmFailed'),
      )
    } finally {
      setConfirming(false)
    }
  }

  // Se dispara solo cuando `focusSummaryToken` cambia (cada intento invalido),
  // ya con el resumen confirmado en el DOM.
  useEffect(() => {
    if (focusSummaryToken > 0) {
      summaryRef.current?.focus()
    }
  }, [focusSummaryToken])

  const isLast = step === STEPS.length - 1

  return (
    <AuthScene
      scene="oath"
      width="xl"
      back={{ to: '/', label: t('account:registration.backToMenu') }}
      footer={<HeroParade mood={parade.mood} beat={parade.beat} />}
    >
      <main className="auth-panel mx-auto max-w-2xl pb-8">
        {pendingEmail !== null ? (
          <ConfirmationStep
            email={pendingEmail}
            code={code}
            onCodeChange={(value) => {
              bump('typing')
              setCode(value)
            }}
            onConfirm={() => {
              void handleConfirm()
            }}
            confirming={confirming}
            confirmed={confirmed}
            failure={confirmFailure}
            onGoToLogin={() => {
              void navigate('/login')
            }}
          />
        ) : (
          <>
            <h1 className="auth-title text-center">{t('account:registration.title')}</h1>
            <p className="auth-subtitle mx-auto max-w-lg text-center">
              {t('account:registration.subtitle')}
            </p>

            <div className="mt-5">
              <StepSeals current={step} />
            </div>

            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                if (isLast) {
                  void handleSubmit()
                } else {
                  handleNext()
                }
              }}
              className="mt-6 space-y-5"
            >
              {stepIssues.length > 0 && (
                <div ref={summaryRef} role="alert" tabIndex={-1} className="auth-alert">
                  <p className="font-semibold">{t('account:registration.summary')}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {stepIssues.map(([field, message]) => (
                      <li key={field}>
                        <a href={`#${field}`} className="underline">
                          {message}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {failure !== null && (
                <p role="alert" className="auth-alert">
                  {failure}
                </p>
              )}

              {currentStep === 'personal' && (
                <section key="personal" className="auth-section auth-stage space-y-4">
                  <h2 className="auth-section-title">
                    <AuthPixelIcon icon="user" size="sm" />
                    {t('account:registration.personal')}
                  </h2>
                  <FieldRow>
                    <AuthField
                      id={FIELD.firstName}
                      label={t('account:registration.firstNames')}
                      hint={t('account:registration.requiredHint')}
                      required
                      {...(visible[FIELD.firstName] === undefined
                        ? {}
                        : { error: visible[FIELD.firstName] })}
                    >
                      {(field) => (
                        <input
                          {...field}
                          type="text"
                          autoComplete="given-name"
                          value={values.firstName}
                          onBlur={() => {
                            markTouched(FIELD.firstName)
                          }}
                          onChange={(event) => {
                            setValue('firstName', event.target.value)
                          }}
                        />
                      )}
                    </AuthField>

                    <AuthField
                      id={FIELD.lastName}
                      label={t('account:registration.lastNames')}
                      hint={t('account:registration.requiredHint')}
                      required
                      {...(visible[FIELD.lastName] === undefined
                        ? {}
                        : { error: visible[FIELD.lastName] })}
                    >
                      {(field) => (
                        <input
                          {...field}
                          type="text"
                          autoComplete="family-name"
                          value={values.lastName}
                          onBlur={() => {
                            markTouched(FIELD.lastName)
                          }}
                          onChange={(event) => {
                            setValue('lastName', event.target.value)
                          }}
                        />
                      )}
                    </AuthField>
                  </FieldRow>

                  <FieldRow>
                    <AuthField
                      id={FIELD.email}
                      label={t('account:registration.email')}
                      hint={t('account:registration.emailHint')}
                      required
                      {...(visible[FIELD.email] === undefined
                        ? {}
                        : { error: visible[FIELD.email] })}
                    >
                      {(field) => (
                        <input
                          {...field}
                          type="email"
                          autoComplete="email"
                          value={values.email}
                          onBlur={() => {
                            markTouched(FIELD.email)
                          }}
                          onChange={(event) => {
                            setValue('email', event.target.value)
                          }}
                        />
                      )}
                    </AuthField>

                    <AuthField
                      id={FIELD.nickname}
                      label={t('account:registration.nickname')}
                      hint={t('account:registration.nicknameHint')}
                      counter={t('account:registration.nicknameCounter', {
                        current: String(values.nickname.length),
                        max: String(NICKNAME_MAX_LENGTH),
                      })}
                      required
                      {...(visible[FIELD.nickname] === undefined
                        ? {}
                        : { error: visible[FIELD.nickname] })}
                    >
                      {(field) => (
                        <input
                          {...field}
                          type="text"
                          autoComplete="nickname"
                          // Se impide al escribir y ademas se valida: `maxLength`
                          // no cubre un valor pegado por script.
                          maxLength={NICKNAME_MAX_LENGTH}
                          value={values.nickname}
                          onBlur={() => {
                            markTouched(FIELD.nickname)
                          }}
                          onChange={(event) => {
                            setValue('nickname', event.target.value)
                          }}
                        />
                      )}
                    </AuthField>
                  </FieldRow>

                  <AuthField
                    id={FIELD.password}
                    label={t('account:registration.password')}
                    hint={t('account:registration.passwordHint')}
                    required
                    {...(visible[FIELD.password] === undefined
                      ? {}
                      : { error: visible[FIELD.password] })}
                  >
                    {(field) => (
                      <PasswordField
                        {...field}
                        autoComplete="new-password"
                        value={values.password}
                        eyeIcon={<AuthPixelIcon icon="eye" size="sm" />}
                        eyeOffIcon={<AuthPixelIcon icon="eye-off" size="sm" />}
                        onBlur={() => {
                          markTouched(FIELD.password)
                        }}
                        onChange={(event) => {
                          setValue('password', event.target.value)
                        }}
                      />
                    )}
                  </AuthField>
                  <PasswordRequirements
                    id="password-requirements"
                    requirements={passwordRequirements(values.password, t)}
                  />
                </section>
              )}

              {currentStep === 'avatar' && (
                <section key="avatar" className="auth-section auth-stage">
                  <h2 className="auth-section-title">
                    <AuthPixelIcon icon="portrait" size="sm" />
                    {t('account:registration.avatarSection')}
                  </h2>
                  <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    <AvatarPreview file={values.avatar} />
                    <div className="w-full min-w-0">
                      <AuthField
                        id={FIELD.avatar}
                        label={t('account:registration.avatar')}
                        hint={t('account:registration.avatarHint')}
                        required
                        {...(visible[FIELD.avatar] === undefined
                          ? {}
                          : { error: visible[FIELD.avatar] })}
                      >
                        {(field) => (
                          <input
                            {...field}
                            type="file"
                            // `accept` filtra el dialogo del sistema pero NO
                            // valida: el tipo se comprueba igualmente.
                            accept="image/*"
                            onChange={(event) => {
                              markTouched(FIELD.avatar)
                              setValue('avatar', event.target.files?.[0] ?? null)
                            }}
                          />
                        )}
                      </AuthField>

                      {values.avatar !== null && (
                        <p className="auth-hint mt-1.5 truncate">
                          {t('account:registration.avatarSelected', {
                            name: values.avatar.name,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {currentStep === 'security' && (
                <section key="security" className="auth-section auth-stage">
                  <h2 className="auth-section-title">
                    <AuthPixelIcon icon="shield" size="sm" />
                    {t('account:registration.securitySection')}
                  </h2>
                  <p className="auth-hint mt-1">{t('account:registration.securityDescription')}</p>
                  {/*
                    Una columna: con dos, una pregunta que envuelve a dos lineas
                    empuja su input mas abajo que el de la columna vecina.
                  */}
                  <div className="mt-3 space-y-5">
                    {SECURITY_QUESTIONS.map((question) => {
                      const id = securityFieldId(question.id)

                      return (
                        <AuthField
                          key={question.id}
                          id={id}
                          label={question.label}
                          required
                          {...(visible[id] === undefined ? {} : { error: visible[id] })}
                        >
                          {(field) => (
                            <input
                              {...field}
                              type="text"
                              autoComplete="off"
                              value={values.securityAnswers[question.id] ?? ''}
                              onBlur={() => {
                                markTouched(id)
                              }}
                              onChange={(event) => {
                                bump('typing')
                                setValues((previous) => ({
                                  ...previous,
                                  securityAnswers: {
                                    ...previous.securityAnswers,
                                    [question.id]: event.target.value,
                                  },
                                }))
                              }}
                            />
                          )}
                        </AuthField>
                      )
                    })}
                  </div>
                </section>
              )}

              {currentStep === 'terms' && (
                <section key="terms" className="auth-section auth-stage">
                  <h2 className="auth-section-title">
                    <AuthPixelIcon icon="scroll" size="sm" />
                    {t('account:registration.steps.terms')}
                  </h2>
                  <div className="mt-3 flex items-start gap-3">
                    <input
                      id={FIELD.terms}
                      type="checkbox"
                      checked={values.acceptedTerms}
                      aria-required
                      aria-invalid={visible[FIELD.terms] !== undefined}
                      aria-describedby={
                        visible[FIELD.terms] === undefined ? undefined : `${FIELD.terms}-error`
                      }
                      onChange={(event) => {
                        markTouched(FIELD.terms)
                        setValue('acceptedTerms', event.target.checked)
                      }}
                      className="mt-0.5 size-4 shrink-0"
                    />
                    <label htmlFor={FIELD.terms} className="text-sm">
                      {t('account:registration.terms')}
                    </label>
                  </div>

                  {/*
                    Los documentos van fuera de la etiqueta: una `label` no puede
                    contener otro control sin dejar ambiguo que activa cada clic.
                    Mientras un documento no exista, su control lo dice en lugar de
                    abrir un destino inventado.
                  */}
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-7 text-sm">
                    {LEGAL_DOCUMENTS.map((document) =>
                      document.href === null ? (
                        <button
                          key={document.id}
                          type="button"
                          className="auth-link"
                          onClick={() => {
                            setUnavailableDocument(document.label)
                          }}
                        >
                          {document.label}
                        </button>
                      ) : (
                        <a
                          key={document.id}
                          href={document.href}
                          target="_blank"
                          rel="noreferrer"
                          className="auth-link"
                        >
                          {document.label}
                        </a>
                      ),
                    )}
                  </p>

                  {unavailableDocument !== null && (
                    <p role="status" className="auth-hint mt-2 pl-7">
                      {t('account:registration.documentUnavailable', {
                        document: unavailableDocument,
                      })}
                    </p>
                  )}

                  {visible[FIELD.terms] !== undefined && (
                    <p id={`${FIELD.terms}-error`} className="auth-error pl-7">
                      <span aria-hidden="true" className="font-bold leading-5">
                        !
                      </span>
                      <span>{MESSAGES.terms}</span>
                    </p>
                  )}
                </section>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="auth-secondary"
                  onClick={() => {
                    void navigate('/')
                  }}
                >
                  {t('common:cancel')}
                </Button>
                <div className="flex flex-wrap gap-3">
                  {step > 0 && (
                    <Button
                      variant="auth-secondary"
                      onClick={() => {
                        setStep((index) => index - 1)
                      }}
                    >
                      {t('account:registration.back')}
                    </Button>
                  )}
                  <Button type="submit" variant="auth-primary" loading={isLast && sending}>
                    {isLast ? t('account:registration.submit') : t('account:registration.next')}
                  </Button>
                </div>
              </div>
            </form>
          </>
        )}
      </main>
    </AuthScene>
  )
}
