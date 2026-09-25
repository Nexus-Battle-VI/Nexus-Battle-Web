import { useState, type SyntheticEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Download } from '@/components/ui/icons'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDateTime } from '@/lib/format'
import { HttpError, type HttpDownload } from '@/lib/http'
import { primaryRole, roleLabel } from '@/shared/rbac'
import { useSession } from '@/shared/session'
import {
  saveAdminAccountsDownload,
  type AdminAccountQueryCriteria,
  type AdminAccountRole,
  type AdminAccountStatus,
  type AdminAccountSummary,
} from './api'
import {
  useAdminAccounts,
  useAdminAccountsExport,
  type AdminAccountsExportTransport,
  type AdminAccountsTransport,
} from './useAdminAccounts'
import { useTranslation } from 'react-i18next'

type SearchField = 'id' | 'email' | 'firstNames' | 'displayName'
type RoleFilter = '' | AdminAccountRole
type StatusFilter = '' | AdminAccountStatus
type SanctionHistoryFilter = '' | 'true' | 'false'

const FIELD_CLASS =
  'w-full rounded-md border border-border bg-[var(--nb-field)] px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60'

const LABEL_CLASS = 'block text-xs font-semibold text-ink'
const CONTROL_HELP = 'mt-1 text-xs text-muted'

const utcStartOfDay = (calendarDate: string): string => `${calendarDate}T00:00:00.000Z`
const utcEndOfDay = (calendarDate: string): string => `${calendarDate}T23:59:59.999Z`

/** Clave del aviso de consulta fallida (se traduce al pintar). */
const queryMessageKey = (error: unknown): string => {
  if (error instanceof HttpError && error.isUnauthorized) {
    return 'account:adminUsers.queryExpired'
  }

  if (error instanceof HttpError && error.isForbidden) {
    return 'account:adminUsers.queryForbidden'
  }

  return 'account:adminUsers.queryFailed'
}

/** Clave del aviso de exportacion fallida (se traduce al pintar). */
const exportMessageKey = (error: unknown): string => {
  if (error instanceof HttpError && error.isUnauthorized) {
    return 'account:adminUsers.exportExpired'
  }

  if (error instanceof HttpError && error.isForbidden) {
    return 'account:adminUsers.exportForbidden'
  }

  return 'account:adminUsers.exportFailed'
}

const criteriaFrom = (
  searchText: string,
  searchField: SearchField,
  role: RoleFilter,
  status: StatusFilter,
  sanctionHistory: SanctionHistoryFilter,
  registeredFromDate: string,
  registeredToDate: string,
): AdminAccountQueryCriteria => {
  const text = searchText.trim()
  const searchCriteria: AdminAccountQueryCriteria =
    text.length === 0
      ? {}
      : searchField === 'id'
        ? { id: text }
        : searchField === 'email'
          ? { email: text }
          : searchField === 'firstNames'
            ? { firstNames: text }
            : { displayName: text }

  return {
    ...searchCriteria,
    ...(role === '' ? {} : { role }),
    ...(status === '' ? {} : { status }),
    ...(sanctionHistory === '' ? {} : { hasSanctionHistory: sanctionHistory === 'true' }),
    ...(registeredFromDate === '' ? {} : { registeredFrom: utcStartOfDay(registeredFromDate) }),
    ...(registeredToDate === '' ? {} : { registeredTo: utcEndOfDay(registeredToDate) }),
  }
}

const AdminResult = ({ account }: { readonly account: AdminAccountSummary }): React.JSX.Element => {
  const role = primaryRole(account.roles)
  const { t } = useTranslation()

  return (
    <li className="grid min-w-0 gap-3 border-b border-border bg-surface p-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-ink">{account.displayName}</p>
        <p className="mt-1 break-all text-xs text-muted">ID: {account.id}</p>
        <p className="mt-1 break-all text-xs text-muted">{account.email}</p>
        <p className="mt-1 text-xs text-muted">
          {t('account:adminUsers.registered')}{' '}
          <time dateTime={account.registeredAt}>{formatDateTime(account.registeredAt)}</time>
        </p>
      </div>
      <span className="text-xs font-semibold text-ink">
        {role === null ? t('account:adminUsers.noRole') : roleLabel(role)}
      </span>
      <StatusBadge status={account.status} />
    </li>
  )
}

export interface AdminUsersSectionProps {
  readonly loadAccounts?: AdminAccountsTransport
  readonly exportAccounts?: AdminAccountsExportTransport
  readonly saveExport?: (file: HttpDownload) => void
}

export const AdminUsersSection = ({
  loadAccounts,
  exportAccounts,
  saveExport = saveAdminAccountsDownload,
}: AdminUsersSectionProps = {}): React.JSX.Element => {
  const roles = useSession((state) => state.roles)
  const sessionRole = primaryRole(roles)
  const { t } = useTranslation()
  const [searchText, setSearchText] = useState('')
  const [searchField, setSearchField] = useState<SearchField>('displayName')
  const [role, setRole] = useState<RoleFilter>('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [sanctionHistory, setSanctionHistory] = useState<SanctionHistoryFilter>('')
  const [registeredFromDate, setRegisteredFromDate] = useState('')
  const [registeredToDate, setRegisteredToDate] = useState('')
  const [appliedCriteria, setAppliedCriteria] = useState<AdminAccountQueryCriteria>({})
  // Ambos guardan la CLAVE del aviso; se traduce al pintar (cambia con el idioma).
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [exportFeedback, setExportFeedback] = useState<string | null>(null)
  const query = useAdminAccounts(appliedCriteria, loadAccounts)
  const exportMutation = useAdminAccountsExport(exportAccounts)

  const applyCriteria = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault()
    setExportFeedback(null)
    if (
      registeredFromDate !== '' &&
      registeredToDate !== '' &&
      registeredFromDate > registeredToDate
    ) {
      setValidationMessage('account:adminUsers.dateRangeError')
      return
    }

    setValidationMessage(null)
    setAppliedCriteria(
      criteriaFrom(
        searchText,
        searchField,
        role,
        status,
        sanctionHistory,
        registeredFromDate,
        registeredToDate,
      ),
    )
  }

  const clearCriteria = (): void => {
    setSearchText('')
    setSearchField('displayName')
    setRole('')
    setStatus('')
    setSanctionHistory('')
    setRegisteredFromDate('')
    setRegisteredToDate('')
    setValidationMessage(null)
    setExportFeedback(null)
    setAppliedCriteria({})
  }

  const exportResults = (): void => {
    setExportFeedback(null)
    exportMutation.mutate(appliedCriteria, {
      onSuccess: (file) => {
        saveExport(file)
        setExportFeedback('account:adminUsers.exportReady')
      },
      onError: (error) => {
        setExportFeedback(exportMessageKey(error))
      },
    })
  }

  const exportFailed = exportMutation.isError

  return (
    <section className="min-w-0 space-y-5" aria-labelledby="admin-users-title">
      <header className="space-y-3">
        <h2 id="admin-users-title" className="text-xl font-semibold text-ink">
          {t('account:adminUsers.title')}
        </h2>
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand bg-brand/10 px-2 py-1 text-xs font-semibold text-ink">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          {t('account:adminUsers.role', {
            role: sessionRole === null ? t('common:notAvailable') : roleLabel(sessionRole),
          })}
        </span>
      </header>

      <form className="space-y-4" onSubmit={applyCriteria}>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-ink">
            {t('account:adminUsers.search')}
          </legend>
          <p className="text-xs text-muted">{t('account:adminUsers.searchHint')}</p>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.55fr)]">
            <label className={LABEL_CLASS}>
              {t('account:adminUsers.searchLabel')}
              <input
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value)
                }}
                className={`${FIELD_CLASS} mt-1`}
                placeholder={t('account:adminUsers.searchPlaceholder')}
              />
            </label>

            <label className={LABEL_CLASS}>
              {t('account:adminUsers.searchField')}
              <select
                value={searchField}
                onChange={(event) => {
                  setSearchField(event.target.value as SearchField)
                }}
                className={`${FIELD_CLASS} mt-1`}
              >
                <option value="all" disabled>
                  {t('account:adminUsers.fields.all')}
                </option>
                <option value="firstNames">{t('account:adminUsers.fields.firstNames')}</option>
                <option value="displayName">{t('account:adminUsers.fields.displayName')}</option>
                <option value="email">{t('account:adminUsers.fields.email')}</option>
                <option value="id">{t('account:adminUsers.fields.id')}</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-ink">
            {t('account:adminUsers.filters')}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL_CLASS}>
              {t('account:adminUsers.roleFilter')}
              <select
                value={role}
                onChange={(event) => {
                  setRole(event.target.value as RoleFilter)
                }}
                className={`${FIELD_CLASS} mt-1`}
              >
                <option value="">{t('account:adminUsers.all')}</option>
                <option value="PLAYER">{roleLabel('PLAYER')}</option>
                <option value="MODERATOR">{roleLabel('MODERATOR')}</option>
                <option value="ADMINISTRATOR">{roleLabel('ADMINISTRATOR')}</option>
                <option value="SUPER_ADMINISTRATOR">{roleLabel('SUPER_ADMINISTRATOR')}</option>
              </select>
            </label>

            <label className={LABEL_CLASS}>
              {t('account:adminUsers.statusFilter')}
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as StatusFilter)
                }}
                className={`${FIELD_CLASS} mt-1`}
              >
                <option value="">{t('account:adminUsers.all')}</option>
                <option value="PENDING_VERIFICATION">
                  {t('account:adminUsers.status.PENDING_VERIFICATION')}
                </option>
                <option value="ACTIVE">{t('account:adminUsers.status.ACTIVE')}</option>
                <option value="SUSPENDED">{t('account:adminUsers.status.SUSPENDED')}</option>
              </select>
            </label>

            <label className={LABEL_CLASS}>
              {t('account:adminUsers.from')}
              <input
                type="date"
                aria-label={t('account:adminUsers.from')}
                value={registeredFromDate}
                onChange={(event) => {
                  setRegisteredFromDate(event.target.value)
                }}
                aria-describedby={validationMessage === null ? undefined : 'registered-range-error'}
                aria-invalid={validationMessage !== null}
                className={`${FIELD_CLASS} mt-1`}
              />
              <span className={CONTROL_HELP}>{t('account:adminUsers.fromHint')}</span>
            </label>

            <label className={LABEL_CLASS}>
              {t('account:adminUsers.to')}
              <input
                type="date"
                aria-label={t('account:adminUsers.to')}
                value={registeredToDate}
                onChange={(event) => {
                  setRegisteredToDate(event.target.value)
                }}
                aria-describedby={validationMessage === null ? undefined : 'registered-range-error'}
                aria-invalid={validationMessage !== null}
                className={`${FIELD_CLASS} mt-1`}
              />
              <span className={CONTROL_HELP}>{t('account:adminUsers.toHint')}</span>
            </label>

            <label className={LABEL_CLASS}>
              {t('account:adminUsers.sanctions')}
              <select
                value={sanctionHistory}
                onChange={(event) => {
                  setSanctionHistory(event.target.value as SanctionHistoryFilter)
                }}
                className={`${FIELD_CLASS} mt-1`}
              >
                <option value="">{t('account:adminUsers.sanctionsAny')}</option>
                <option value="true">{t('account:adminUsers.sanctionsWith')}</option>
                <option value="false">{t('account:adminUsers.sanctionsWithout')}</option>
              </select>
            </label>
          </div>

          {validationMessage !== null && (
            <p
              id="registered-range-error"
              role="alert"
              className="rounded-md border border-danger bg-danger/10 p-3 text-sm text-danger"
            >
              {t(validationMessage)}
            </p>
          )}
        </fieldset>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="submit" className="w-full">
            {t('account:adminUsers.submit')}
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={clearCriteria}>
            {t('account:adminUsers.clear')}
          </Button>
        </div>
      </form>

      {query.isLoading && (
        <p role="status" className="text-sm text-muted">
          {t('account:adminUsers.loading')}
        </p>
      )}

      {query.isError && (
        <p
          role="alert"
          className="rounded-md border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          {t(queryMessageKey(query.error))}
        </p>
      )}

      {query.isSuccess && (
        <>
          <section aria-label={t('account:adminUsers.statsLabel')} className="space-y-3">
            <h3 className="text-sm font-semibold text-ink">{t('account:adminUsers.stats')}</h3>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <dt className="text-xs text-muted">{t('account:adminUsers.active')}</dt>
                <dd data-stat="active" className="mt-1 text-xl font-semibold text-success">
                  {query.data.statusCounts.active}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <dt className="text-xs text-muted">{t('account:adminUsers.suspended')}</dt>
                <dd data-stat="suspended" className="mt-1 text-xl font-semibold text-warning">
                  {query.data.statusCounts.suspended}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <dt className="text-xs text-muted">{t('account:adminUsers.banned')}</dt>
                <dd data-stat="banned" className="mt-1 text-sm font-semibold text-muted">
                  {t('common:notAvailable')}
                </dd>
              </div>
            </dl>
          </section>

          <section
            aria-label={t('account:adminUsers.resultsLabel')}
            className="overflow-hidden rounded-lg border border-border"
          >
            <div className="bg-surface-raised p-4">
              <h3 className="text-sm font-semibold text-ink">
                {t('account:adminUsers.results', { total: String(query.data.items.length) })}
              </h3>
              <p className="mt-1 text-xs text-muted">{t('account:adminUsers.resultsHint')}</p>
            </div>

            {query.data.items.length === 0 ? (
              <p className="bg-surface p-4 text-sm text-muted">{t('account:adminUsers.empty')}</p>
            ) : (
              <ul>
                {query.data.items.map((account) => (
                  <AdminResult key={account.id} account={account} />
                ))}
              </ul>
            )}
          </section>

          <nav aria-label={t('account:adminUsers.pagination')} className="space-y-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled
                aria-label={t('account:adminUsers.previousPage')}
              >
                {t('account:adminUsers.previous')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled
                aria-label={t('account:adminUsers.nextPage')}
              >
                {t('account:adminUsers.next')}
              </Button>
            </div>
            <p className="text-xs text-muted">{t('account:adminUsers.paginationPending')}</p>
          </nav>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Button
              type="button"
              variant="secondary"
              loading={exportMutation.isPending}
              disabled={query.data.items.length === 0}
              onClick={exportResults}
            >
              <Download aria-hidden className="h-4 w-4" />
              {t('account:adminUsers.export')}
            </Button>
            {exportFeedback !== null && (
              <p
                role={exportFailed ? 'alert' : 'status'}
                aria-live="polite"
                className={exportFailed ? 'text-xs text-danger' : 'text-xs text-success'}
              >
                {t(exportFeedback)}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
