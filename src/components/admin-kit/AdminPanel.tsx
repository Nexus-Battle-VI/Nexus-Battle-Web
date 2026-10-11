import { useId, type ReactNode } from 'react'
import clsx from 'clsx'

/**
 * Panel de la consola (EN-031): una `section` con su titulo (`h2`), nombrada
 * por ese titulo (`aria-labelledby`), asi cada panel es una region navegable.
 */
export const AdminPanel = ({
  title,
  actions,
  className,
  children,
}: {
  readonly title?: string | undefined
  readonly actions?: ReactNode
  readonly className?: string | undefined
  readonly children: ReactNode
}): React.JSX.Element => {
  const headingId = useId()
  return (
    <section
      className={clsx('ak-panel', className)}
      aria-labelledby={title === undefined ? undefined : headingId}
    >
      {(title !== undefined || actions !== undefined) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title !== undefined && (
            <h2 id={headingId} className="ak-panel-title">
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}
