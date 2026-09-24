import { useDeferredValue, useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'

import { fetchCatalogProduct, searchCatalogProducts } from './missionContentApi'

const TYPE_LABELS: Readonly<Record<string, string>> = {
  ARMA: 'Arma',
  ARMADURA: 'Armadura',
  ITEM: 'Ítem',
  EPICA: 'Épica',
  HEROE: 'Héroe',
  HABILIDAD: 'Habilidad',
}

const typeLabel = (type: string): string => TYPE_LABELS[type] ?? type

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
        <p className="text-xs text-muted">
          Sin producto: el jugador no lo ve ni lo recibe hasta que lo enlaces.
        </p>
      ) : linked.isPending ? (
        <p className="text-xs text-muted">Buscando el producto enlazado…</p>
      ) : linked.data === null || linked.isError ? (
        <p className="text-xs text-danger">
          El producto enlazado ya no existe en Catalog. Elige otro.
        </p>
      ) : (
        <p className="text-sm text-ink">
          Enlazado a <span className="font-medium">{linked.data.name}</span> (
          {typeLabel(linked.data.type)})
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
          {searching ? 'Cerrar búsqueda' : productId === null ? 'Buscar producto' : 'Cambiar'}
        </Button>
        {productId !== null && (
          <Button
            variant="secondary"
            onClick={() => {
              onChange(null)
            }}
          >
            Quitar enlace
          </Button>
        )}
      </div>
      {searching && (
        <div className="flex flex-col gap-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <TextField
              label="Buscar en Catalog"
              value={query}
              placeholder="Escribe al menos 2 letras"
              onChange={(event) => {
                setQuery(event.target.value)
              }}
            />
            {types.length > 1 && (
              <SelectField
                label="Tipo"
                value={type ?? ''}
                placeholder="Todos"
                options={types.map((value) => ({ value, label: typeLabel(value) }))}
                onChange={(event) => {
                  setType(event.target.value === '' ? null : event.target.value)
                }}
              />
            )}
          </div>
          {term.length >= 2 &&
            (results.isPending ? (
              <p className="text-xs text-muted">Buscando…</p>
            ) : results.isError ? (
              <p role="alert" className="text-xs text-danger">
                No se pudo consultar Catalog.
              </p>
            ) : found.length === 0 ? (
              <p className="text-xs text-muted">Ningún producto coincide.</p>
            ) : (
              <ul aria-label="Productos encontrados" className="flex flex-col gap-1">
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
                      Elegir {product.name}{' '}
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
