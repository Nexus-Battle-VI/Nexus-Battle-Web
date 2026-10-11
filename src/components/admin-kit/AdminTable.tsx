import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import clsx from 'clsx'

/**
 * Tabla de la consola (EN-031): `table` semantica con `caption` (su nombre
 * accesible), cabecera fija y desplazamiento horizontal propio en movil.
 */
export const AdminTable = ({
  caption,
  captionHidden = false,
  children,
}: {
  readonly caption: string
  /** El `caption` sigue nombrando la tabla, pero no se ve. */
  readonly captionHidden?: boolean
  readonly children: ReactNode
}): React.JSX.Element => (
  <div className="ak-table-wrap">
    <table className="ak-table">
      <caption className={clsx(captionHidden && 'sr-only')}>{caption}</caption>
      {children}
    </table>
  </div>
)

export const AdminTh = ({
  className,
  scope = 'col',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>): React.JSX.Element => (
  <th scope={scope} className={clsx('ak-th', className)} {...props} />
)

export const AdminTd = ({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>): React.JSX.Element => (
  <td className={clsx('ak-td', className)} {...props} />
)
