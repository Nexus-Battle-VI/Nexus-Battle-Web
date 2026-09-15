import clsx from 'clsx'

import { statusLabel } from '@/lib/format'

export interface StatusBadgeProps {
  readonly status: string
}

const TONE: Readonly<Record<string, string>> = {
  PUBLISHED: 'bg-success/15 text-success',
  ACTIVE: 'bg-success/15 text-success',
  CONFIRMED: 'bg-success/15 text-success',
  OPEN: 'bg-success/15 text-success',
  CANCELLED: 'bg-danger/15 text-danger',
  SUSPENDED: 'bg-danger/15 text-danger',
  ARCHIVED: 'bg-danger/15 text-danger',
  // Estado de moderacion de un comentario (HU-41).
  APPROVED: 'bg-success/15 text-success',
  DELETED: 'bg-danger/15 text-danger',
  HIDDEN: 'bg-danger/15 text-danger',
  PENDING: 'bg-warning/15 text-warning',
  MARKED: 'bg-warning/15 text-warning',
}

export const StatusBadge = ({ status }: StatusBadgeProps): React.JSX.Element => (
  <span
    className={clsx(
      'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
      TONE[status] ?? 'bg-border text-muted',
    )}
  >
    {statusLabel(status)}
  </span>
)
