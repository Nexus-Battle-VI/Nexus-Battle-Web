import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatMoney } from '@/lib/format'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useProducts } from './useProducts'

/**
 * Listado del catalogo con filtro por categoria.
 *
 * El filtro se aplica con retraso para no lanzar una consulta por pulsacion.
 * El servicio solo devuelve productos publicados: la pantalla no necesita
 * filtrar por estado, y no debe hacerlo, porque duplicaria una regla de negocio
 * que ya vive en el dominio.
 */
export const CatalogPage = (): React.JSX.Element => {
  const [category, setCategory] = useState('')
  const debouncedCategory = useDebouncedValue(category)
  const normalized = debouncedCategory.trim().toLowerCase()
  const products = useProducts(normalized === '' ? null : normalized)
  const { t } = useTranslation()

  return (
    <Card title={t('catalog:list.title')} description={t('catalog:list.description')}>
      <label className="block text-sm font-medium text-ink" htmlFor="category">
        {t('catalog:list.filter')}
      </label>
      <input
        id="category"
        type="text"
        value={category}
        placeholder="armas"
        onChange={(event) => {
          setCategory(event.target.value)
        }}
        className="mt-1 w-full max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand"
      />

      <div className="mt-5">
        <QueryState
          isLoading={products.isPending}
          error={products.error}
          isEmpty={(products.data?.length ?? 0) === 0}
          emptyMessage={t('catalog:list.empty')}
        >
          <ul className="divide-y divide-border">
            {(products.data ?? []).map((product) => (
              <li key={product.sku} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{product.name}</p>
                  <p className="text-sm text-muted">
                    {product.sku} · {product.category}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={product.status} />
                  <span className="font-medium tabular-nums text-ink">
                    {formatMoney(product.price.amount, product.price.currency)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </QueryState>
      </div>
    </Card>
  )
}
