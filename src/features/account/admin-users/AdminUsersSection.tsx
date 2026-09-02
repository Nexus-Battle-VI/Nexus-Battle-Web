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

type SearchField = 'id' | 'email' | 'firstNames' | 'displayName'
type RoleFilter = '' | AdminAccountRole
type StatusFilter = '' | AdminAccountStatus

const FIELD_CLASS =
  'w-full rounded-md border border-border bg-[var(--nb-field)] px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60'

const LABEL_CLASS = 'block text-xs font-semibold text-ink'
const CONTROL_HELP = 'mt-1 text-xs text-muted'

const queryMessage = (error: unknown): string => {
  if (error instanceof HttpError && error.isUnauthorized) {
    return 'Tu sesión ha caducado. Vuelve a iniciar sesión para consultar el panel.'
  }

  if (error instanceof HttpError && error.isForbidden) {
    return 'No tienes autorización para consultar datos administrativos.'
  }

  return 'No se pudo cargar el panel administrativo. Intenta de nuevo más tarde.'
}

const exportMessage = (error: unknown): string => {
  if (error instanceof HttpError && error.isUnauthorized) {
    return 'Tu sesión ha caducado. Vuelve a iniciar sesión para exportar resultados.'
  }

  if (error instanceof HttpError && error.isForbidden) {
    return 'No tienes autorización para exportar resultados administrativos.'
  }

  return 'No se pudo exportar el resultado. Intenta de nuevo más tarde.'
}

const criteriaFrom = (
  searchText: string,
  searchField: SearchField,
  role: RoleFilter,
  status: StatusFilter,
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
  }
}

const AdminResult = ({ account }: { readonly account: AdminAccountSummary }): React.JSX.Element => {
  const role = primaryRole(account.roles)

  return (
    <li className="grid min-w-0 gap-3 border-b border-border bg-surface p-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-ink">{account.displayName}</p>
        <p className="mt-1 break-all text-xs text-muted">ID: {account.id}</p>
        <p className="mt-1 break-all text-xs text-muted">{account.email}</p>
        <p className="mt-1 text-xs text-muted">
          Registrado:{' '}
          <time dateTime={account.registeredAt}>{formatDateTime(account.registeredAt)}</time>
        </p>
      </div>
      <span className="text-xs font-semibold text-ink">
        {role === null ? 'Sin rol' : roleLabel(role)}
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
  const [searchText, setSearchText] = useState('')
  const [searchField, setSearchField] = useState<SearchField>('displayName')
  const [role, setRole] = useState<RoleFilter>('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [appliedCriteria, setAppliedCriteria] = useState<AdminAccountQueryCriteria>({})
  const [exportFeedback, setExportFeedback] = useState<string | null>(null)
  const query = useAdminAccounts(appliedCriteria, loadAccounts)
  const exportMutation = useAdminAccountsExport(exportAccounts)

  const applyCriteria = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault()
    setExportFeedback(null)
    setAppliedCriteria(criteriaFrom(searchText, searchField, role, status))
  }

  const exportResults = (): void => {
    setExportFeedback(null)
    exportMutation.mutate(appliedCriteria, {
      onSuccess: (file) => {
        saveExport(file)
        setExportFeedback('Exportación preparada.')
      },
      onError: (error) => {
        setExportFeedback(exportMessage(error))
      },
    })
  }

  const exportFailed = exportMutation.isError

  return (
    <section className="min-w-0 space-y-5" aria-labelledby="admin-users-title">
      <header className="space-y-3">
        <h2 id="admin-users-title" className="text-xl font-semibold text-ink">
          Panel administrativo de usuarios
        </h2>
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand bg-brand/10 px-2 py-1 text-xs font-semibold text-ink">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          Rol: {sessionRole === null ? 'No disponible' : roleLabel(sessionRole)}
        </span>
      </header>

      <form className="space-y-4" onSubmit={applyCriteria}>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-ink">Búsqueda</legend>
          <p className="text-xs text-muted">Busca por un campo soportado por Account.</p>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.55fr)]">
            <label className={LABEL_CLASS}>
              Buscar
              <input
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value)
                }}
                className={`${FIELD_CLASS} mt-1`}
                placeholder="Escribe un valor de búsqueda"
              />
            </label>

            <label className={LABEL_CLASS}>
              Campo de búsqueda
              <select
                value={searchField}
                onChange={(event) => {
                  setSearchField(event.target.value as SearchField)
                }}
                className={`${FIELD_CLASS} mt-1`}
              >
                <option value="all" disabled>
                  Todos los campos (no disponible)
                </option>
                <option value="firstNames">Nombre</option>
                <option value="displayName">Apodo</option>
                <option value="email">Correo</option>
                <option value="id">ID</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-ink">Filtros</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL_CLASS}>
              Rol
              <select
                value={role}
                onChange={(event) => {
                  setRole(event.target.value as RoleFilter)
                }}
                className={`${FIELD_CLASS} mt-1`}
              >
                <option value="">Todos</option>
                <option value="PLAYER">Jugador</option>
                <option value="MODERATOR">Moderador</option>
                <option value="ADMINISTRATOR">Administrador</option>
                <option value="SUPER_ADMINISTRATOR">Super Administrador</option>
              </select>
            </label>

            <label className={LABEL_CLASS}>
              Estado de cuenta
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as StatusFilter)
                }}
                className={`${FIELD_CLASS} mt-1`}
              >
                <option value="">Todos</option>
                <option value="PENDING_VERIFICATION">Pendiente de verificación</option>
                <option value="ACTIVE">Activa</option>
                <option value="SUSPENDED">Suspendida</option>
              </select>
            </label>

            <label className={LABEL_CLASS}>
              Fecha de registro
              <select disabled aria-label="Fecha de registro" className={`${FIELD_CLASS} mt-1`}>
                <option>Cualquier fecha</option>
              </select>
              <span className={CONTROL_HELP}>Filtro pendiente de contrato backend.</span>
            </label>
          </div>

          <fieldset disabled className="space-y-2">
            <legend className="text-xs font-semibold text-ink">Historial de sanciones</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink">
              {['Con sanciones', 'Sin sanciones', 'Advertencia', 'Suspensión', 'Baneo'].map(
                (label) => (
                  <label key={label} className="inline-flex items-center gap-2 opacity-60">
                    <input type="checkbox" className="h-4 w-4 accent-brand" />
                    {label}
                  </label>
                ),
              )}
            </div>
            <p className={CONTROL_HELP}>Historial y filtros de sanciones pendientes de backend.</p>
          </fieldset>
        </fieldset>

        <Button type="submit" className="w-full">
          Buscar usuarios
        </Button>
      </form>

      {query.isLoading && (
        <p role="status" className="text-sm text-muted">
          Cargando usuarios...
        </p>
      )}

      {query.isError && (
        <p
          role="alert"
          className="rounded-md border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          {queryMessage(query.error)}
        </p>
      )}

      {query.isSuccess && (
        <>
          <section aria-label="Estadísticas administrativas" className="space-y-3">
            <h3 className="text-sm font-semibold text-ink">Estadísticas</h3>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <dt className="text-xs text-muted">Usuarios activos</dt>
                <dd data-stat="active" className="mt-1 text-xl font-semibold text-success">
                  {query.data.statusCounts.active}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <dt className="text-xs text-muted">Usuarios suspendidos</dt>
                <dd data-stat="suspended" className="mt-1 text-xl font-semibold text-warning">
                  {query.data.statusCounts.suspended}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <dt className="text-xs text-muted">Usuarios baneados</dt>
                <dd data-stat="banned" className="mt-1 text-sm font-semibold text-muted">
                  No disponible
                </dd>
              </div>
            </dl>
          </section>

          <section
            aria-label="Resultados administrativos"
            className="overflow-hidden rounded-lg border border-border"
          >
            <div className="bg-surface-raised p-4">
              <h3 className="text-sm font-semibold text-ink">
                Resultados ({query.data.items.length})
              </h3>
              <p className="mt-1 text-xs text-muted">
                Usuarios que cumplen los criterios aplicados.
              </p>
            </div>

            {query.data.items.length === 0 ? (
              <p className="bg-surface p-4 text-sm text-muted">
                No se encontraron usuarios con los criterios aplicados.
              </p>
            ) : (
              <ul>
                {query.data.items.map((account) => (
                  <AdminResult key={account.id} account={account} />
                ))}
              </ul>
            )}
          </section>

          <nav aria-label="Paginación de resultados" className="space-y-2">
            <div className="flex gap-2">
              <Button type="button" variant="secondary" disabled aria-label="Página anterior">
                Anterior
              </Button>
              <Button type="button" variant="secondary" disabled aria-label="Página siguiente">
                Siguiente
              </Button>
            </div>
            <p className="text-xs text-muted">
              La paginación estará disponible cuando el contrato backend exponga página y total.
            </p>
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
              Exportar resultados
            </Button>
            {exportFeedback !== null && (
              <p
                role={exportFailed ? 'alert' : 'status'}
                aria-live="polite"
                className={exportFailed ? 'text-xs text-danger' : 'text-xs text-success'}
              >
                {exportFeedback}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
