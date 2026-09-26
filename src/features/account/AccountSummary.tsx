import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { Avatar } from '@/components/ui/Avatar'
import type { OwnAccount } from './api'
import { roleLabel } from '@/shared/rbac'

/**
 * Resumen visual de la cuenta (HU-05.4, avatar real desde HU-15.3).
 *
 * Solo muestra informacion REAL de `GET /api/accounts/me`: apodo, correo,
 * estado, roles y ahora el avatar (`avatarUrl`, servido por Account tras JWT
 * en `GET /accounts/:id/avatar`). Sin avatar persistido (`avatarUrl === null`
 * o ausente), `Avatar` cae a la inicial derivada del apodo -mismo
 * comportamiento que existia antes de HU-15.3-; no se ofrece "cambiar foto"
 * porque Account todavia no expone esa mutacion self-service.
 */

const initialsOf = (account: OwnAccount): string => {
  const source = account.displayName.trim() || account.email.trim()
  const words = source.split(/\s+/u).filter(Boolean)

  const letters =
    words.length >= 2 ? `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}` : source.slice(0, 2)

  return letters.toUpperCase()
}

export interface AccountSummaryProps {
  readonly account: OwnAccount
}

export const AccountSummary = ({ account }: AccountSummaryProps): React.JSX.Element => {
  // Se suscribe al idioma: las etiquetas de rol se vuelven a pintar al cambiarlo.
  useTranslation()

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Avatar
        avatarUrl={account.avatarUrl ?? null}
        alt={account.displayName}
        initials={initialsOf(account)}
        size="lg"
      />

      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-ink" title={account.displayName}>
          {account.displayName}
        </p>
        <p className="truncate text-sm text-muted" title={account.email}>
          {account.email}
        </p>
      </div>

      <StatusBadge status={account.status} />

      {account.roles.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-1.5">
          {account.roles.map((role) => (
            <li
              key={role}
              className="rounded-full border border-border px-2 py-0.5 text-xs text-muted"
            >
              {roleLabel(role)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
