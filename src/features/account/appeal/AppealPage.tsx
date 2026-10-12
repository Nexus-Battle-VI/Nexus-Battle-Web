import { useState, type SyntheticEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { AuthField } from '@/components/auth/AuthField'
import { AuthPixelIcon } from '@/components/auth/AuthPixelIcon'
import { AuthScene } from '@/components/auth/AuthScene'
import { Button } from '@/components/ui/Button'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { TextField } from '@/components/ui/form/TextField'
import { formatDateTime } from '@/lib/format'
import { HttpError } from '@/lib/http'
import { queryKeys } from '@/shared/query-keys'
import { useAppealSession } from '@/shared/appealSession'
import {
  authenticateForAppeal as authenticateForAppealDefault,
  fetchMyAppeals as fetchMyAppealsDefault,
  submitAppeal as submitAppealDefault,
  type AppealAccessTokenResponse,
  type AuthenticateForAppealInput,
} from './api'
import type { AppealResponse } from '@/features/admin/sanctions/api'

type Stage = 'identify' | 'appeal'

export interface AppealPageProps {
  readonly authenticate?: typeof authenticateForAppealDefault
  readonly submit?: typeof submitAppealDefault
  readonly listAppeals?: typeof fetchMyAppealsDefault
}

const DECISION_KEY: Readonly<Record<string, string>> = {
  UPHELD: 'account:appeal.decisions.UPHELD',
  OVERTURNED: 'account:appeal.decisions.OVERTURNED',
}

/**
 * Apelacion con identidad restringida (HU-42, §6). Pantalla PUBLICA -como
 * `/login`-: una cuenta suspendida o baneada no tiene por que conservar un
 * testimonio de sesion vigente para llegar aqui.
 *
 * Usa la MISMA contrasena que el login normal, pero nunca el mismo token:
 * ver `shared/appealSession.ts`. Aunque la autenticacion sea exitosa, esta
 * pantalla jamas toca `useSession` ni `httpClient` -ninguna otra parte de la
 * aplicacion puede confundir esta identidad con una sesion completa.
 */
export const AppealPage = ({
  authenticate = authenticateForAppealDefault,
  submit = submitAppealDefault,
  listAppeals = fetchMyAppealsDefault,
}: AppealPageProps = {}): React.JSX.Element => {
  const { t } = useTranslation()
  const establishAppealSession = useAppealSession((state) => state.establish)
  const appealToken = useAppealSession((state) => state.appealToken)

  const [stage, setStage] = useState<Stage>(appealToken === null ? 'identify' : 'appeal')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  const [sanctionId, setSanctionId] = useState('')
  const [statement, setStatement] = useState('')
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [justSubmitted, setJustSubmitted] = useState<AppealResponse | null>(null)

  const appealsQuery = useQuery({
    queryKey: queryKeys.account.myAppeals,
    queryFn: ({ signal }) => listAppeals(signal),
    enabled: stage === 'appeal',
  })

  const authMutation = useMutation({
    mutationFn: (input: AuthenticateForAppealInput): Promise<AppealAccessTokenResponse> =>
      authenticate(input),
  })

  const submitMutation = useMutation({
    mutationFn: () => submit({ sanctionId: sanctionId.trim(), statement: statement.trim() }),
  })

  const handleIdentify = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault()
    setAuthMessage(null)

    authMutation.mutate(
      { identifier: identifier.trim(), password },
      {
        onSuccess: (result) => {
          establishAppealSession(result.appealToken, result.expiresIn)
          setStage('appeal')
        },
        onError: (error: unknown) => {
          // Mismo criterio que el login normal: nunca se distingue el motivo
          // exacto del 401 por el texto del mensaje.
          setAuthMessage(
            error instanceof HttpError && error.isUnauthorized
              ? t('account:appeal.identify.invalidCredentials')
              : t('account:appeal.identify.serviceError'),
          )
        },
      },
    )
  }

  const handleSubmitAppeal = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault()
    setSubmitMessage(null)

    if (sanctionId.trim().length === 0 || statement.trim().length === 0) {
      setSubmitMessage(t('account:appeal.form.required'))
      return
    }

    submitMutation.mutate(undefined, {
      onSuccess: (appeal) => {
        setJustSubmitted(appeal)
        setSanctionId('')
        setStatement('')
        void appealsQuery.refetch()
      },
      onError: (error: unknown) => {
        setSubmitMessage(
          error instanceof HttpError
            ? t('account:appeal.form.rejected')
            : t('account:appeal.identify.serviceError'),
        )
      },
    })
  }

  return (
    <AuthScene back={{ to: '/', label: t('auth:backToMenu') }}>
      <main className="auth-panel">
        {stage === 'identify' && (
          <div className="auth-stage">
            <AuthPixelIcon icon="shield" size="xl" className="mx-auto" />
            <h1 className="auth-title text-center">{t('account:appeal.identify.title')}</h1>
            <p className="auth-subtitle text-center">{t('account:appeal.identify.subtitle')}</p>

            <form
              noValidate
              onSubmit={handleIdentify}
              className="mt-6 space-y-5"
            >
              {authMessage !== null && (
                <p role="alert" className="auth-alert">
                  {authMessage}
                </p>
              )}

              <AuthField id="appeal-identifier" label={t('account:appeal.identify.identifier')}>
                {(field) => (
                  <input
                    {...field}
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(event.target.value)
                    }}
                  />
                )}
              </AuthField>

              <AuthField id="appeal-password" label={t('account:appeal.identify.password')}>
                {(field) => (
                  <PasswordField
                    {...field}
                    autoComplete="current-password"
                    value={password}
                    eyeIcon={<AuthPixelIcon icon="eye" size="sm" />}
                    eyeOffIcon={<AuthPixelIcon icon="eye-off" size="sm" />}
                    onChange={(event) => {
                      setPassword(event.target.value)
                    }}
                  />
                )}
              </AuthField>

              <Button
                type="submit"
                variant="auth-primary"
                loading={authMutation.isPending}
                className="w-full"
              >
                {t('account:appeal.identify.submit')}
              </Button>

              <p className="text-center text-sm">
                <Link to="/login" className="auth-link">
                  {t('account:appeal.identify.backToLogin')}
                </Link>
              </p>
            </form>
          </div>
        )}

        {stage === 'appeal' && (
          <div className="auth-stage">
            <AuthPixelIcon icon="scroll" size="xl" className="mx-auto" />
            <h1 className="auth-title text-center">{t('account:appeal.form.title')}</h1>
            <p className="auth-subtitle text-center">{t('account:appeal.form.subtitle')}</p>

            {justSubmitted !== null && (
              <p role="status" className="auth-alert mt-4">
                {t('account:appeal.form.submitted', { id: justSubmitted.id })}
              </p>
            )}

            {appealsQuery.isSuccess && appealsQuery.data.length > 0 && (
              <ul className="mt-4 space-y-3">
                {appealsQuery.data.map((appeal) => (
                  <li key={appeal.id} className="auth-panel rounded-lg border p-3 text-sm">
                    <p className="font-semibold">
                      {t('account:appeal.status.sanction', { id: appeal.sanctionId })}
                    </p>
                    <p className="mt-1">
                      {appeal.status === 'SUBMITTED'
                        ? t('account:appeal.status.submitted', {
                            date: formatDateTime(appeal.decisionDueAt),
                          })
                        : t('account:appeal.status.resolved', {
                            decision: t(DECISION_KEY[appeal.decision ?? 'UPHELD'] ?? ''),
                          })}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <form
              noValidate
              onSubmit={handleSubmitAppeal}
              className="mt-6 space-y-5"
            >
              <TextField
                label={t('account:appeal.form.sanctionId')}
                hint={t('account:appeal.form.sanctionIdHint')}
                value={sanctionId}
                onChange={(event) => {
                  setSanctionId(event.target.value)
                }}
                required
              />

              <TextareaField
                label={t('account:appeal.form.statement')}
                value={statement}
                onChange={(event) => {
                  setStatement(event.target.value)
                }}
                required
              />

              {submitMessage !== null && (
                <p role="alert" className="auth-alert">
                  {submitMessage}
                </p>
              )}

              <Button
                type="submit"
                variant="auth-primary"
                loading={submitMutation.isPending}
                className="w-full"
              >
                {t('account:appeal.form.submit')}
              </Button>
            </form>
          </div>
        )}
      </main>
    </AuthScene>
  )
}
