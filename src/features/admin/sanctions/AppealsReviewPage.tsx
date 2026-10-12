import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { AdminPageHeader, AdminPanel } from '@/components/admin-kit'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { formatDateTime } from '@/lib/format'
import { queryKeys } from '@/shared/query-keys'
import { ResolveAppealForm, type ResolveAppealTransport } from './ResolveAppealForm'
import { fetchPendingAppeals, type AppealResponse } from './api'

export type FetchPendingAppealsTransport = typeof fetchPendingAppeals

export interface AppealsReviewPageProps {
  readonly listAppeals?: FetchPendingAppealsTransport
  readonly resolveAppeal?: ResolveAppealTransport
}

/**
 * Panel de revision de apelaciones (HU-42, §7.3.2: "revision por parte de un
 * panel de moderadores/administradores"). Alcanzable por Moderador,
 * Administrador y Super Administrador -la autoridad real sobre CADA
 * apelacion la decide Account al resolver, segun el tipo de sancion
 * apelada-.
 *
 * NO MUESTRA EL NOMBRE DEL TITULAR: Account no expone un cruce entre
 * `accountId` y nombre visible (`display-name` resuelve por sujeto, no por
 * id de cuenta). Se muestra la referencia de la sancion y de la cuenta tal
 * cual las devuelve el contrato -honesto sobre lo que el backend puede
 * resolver hoy, en vez de fingir un nombre que no existe-.
 */
export const AppealsReviewPage = ({
  listAppeals = fetchPendingAppeals,
  resolveAppeal,
}: AppealsReviewPageProps = {}): React.JSX.Element => {
  const { t } = useTranslation()
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Readonly<Record<string, AppealResponse>>>({})

  const query = useQuery({
    queryKey: queryKeys.account.pendingAppeals,
    queryFn: ({ signal }) => listAppeals(signal),
  })

  const items = (query.data ?? []).map((appeal) => overrides[appeal.id] ?? appeal)
  const pending = items.filter((appeal) => appeal.status === 'SUBMITTED')

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        icon="pending"
        title={t('admin:appeals.title')}
        subtitle={t('admin:appeals.intro')}
      >
        <Breadcrumb
          items={[{ label: t('admin:home'), to: '/admin' }, { label: t('admin:appeals.crumb') }]}
        />
      </AdminPageHeader>

      <QueryState
        isLoading={query.isPending}
        error={query.error}
        isEmpty={pending.length === 0}
        emptyMessage={t('admin:appeals.empty')}
      >
        <ul className="space-y-4">
          {pending.map((appeal) => (
            <li key={appeal.id}>
              <AdminPanel>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{appeal.statement}</p>
                    <p className="mt-1 text-xs text-muted">
                      {t('admin:appeals.meta', {
                        sanctionId: appeal.sanctionId,
                        accountId: appeal.accountId,
                        date: formatDateTime(appeal.submittedAt),
                      })}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {t('admin:appeals.decisionDueAt', {
                        date: formatDateTime(appeal.decisionDueAt),
                      })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="admin-primary"
                    aria-expanded={resolvingId === appeal.id}
                    onClick={() => {
                      setResolvingId((current) => (current === appeal.id ? null : appeal.id))
                    }}
                  >
                    {t('admin:appeals.resolveAction')}
                  </Button>
                </div>

                {resolvingId === appeal.id && (
                  <div className="mt-4">
                    <ResolveAppealForm
                      appealId={appeal.id}
                      {...(resolveAppeal === undefined ? {} : { resolve: resolveAppeal })}
                      onResolved={(resolved) => {
                        setOverrides((current) => ({ ...current, [resolved.id]: resolved }))
                        setResolvingId(null)
                      }}
                      onCancel={() => {
                        setResolvingId(null)
                      }}
                    />
                  </div>
                )}
              </AdminPanel>
            </li>
          ))}
        </ul>
      </QueryState>
    </div>
  )
}
