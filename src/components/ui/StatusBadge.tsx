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
