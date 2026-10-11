import clsx from 'clsx'

/**
 * Insignia de pendientes (EN-031). El numero es visible; su significado va en
 * `label` (por ejemplo "3 pendientes"), que es lo que oyen los lectores de
 * pantalla. Con 0 no se muestra.
 */
export const AdminBadge = ({
  count,
  label,
  muted = false,
}: {
  readonly count: number
  readonly label: string
  readonly muted?: boolean
}): React.JSX.Element | null =>
  count <= 0 ? null : (
    <span role="img" aria-label={label} className={clsx('ak-badge', muted && 'ak-badge--muted')}>
      {count > 99 ? '99+' : count}
    </span>
  )
