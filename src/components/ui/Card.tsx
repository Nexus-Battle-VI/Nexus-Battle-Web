import type { ReactNode } from 'react'
import clsx from 'clsx'

export interface CardProps {
  readonly title?: string
  readonly description?: string
  readonly className?: string
  readonly children: ReactNode
}

export const Card = ({ title, description, className, children }: CardProps): React.JSX.Element => (
  <section className={clsx('rounded-lg border border-border bg-surface-raised p-5', className)}>
    {title !== undefined && <h2 className="text-lg font-semibold text-ink">{title}</h2>}
    {description !== undefined && <p className="mt-1 text-sm text-muted">{description}</p>}
    <div className={clsx(title !== undefined || description !== undefined ? 'mt-4' : undefined)}>
      {children}
    </div>
  </section>
)
