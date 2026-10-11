import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import { AuthField } from '@/components/auth/AuthField'
import { AuthPixelIcon } from '@/components/auth/AuthPixelIcon'
import type { AuthIconName } from '@/components/auth/authRemasterAssets'
import { AuthScene } from '@/components/auth/AuthScene'
import { PasswordRequirements } from '@/components/auth/PasswordRequirements'
import { Button } from '@/components/ui/Button'
import { PasswordField } from '@/components/ui/PasswordField'
import { passwordRequirements } from '@/features/account/registration/passwordRequirements'
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
  answerFieldId,
  hasErrors,
  validateAnswersStep,
  validateCodeStep,
  validateEmailStep,
  validatePasswordStep,
} from './validation'

type Step = 'identify' | 'questions' | 'code' | 'password' | 'done'

const STEPS: readonly Exclude<Step, 'done'>[] = ['identify', 'questions', 'code', 'password']

/** Icono de cada paso en el indicador de progreso. */
const STEP_ICON: Readonly<Record<Exclude<Step, 'done'>, AuthIconName>> = {
  identify: 'mail',
  questions: 'question',
  code: 'authenticator',
  password: 'key',
}

/** Clave del aviso (se traduce al pintar). */
const describeFailure = (error: unknown): string =>
  error instanceof HttpError && error.isClientError
    ? 'auth:recovery.rejected'
    : 'auth:recovery.service'

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
  const { t } = useTranslation()
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

  const stepIndex = step === 'done' ? STEPS.length : STEPS.indexOf(step)

  return (
    <AuthScene width="lg">
      <main className="auth-panel flex flex-col gap-6">
        <nav aria-label={t('auth:recovery.progress')} className="auth-steps">
          {STEPS.map((item, index) => (
            <span
              key={item}
              className="auth-step"
              aria-current={item === step ? 'step' : undefined}
              data-state={index < stepIndex ? 'done' : index === stepIndex ? 'current' : 'pending'}
            >
              <AuthPixelIcon icon={STEP_ICON[item]} size="lg" />
              {t(`auth:recovery.steps.${item}`)}
            </span>
          ))}
        </nav>

        {step === 'identify' && (
          <form
            noValidate
            onSubmit={(event) => void handleIdentify(event)}
            className="auth-stage space-y-5"
          >
            <div>
              <p className="auth-hint">{t('auth:recovery.breadcrumb')}</p>
              <h1 className="auth-title mt-2">{t('auth:recovery.title')}</h1>
              <p className="auth-subtitle">{t('auth:recovery.identifyBody')}</p>
            </div>
            {message !== null && (
              <p role="alert" className="auth-alert">
                {t(message)}
              </p>
            )}
            <AuthField
              id={RECOVERY_FIELD.email}
              label={t('auth:recovery.email')}
              hint={t('auth:recovery.identifyBody')}
              {...(emailError === undefined ? {} : { error: emailError })}
            >
              {(props) => (
                <input
                  {...props}
                  type="email"
                  autoComplete="email"
                  placeholder={t('auth:recovery.emailPlaceholder')}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                  }}
                />
              )}
            </AuthField>
            <Button type="submit" variant="auth-primary" loading={submitting} className="w-full">
              {t('auth:recovery.continue')}
            </Button>
            <Link to="/login" className="auth-link inline-block text-sm">
              {t('auth:recovery.backToLogin')}
            </Link>
          </form>
        )}

        {step === 'questions' && (
          <form
            noValidate
            onSubmit={(event) => void handleAnswers(event)}
            className="auth-stage space-y-5"
          >
            <div>
              <h1 className="auth-title">{t('auth:recovery.title')}</h1>
              <p className="auth-subtitle">{t('auth:recovery.questionsBody')}</p>
            </div>
            {message !== null && (
              <p role="alert" className="auth-alert">
                {t(message)}
              </p>
            )}
            {questions.map((question, index) => {
              const fieldId = answerFieldId(question.id)
              const errors = attempted ? validateAnswersStep(questions, answers) : {}

              return (
                <AuthField
                  key={question.id}
                  id={fieldId}
                  label={t('auth:recovery.question', { number: String(index + 1) })}
                  hint={question.statement}
                  {...(errors[fieldId] === undefined ? {} : { error: errors[fieldId] })}
                >
                  {(props) => (
                    <input
                      {...props}
                      type="text"
                      autoComplete="off"
                      placeholder={t('auth:recovery.answerPlaceholder')}
                      value={answers[question.id] ?? ''}
                      onChange={(event) => {
                        setAnswers((previous) => ({
                          ...previous,
                          [question.id]: event.target.value,
                        }))
                      }}
                    />
                  )}
                </AuthField>
              )
            })}
            <Button type="submit" variant="auth-primary" loading={submitting} className="w-full">
              {t('auth:recovery.continue')}
            </Button>
          </form>
        )}

        {step === 'code' && (
          <form
            noValidate
            onSubmit={(event) => void handleCode(event)}
            className="auth-stage space-y-5"
          >
            <div>
              <h1 className="auth-title">{t('auth:recovery.title')}</h1>
              <p className="auth-subtitle">{t('auth:recovery.codeBody')}</p>
            </div>
            {message !== null && (
              <p role="alert" className="auth-alert">
                {t(message)}
              </p>
            )}
            <AuthField
              id={RECOVERY_FIELD.code}
              label={t('auth:recovery.code')}
              hint={t('auth:recovery.codeHint')}
              {...(codeError === undefined ? {} : { error: codeError })}
            >
              {(props) => (
                <div className="auth-code">
                  <input
                    {...props}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder={t('auth:recovery.codePlaceholder')}
                    value={code}
                    onChange={(event) => {
                      setCode(event.target.value)
                    }}
                  />
                </div>
              )}
            </AuthField>
            <Button type="submit" variant="auth-primary" loading={submitting} className="w-full">
              {t('auth:recovery.continue')}
            </Button>
          </form>
        )}

        {step === 'password' && (
          <form
            noValidate
            onSubmit={(event) => void handlePassword(event)}
            className="auth-stage space-y-5"
          >
            <div>
              <h1 className="auth-title">{t('auth:recovery.title')}</h1>
              <p className="auth-subtitle">{t('auth:recovery.passwordBody')}</p>
            </div>
            {message !== null && (
              <p role="alert" className="auth-alert">
                {t(message)}
              </p>
            )}
            <AuthField
              id={RECOVERY_FIELD.password}
              label={t('auth:recovery.newPassword')}
              hint={t('auth:recovery.newPasswordHint')}
              {...(passwordErrors[RECOVERY_FIELD.password] === undefined
                ? {}
                : { error: passwordErrors[RECOVERY_FIELD.password] })}
            >
              {(props) => (
                <PasswordField
                  {...props}
                  autoComplete="new-password"
                  placeholder={t('auth:recovery.newPasswordPlaceholder')}
                  value={password}
                  eyeIcon={<AuthPixelIcon icon="eye" size="sm" />}
                  eyeOffIcon={<AuthPixelIcon icon="eye-off" size="sm" />}
                  onChange={(event) => {
                    setPassword(event.target.value)
                  }}
                />
              )}
            </AuthField>
            <PasswordRequirements
              id="recovery-password-requirements"
              requirements={passwordRequirements(password, t)}
            />
            <AuthField
              id={RECOVERY_FIELD.confirm}
              label={t('auth:recovery.confirm')}
              {...(passwordErrors[RECOVERY_FIELD.confirm] === undefined
                ? {}
                : { error: passwordErrors[RECOVERY_FIELD.confirm] })}
            >
              {(props) => (
                <input
                  {...props}
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('auth:recovery.confirmPlaceholder')}
                  value={confirm}
                  onChange={(event) => {
                    setConfirm(event.target.value)
                  }}
                />
              )}
            </AuthField>
            <Button type="submit" variant="auth-primary" loading={submitting} className="w-full">
              {t('auth:recovery.save')}
            </Button>
          </form>
        )}

        {step === 'done' && (
          <div className="auth-stage space-y-4 text-center">
            <AuthPixelIcon icon="check" size="xl" className="mx-auto" />
            <h1 className="auth-title">{t('auth:recovery.doneTitle')}</h1>
            <p className="auth-subtitle">{t('auth:recovery.doneBody')}</p>
            <Link
              to="/login"
              className="auth-btn-primary inline-flex items-center justify-center px-5 py-2 text-sm"
            >
              {t('auth:recovery.goToLogin')}
            </Link>
          </div>
        )}
      </main>
    </AuthScene>
  )
}
