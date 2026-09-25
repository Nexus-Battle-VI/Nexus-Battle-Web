import { useState, type SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { primaryRole, roleLabel } from '@/shared/rbac'
import { useLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'
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
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)

  const search = async (rawEmail: string): Promise<void> => {
    setFailure(null)
    setSuccess(null)
    setSearching(true)

    try {
      setAccount(await onSearch(rawEmail.trim()))
    } catch (error: unknown) {
      setAccount(null)
      setFailure(
        error instanceof Error
          ? describeFailure(error, t, language)
          : t('admin:roles.searchFailed'),
      )
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
      setFailure(
        error instanceof Error
          ? describeFailure(error, t, language)
          : t('admin:roles.updateFailed'),
      )
    } finally {
      setChanging(false)
    }
  }

  const handleAssign = (): void => {
    if (account === null) {
      return
    }

    if (selectedRole === 'ADMINISTRATOR' && !account.mfaEnrolled) {
      setFailure(t('admin:roles.mfaRequired'))
      return
    }

    if (
      !confirmAction(
        t('admin:roles.confirmAssign', { role: roleLabel(selectedRole), email: account.email }),
      )
    ) {
      return
    }

    void refreshAfter(
      () => onAssign(account.id, selectedRole),
      t('admin:roles.assigned', { role: roleLabel(selectedRole) }),
    )
  }

  const handleRevoke = (role: AssignableRole): void => {
    if (
      account === null ||
      !confirmAction(
        t('admin:roles.confirmRevoke', { role: roleLabel(role), email: account.email }),
      )
    ) {
      return
    }

    void refreshAfter(
      () => onRevoke(account.id, role),
      t('admin:roles.revoked', { role: roleLabel(role) }),
    )
  }

  const currentRole = account === null ? null : primaryRole(account.roles)
  const assignedElevatedRoles =
    account === null ? [] : ASSIGNABLE_ROLES.filter((role) => account.roles.includes(role))
  const administratorBlocked =
    account !== null && selectedRole === 'ADMINISTRATOR' && !account.mfaEnrolled

  return (
    <div className="space-y-4">
      <Card title={t('admin:roles.title')} description={t('admin:roles.description')}>
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-medium text-ink">
            {t('admin:roles.email')}
            <input
              type="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
              }}
              placeholder={t('admin:roles.emailPlaceholder')}
              className={`${FIELD_CLASS} mt-1`}
            />
          </label>
          <Button type="submit" loading={searching}>
            {t('admin:roles.search')}
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
              <dt className="text-muted">{t('admin:roles.current')}</dt>
              <dd className="font-medium text-ink">
                {currentRole === null ? t('admin:roles.none') : roleLabel(currentRole)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t('admin:roles.status')}</dt>
              <dd className="font-medium text-ink">{account.status}</dd>
            </div>
            <div>
              <dt className="text-muted">{t('admin:roles.authenticator')}</dt>
              <dd className="font-medium text-ink">
                {account.mfaEnrolled ? t('admin:roles.enrolled') : t('admin:roles.notEnrolled')}
              </dd>
            </div>
          </dl>

          {!account.mfaEnrolled && (
            <p className="mt-4 rounded-md border border-brand bg-brand/10 p-3 text-sm text-ink">
              {t('admin:roles.mfaNotice')}
            </p>
          )}

          <div className="mt-5 space-y-3 border-t border-border pt-4">
            <label className="block text-sm font-medium text-ink">
              {t('admin:roles.toAssign')}
              <select
                value={selectedRole}
                onChange={(event) => {
                  setSelectedRole(event.target.value as AssignableRole)
                }}
                className={`${FIELD_CLASS} mt-1 max-w-sm`}
              >
                <option value="MODERATOR">{roleLabel('MODERATOR')}</option>
                <option value="ADMINISTRATOR">{roleLabel('ADMINISTRATOR')}</option>
              </select>
            </label>
            <Button
              onClick={handleAssign}
              loading={changing}
              disabled={administratorBlocked || account.roles.includes(selectedRole)}
            >
              {account.roles.includes(selectedRole)
                ? t('admin:roles.alreadyAssigned')
                : t('admin:roles.assign')}
            </Button>
          </div>

          {assignedElevatedRoles.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-ink">{t('admin:roles.elevated')}</h3>
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
                    {t('admin:roles.revoke', { role: roleLabel(role) })}
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
