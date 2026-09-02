import { useState } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'
import { Link } from 'react-router'
import clsx from 'clsx'

import { Button } from '@/components/ui/Button'
import { NexusBrandHeader } from '@/components/ui/NexusBrandHeader'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { HttpError } from '@/lib/http'
import {
  resetRecoveryPassword,
  startRecovery,
  verifyRecoveryAnswers,
  verifyRecoveryCode,
  type RecoveryQuestion,
} from './api'
import {
  RECOVERY_FIELD,
  RECOVERY_MESSAGES,
  answerFieldId,
  hasErrors,
  validateAnswersStep,
  validateCodeStep,
  validateEmailStep,
  validatePasswordStep,
} from './validation'

type Step = 'identify' | 'questions' | 'code' | 'password' | 'done'

const STEPS: readonly { readonly id: Exclude<Step, 'done'>; readonly label: string }[] = [
  { id: 'identify', label: '1. Identificación' },
  { id: 'questions', label: '2. Preguntas' },
  { id: 'code', label: '3. Código' },
  { id: 'password', label: '4. Contraseña' },
]

const CONTROL_CLASS =
  'block w-full min-w-0 rounded-md border bg-[var(--nb-field)] px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand'

const Field = ({
  id,
  label,
  hint,
  error,
  children,
}: {
  readonly id: string
  readonly label: string
  readonly hint?: string
  readonly error?: string
  readonly children: (props: {
    readonly id: string
    readonly 'aria-invalid': boolean
    readonly 'aria-describedby': string | undefined
    readonly className: string
  }) => ReactNode
}): React.JSX.Element => {
  const describedBy = [
    hint === undefined ? null : `${id}-hint`,
    error === undefined ? null : `${id}-error`,
  ]
    .filter((value) => value !== null)
    .join(' ')

  return (
    <div className="w-full min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="mt-1.5">
        {children({
          id,
          'aria-invalid': error !== undefined,
          'aria-describedby': describedBy === '' ? undefined : describedBy,
          className: clsx(CONTROL_CLASS, error === undefined ? 'border-border' : 'border-danger'),
        })}
      </div>
      {hint !== undefined && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

const describeFailure = (error: unknown): string =>
  error instanceof HttpError && error.isClientError
    ? RECOVERY_MESSAGES.rejected
    : RECOVERY_MESSAGES.service

export interface RecoveryPageProps {
  readonly startRecoveryFn?: typeof startRecovery
  readonly verifyAnswersFn?: typeof verifyRecoveryAnswers
  readonly verifyCodeFn?: typeof verifyRecoveryCode
  readonly resetPasswordFn?: typeof resetRecoveryPassword
}

export const RecoveryPage = ({
  startRecoveryFn = startRecovery,
  verifyAnswersFn = verifyRecoveryAnswers,
  verifyCodeFn = verifyRecoveryCode,
  resetPasswordFn = resetRecoveryPassword,
}: RecoveryPageProps = {}): React.JSX.Element => {
  const [step, setStep] = useState<Step>('identify')
  const [email, setEmail] = useState('')
  const [challengeToken, setChallengeToken] = useState<string | null>(null)
  const [questions, setQuestions] = useState<readonly RecoveryQuestion[]>([])
  const [answers, setAnswers] = useState<Readonly<Record<string, string>>>({})
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Calculados una vez por render, no en cada `Field`: `validateEmailStep`/
  // `validateCodeStep` llamados dos veces (una para comprobar, otra para el
  // valor) devolverian expresiones distintas para TypeScript, que entonces no
  // puede angostar el `string | undefined` a `string` bajo
  // `exactOptionalPropertyTypes`.
  const emailError = attempted ? validateEmailStep(email) : undefined
  const codeError = attempted ? validateCodeStep(code) : undefined
  const passwordErrors = attempted ? validatePasswordStep(password, confirm) : {}

  const handleIdentify = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setAttempted(true)
    setMessage(null)

    if (validateEmailStep(email) !== undefined || submitting) {
      return
    }

    setSubmitting(true)

    try {
      const result = await startRecoveryFn(email.trim())
      setChallengeToken(result.challengeToken)
      setQuestions(result.questions)
      setAttempted(false)
      setStep('questions')
    } catch (error: unknown) {
      setMessage(describeFailure(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAnswers = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setAttempted(true)
    setMessage(null)

    if (
      hasErrors(validateAnswersStep(questions, answers)) ||
      challengeToken === null ||
      submitting
    ) {
      return
    }

    setSubmitting(true)

    try {
      await verifyAnswersFn(
        challengeToken,
        questions.map((question) => ({
          questionId: question.id,
          answer: answers[question.id] ?? '',
        })),
      )
      setAttempted(false)
      setStep('code')
    } catch (error: unknown) {
      setMessage(describeFailure(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCode = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setAttempted(true)
    setMessage(null)

    if (validateCodeStep(code) !== undefined || challengeToken === null || submitting) {
      return
    }

    setSubmitting(true)

    try {
      await verifyCodeFn(challengeToken, code.trim())
      setAttempted(false)
      setStep('password')
    } catch (error: unknown) {
      setMessage(describeFailure(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePassword = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setAttempted(true)
    setMessage(null)

    if (
      hasErrors(validatePasswordStep(password, confirm)) ||
      challengeToken === null ||
      submitting
    ) {
      return
    }

    setSubmitting(true)

    try {
      await resetPasswordFn(challengeToken, password)
      setStep('done')
    } catch (error: unknown) {
      setMessage(describeFailure(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh px-4 py-8 text-ink sm:px-6">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <NexusBrandHeader />

        <nav
          aria-label="Progreso de recuperación"
          className="flex flex-wrap gap-x-3 gap-y-1 text-xs"
        >
          {STEPS.map((item) => (
            <span
              key={item.id}
              className={clsx(
                'font-semibold',
                item.id === step ? 'border-b-2 border-brand text-ink' : 'text-muted',
              )}
            >
              {item.label}
            </span>
          ))}
        </nav>

        {step === 'identify' && (
          <form noValidate onSubmit={(event) => void handleIdentify(event)} className="space-y-5">
            <div>
              <p className="text-xs text-muted">Inicio ›</p>
              <h1 className="mt-2 text-2xl font-semibold text-ink">Recuperar contraseña</h1>
              <p className="mt-2 text-sm text-muted">
                Ingresa el correo asociado a tu cuenta para continuar.
              </p>
            </div>
            {message !== null && (
              <p role="alert" className="text-sm text-danger">
                {message}
              </p>
            )}
            <Field
              id={RECOVERY_FIELD.email}
              label="Correo electrónico"
              hint="Ingresa el correo asociado a tu cuenta para continuar."
              {...(emailError === undefined ? {} : { error: emailError })}
            >
              {(props) => (
                <input
                  {...props}
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@correo.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                  }}
                />
              )}
            </Field>
            <Button type="submit" loading={submitting} className="w-full">
              Continuar
            </Button>
            <Link to="/login" className="inline-block text-sm font-medium text-brand underline">
              Volver a iniciar sesión
            </Link>
          </form>
        )}

        {step === 'questions' && (
          <form noValidate onSubmit={(event) => void handleAnswers(event)} className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Recuperar contraseña</h1>
              <p className="mt-2 text-sm text-muted">
                Responde las preguntas de seguridad que configuraste en tu registro.
              </p>
            </div>
            {message !== null && (
              <p role="alert" className="text-sm text-danger">
                {message}
              </p>
            )}
            {questions.map((question, index) => {
              const fieldId = answerFieldId(question.id)
              const errors = attempted ? validateAnswersStep(questions, answers) : {}

              return (
                <Field
                  key={question.id}
                  id={fieldId}
                  label={`Pregunta ${String(index + 1)}`}
                  hint={question.statement}
                  {...(errors[fieldId] === undefined ? {} : { error: errors[fieldId] })}
                >
                  {(props) => (
                    <input
                      {...props}
                      type="text"
                      autoComplete="off"
                      placeholder="Escribe tu respuesta"
                      value={answers[question.id] ?? ''}
                      onChange={(event) => {
                        setAnswers((previous) => ({
                          ...previous,
                          [question.id]: event.target.value,
                        }))
                      }}
                    />
                  )}
                </Field>
              )
            })}
            <Button type="submit" loading={submitting} className="w-full">
              Continuar
            </Button>
          </form>
        )}

        {step === 'code' && (
          <form noValidate onSubmit={(event) => void handleCode(event)} className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Recuperar contraseña</h1>
              <p className="mt-2 text-sm text-muted">
                Enviamos un código de un solo uso a tu correo registrado.
              </p>
            </div>
            {message !== null && (
              <p role="alert" className="text-sm text-danger">
                {message}
              </p>
            )}
            <Field
              id={RECOVERY_FIELD.code}
              label="Código de verificación"
              hint="Ingresa el código enviado a tu correo registrado."
              {...(codeError === undefined ? {} : { error: codeError })}
            >
              {(props) => (
                <input
                  {...props}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Ingresa el código recibido por correo"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value)
                  }}
                />
              )}
            </Field>
            <Button type="submit" loading={submitting} className="w-full">
              Continuar
            </Button>
          </form>
        )}

        {step === 'password' && (
          <form noValidate onSubmit={(event) => void handlePassword(event)} className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Recuperar contraseña</h1>
              <p className="mt-2 text-sm text-muted">
                Ambas validaciones fueron exitosas. Define tu nueva contraseña.
              </p>
            </div>
            {message !== null && (
              <p role="alert" className="text-sm text-danger">
                {message}
              </p>
            )}
            <Field
              id={RECOVERY_FIELD.password}
              label="Nueva contraseña"
              hint="Debe incluir mayúscula, minúscula, número y símbolo."
              {...(passwordErrors[RECOVERY_FIELD.password] === undefined
                ? {}
                : { error: passwordErrors[RECOVERY_FIELD.password] })}
            >
              {(props) => (
                <input
                  {...props}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 9 caracteres"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                  }}
                />
              )}
            </Field>
            <Field
              id={RECOVERY_FIELD.confirm}
              label="Confirmar nueva contraseña"
              {...(passwordErrors[RECOVERY_FIELD.confirm] === undefined
                ? {}
                : { error: passwordErrors[RECOVERY_FIELD.confirm] })}
            >
              {(props) => (
                <input
                  {...props}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repite tu nueva contraseña"
                  value={confirm}
                  onChange={(event) => {
                    setConfirm(event.target.value)
                  }}
                />
              )}
            </Field>
            <Button type="submit" loading={submitting} className="w-full">
              Guardar nueva contraseña
            </Button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold text-ink">Contraseña actualizada</h1>
            <p className="text-sm text-muted">Ya puedes iniciar sesión con tu nueva contraseña.</p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
