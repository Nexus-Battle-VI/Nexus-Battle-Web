import { useDeferredValue, useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'

import { fetchCatalogProduct, searchCatalogProducts } from './missionContentApi'
import { PRODUCT_TYPE_LABELS } from '@/features/admin/products/contract'

const typeLabel = (type: string): string =>
  (PRODUCT_TYPE_LABELS as Readonly<Record<string, string>>)[type] ?? type

export interface ProductPickerProps {
  readonly label: string
  readonly productId: string | null
  /** Tipos de Catalog que tiene sentido enlazar aqui (ARMA, ARMADURA, ITEM, EPICA…). */
  readonly types: readonly string[]
  readonly onChange: (productId: string | null) => void
  readonly error?: string | undefined
}

/**
 * Enlaza una recompensa con su producto de Catalog. Sin producto, Missions no
 * la promete ni la entrega (P-J2): por eso el estado se dice siempre.
 */
export const ProductPicker = ({
  label,
  productId,
  types,
  onChange,
  error,
}: ProductPickerProps): React.JSX.Element => {
  const { t } = useTranslation()
  const headingId = useId()
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<string | null>(types.length === 1 ? (types[0] ?? null) : null)
  const term = useDeferredValue(query.trim())

  const linked = useQuery({
    queryKey: ['admin', 'catalog-product', productId],
    queryFn: ({ signal }) =>
      productId === null ? Promise.resolve(null) : fetchCatalogProduct(productId, signal),
    enabled: productId !== null,
    staleTime: 60_000,
  })
  const results = useQuery({
    queryKey: ['admin', 'catalog-search', term, type],
    queryFn: ({ signal }) => searchCatalogProducts(term, type, signal),
    enabled: searching && term.length >= 2,
    staleTime: 30_000,
  })
  const found = (results.data ?? []).filter((product) => types.includes(product.type))

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className="flex flex-col gap-2 rounded-md border border-border p-3"
    >
      <p id={headingId} className="text-sm font-medium text-ink">
        {label}
      </p>
      {productId === null ? (
        <p className="text-xs text-muted">{t('admin:missions.picker.noProduct')}</p>
      ) : linked.isPending ? (
        <p className="text-xs text-muted">{t('admin:missions.picker.searchingLinked')}</p>
      ) : linked.data === null || linked.isError ? (
        <p className="text-xs text-danger">{t('admin:missions.picker.linkedMissing')}</p>
      ) : (
        <p className="text-sm text-ink">
          {t('admin:missions.picker.linkedToPrefix')}{' '}
          <span className="font-medium">{linked.data.name}</span> ({typeLabel(linked.data.type)})
        </p>
      )}
      {error !== undefined && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            setSearching((current) => !current)
          }}
        >
          {searching
            ? t('admin:missions.picker.closeSearch')
            : productId === null
              ? t('admin:missions.picker.searchProduct')
              : t('admin:missions.picker.change')}
        </Button>
        {productId !== null && (
          <Button
            variant="secondary"
            onClick={() => {
              onChange(null)
            }}
          >
            {t('admin:missions.picker.removeLink')}
          </Button>
        )}
      </div>
      {searching && (
        <div className="flex flex-col gap-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <TextField
              label={t('admin:missions.picker.searchLabel')}
              value={query}
              placeholder={t('admin:missions.picker.searchPlaceholder')}
              onChange={(event) => {
                setQuery(event.target.value)
              }}
            />
            {types.length > 1 && (
              <SelectField
                label={t('admin:missions.picker.type')}
                value={type ?? ''}
                placeholder={t('admin:missions.picker.allTypes')}
                options={types.map((value) => ({ value, label: typeLabel(value) }))}
                onChange={(event) => {
                  setType(event.target.value === '' ? null : event.target.value)
                }}
              />
            )}
          </div>
          {term.length >= 2 &&
            (results.isPending ? (
              <p className="text-xs text-muted">{t('admin:missions.picker.searching')}</p>
            ) : results.isError ? (
              <p role="alert" className="text-xs text-danger">
                {t('admin:missions.picker.searchFailed')}
              </p>
            ) : found.length === 0 ? (
              <p className="text-xs text-muted">{t('admin:missions.picker.noMatch')}</p>
            ) : (
              <ul aria-label={t('admin:missions.picker.resultsLabel')} className="flex flex-col gap-1">
                {found.map((product) => (
                  <li key={product.productId}>
                    <button
                      type="button"
                      className="w-full rounded-md border border-border px-3 py-2 text-left text-sm text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
                      onClick={() => {
                        onChange(product.productId)
                        setSearching(false)
                        setQuery('')
                      }}
                    >
                      {t('admin:missions.picker.choose', { name: product.name })}{' '}
                      <span className="text-muted">· {typeLabel(product.type)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      )}
    </div>
  )
}
