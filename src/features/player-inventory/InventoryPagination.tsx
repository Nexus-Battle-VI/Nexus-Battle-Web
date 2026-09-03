import clsx from 'clsx'

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
      aria-label="Paginación del inventario"
      className="flex flex-wrap items-center justify-center gap-1"
    >
      <button
        type="button"
        onClick={() => {
          go(page - 1)
        }}
        disabled={page === 1}
        aria-label="Página anterior"
        className="rounded-md border border-border px-2 py-1 text-sm text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
          aria-label={`Página ${String(target)}`}
          aria-current={target === page ? 'page' : undefined}
          className={clsx(
            'min-w-8 rounded-md border px-2 py-1 text-sm tabular-nums transition-colors',
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
        aria-label="Página siguiente"
        className="rounded-md border border-border px-2 py-1 text-sm text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <span aria-hidden="true">›</span>
      </button>
    </nav>
  )
}
