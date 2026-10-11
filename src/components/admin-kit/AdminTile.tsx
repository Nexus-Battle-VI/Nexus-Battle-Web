import type { ReactNode } from 'react'
import { Link } from 'react-router'

import type { AdminIconName } from './adminConsoleAssets'
import { AdminPixelIcon } from './AdminPixelIcon'

/** Mosaico del panel de inicio (EN-031): acceso a una seccion con su icono. */
export const AdminTile = ({
  to,
  icon,
  title,
  hint,
  badge,
}: {
  readonly to: string
  readonly icon: AdminIconName
  readonly title: string
  readonly hint?: string | undefined
  readonly badge?: ReactNode
}): React.JSX.Element => (
  <Link
    to={to}
    className="ak-tile focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
  >
    <AdminPixelIcon icon={icon} size="lg" />
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2 font-semibold">
        {title}
        {badge}
      </span>
      {hint !== undefined && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
    </span>
  </Link>
)
