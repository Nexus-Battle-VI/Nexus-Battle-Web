import type { ReactNode } from 'react'

import type { AdminIconName } from './adminConsoleAssets'
import { AdminPixelIcon } from './AdminPixelIcon'

/**
 * Cabecera de una pagina de la consola (EN-031): icono de la seccion, titulo
 * (el `h1` de la pagina), subtitulo opcional y un hueco para acciones.
 */
export const AdminPageHeader = ({
  icon,
  title,
  subtitle,
  actions,
  children,
}: {
  readonly icon?: AdminIconName | undefined
  readonly title: string
  readonly subtitle?: string | undefined
  readonly actions?: ReactNode
  /** Por ejemplo, la miga de pan, encima del titulo. */
  readonly children?: ReactNode
}): React.JSX.Element => (
  <header className="ak-page-header">
    {icon !== undefined && <AdminPixelIcon icon={icon} size="xl" />}
    <div className="min-w-0 flex-1">
      {children}
      <h1 className="ak-title">{title}</h1>
      {subtitle !== undefined && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
    {actions !== undefined && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
)
