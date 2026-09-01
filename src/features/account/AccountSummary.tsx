import { StatusBadge } from '@/components/ui/StatusBadge'
import type { OwnAccount } from './api'

/**
 * Resumen visual de la cuenta (HU-05.4).
 *
 * Solo muestra informacion REAL de `GET /api/accounts/me`: apodo, correo,
 * estado y roles. El "avatar" es la inicial derivada del apodo -no una imagen
 * persistida-: Account no expone avatar self-service, asi que no se ofrece
 * "cambiar foto" ni se finge que hay una.
 */

const ROLE_LABELS: Readonly<Record<string, string>> = {
  PLAYER: 'Jugador',
  MODERATOR: 'Moderador',
  ADMINISTRATOR: 'Administrador',
  SUPER_ADMINISTRATOR: 'Super administrador',
}

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

export const AccountSummary = ({ account }: AccountSummaryProps): React.JSX.Element => (
  <div className="flex flex-col items-center gap-3 text-center">
    <span
      aria-hidden="true"
      className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/15 text-xl font-semibold text-brand"
    >
      {initialsOf(account)}
    </span>

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
            {ROLE_LABELS[role] ?? role}
          </li>
        ))}
      </ul>
    )}
  </div>
)
