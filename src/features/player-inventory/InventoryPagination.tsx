import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { visiblePages } from './paginationRange'

export interface InventoryPaginationProps {
  readonly page: number
  readonly totalPages: number
  readonly onChange: (page: number) => void
}

export const InventoryPagination = ({
  page,
  totalPages,
  onChange,
}: InventoryPaginationProps): React.JSX.Element | null => {
  const { t } = useTranslation()

  if (totalPages <= 1) {
    return null
  }

  const pages = visiblePages(page, totalPages)
  const go = (target: number): void => {
    const clamped = Math.max(1, Math.min(target, totalPages))
    if (clamped !== page) {
      onChange(clamped)
    }
  }

  return (
    <nav
      aria-label={t('inventory:catalog.pagination')}
      className="flex flex-wrap items-center justify-center gap-1"
    >
      <button
        type="button"
        onClick={() => {
          go(page - 1)
        }}
        disabled={page === 1}
        aria-label={t('inventory:catalog.previousPage')}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border px-2 text-sm text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <span aria-hidden="true">‹</span>
      </button>

      {pages.map((target) => (
        <button
          key={target}
          type="button"
          onClick={() => {
            go(target)
          }}
          aria-label={t('inventory:catalog.goToPage', { page: String(target) })}
          aria-current={target === page ? 'page' : undefined}
          className={clsx(
            'min-h-11 min-w-11 rounded-md border px-2 text-sm tabular-nums transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            target === page
              ? 'border-brand bg-brand text-brand-ink'
              : 'border-border text-ink hover:bg-surface',
          )}
        >
          {target}
        </button>
      ))}

      <button
        type="button"
        onClick={() => {
          go(page + 1)
        }}
        disabled={page === totalPages}
        aria-label={t('inventory:catalog.nextPage')}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border px-2 text-sm text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <span aria-hidden="true">›</span>
      </button>
    </nav>
  )
}
