import { useState, type SyntheticEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { primaryRole, roleLabel } from '@/shared/rbac'
import {
  ASSIGNABLE_ROLES,
  assignRole,
  findAccountByEmail,
  revokeRole,
  type AccountRoleView,
  type AssignableRole,
  type ManagedAccount,
} from './api'

const FIELD_CLASS =
  'w-full rounded-md border border-border bg-[var(--nb-field)] px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand'

export interface RoleManagementPageProps {
  readonly onSearch?: (email: string) => Promise<ManagedAccount>
  readonly onAssign?: (accountId: string, role: AssignableRole) => Promise<AccountRoleView>
  readonly onRevoke?: (accountId: string, role: AssignableRole) => Promise<AccountRoleView>
  readonly confirmAction?: (message: string) => boolean
}

export const RoleManagementPage = ({
  onSearch = findAccountByEmail,
  onAssign = assignRole,
  onRevoke = revokeRole,
  confirmAction = (message) => globalThis.confirm(message),
}: RoleManagementPageProps = {}): React.JSX.Element => {
  const [email, setEmail] = useState('')
  const [account, setAccount] = useState<ManagedAccount | null>(null)
  const [selectedRole, setSelectedRole] = useState<AssignableRole>('MODERATOR')
  const [searching, setSearching] = useState(false)
  const [changing, setChanging] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const search = async (rawEmail: string): Promise<void> => {
    setFailure(null)
    setSuccess(null)
    setSearching(true)

    try {
      setAccount(await onSearch(rawEmail.trim()))
    } catch (error: unknown) {
      setAccount(null)
      setFailure(error instanceof Error ? error.message : 'No se pudo buscar la cuenta.')
    } finally {
      setSearching(false)
    }
  }

  const handleSearch = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (email.trim().length > 0) {
      void search(email)
    }
  }

  const refreshAfter = async (
    action: () => Promise<AccountRoleView>,
    successMessage: string,
  ): Promise<void> => {
    if (account === null || changing) {
      return
    }

    setFailure(null)
    setSuccess(null)
    setChanging(true)

    try {
      const updated = await action()
      setAccount({ ...updated, mfaEnrolled: account.mfaEnrolled })
      setAccount(await onSearch(account.email))
      setSuccess(successMessage)
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : 'No se pudo actualizar el rol.')
    } finally {
      setChanging(false)
    }
  }

  const handleAssign = (): void => {
    if (account === null) {
      return
    }

    if (selectedRole === 'ADMINISTRATOR' && !account.mfaEnrolled) {
      setFailure(
        'La cuenta debe inscribir su aplicacion autenticadora en Mi Cuenta > Seguridad antes de recibir ADMINISTRATOR.',
      )
      return
    }

    if (!confirmAction(`Asignar ${roleLabel(selectedRole)} a ${account.email}?`)) {
      return
    }

    void refreshAfter(
      () => onAssign(account.id, selectedRole),
      `Se asigno ${roleLabel(selectedRole)} y se actualizo la cuenta.`,
    )
  }

  const handleRevoke = (role: AssignableRole): void => {
    if (account === null || !confirmAction(`Retirar ${roleLabel(role)} de ${account.email}?`)) {
      return
    }

    void refreshAfter(
      () => onRevoke(account.id, role),
      `Se retiro ${roleLabel(role)} y se actualizo la cuenta.`,
    )
  }

  const currentRole = account === null ? null : primaryRole(account.roles)
  const assignedElevatedRoles =
    account === null ? [] : ASSIGNABLE_ROLES.filter((role) => account.roles.includes(role))
  const administratorBlocked =
    account !== null && selectedRole === 'ADMINISTRATOR' && !account.mfaEnrolled

  return (
    <div className="space-y-4">
      <Card
        title="Gestion de roles"
        description="Busca una cuenta y asigna o retira los roles Moderador y Administrador."
      >
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-medium text-ink">
            Correo de la cuenta
            <input
              type="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
              }}
              placeholder="persona@correo.com"
              className={`${FIELD_CLASS} mt-1`}
            />
          </label>
          <Button type="submit" loading={searching}>
            Buscar cuenta
          </Button>
        </form>
      </Card>

      {failure !== null && (
        <p role="alert" className="rounded-lg border border-danger bg-danger/10 p-3 text-sm">
          {failure}
        </p>
      )}
      {success !== null && (
        <p role="status" className="rounded-lg border border-brand bg-brand/10 p-3 text-sm">
          {success}
        </p>
      )}

      {account !== null && (
        <Card title={account.displayName} description={account.email}>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Rol vigente</dt>
              <dd className="font-medium text-ink">
                {currentRole === null ? 'Sin rol' : roleLabel(currentRole)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Estado</dt>
              <dd className="font-medium text-ink">{account.status}</dd>
            </div>
            <div>
              <dt className="text-muted">Aplicacion autenticadora</dt>
              <dd className="font-medium text-ink">
                {account.mfaEnrolled ? 'Inscrita' : 'No inscrita'}
              </dd>
            </div>
          </dl>

          {!account.mfaEnrolled && (
            <p className="mt-4 rounded-md border border-brand bg-brand/10 p-3 text-sm text-ink">
              Para recibir Administrador, esta persona debe inscribir su autenticador en Mi Cuenta
              &gt; Seguridad. La asignacion permanece deshabilitada hasta entonces.
            </p>
          )}

          <div className="mt-5 space-y-3 border-t border-border pt-4">
            <label className="block text-sm font-medium text-ink">
              Rol a asignar
              <select
                value={selectedRole}
                onChange={(event) => {
                  setSelectedRole(event.target.value as AssignableRole)
                }}
                className={`${FIELD_CLASS} mt-1 max-w-sm`}
              >
                <option value="MODERATOR">Moderador</option>
                <option value="ADMINISTRATOR">Administrador</option>
              </select>
            </label>
            <Button
              onClick={handleAssign}
              loading={changing}
              disabled={administratorBlocked || account.roles.includes(selectedRole)}
            >
              {account.roles.includes(selectedRole) ? 'Rol ya asignado' : 'Asignar rol'}
            </Button>
          </div>

          {assignedElevatedRoles.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-ink">Roles elevados asignados</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {assignedElevatedRoles.map((role) => (
                  <Button
                    key={role}
                    variant="danger"
                    loading={changing}
                    onClick={() => {
                      handleRevoke(role)
                    }}
                  >
                    Retirar {roleLabel(role)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
