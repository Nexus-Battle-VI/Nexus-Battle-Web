import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { ProductImage } from '@/components/ui/ProductImage'
import { Hero3D, heroIdOfProduct } from '@/shared/visual-library/heroes'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatMoney } from '@/lib/format'
import { countLabel, formatInteger } from '@/shared/i18n/format'
import { queryKeys } from '@/shared/query-keys'

import {
  configureProductDropChance,
  describeLifecycleStatusFailure,
  describeSearchFailure,
  dropChanceOf,
  searchAdministeredProducts,
  updateProductDetails,
  updateProductLifecycleStatus,
  type AdminProductSummary,
  type AdministeredProduct,
} from './api'
import { AvailabilityBadge } from './AvailabilityBadge'
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS, type ProductType } from './contract'
import { REQUIRES_DROP_CHANCE } from './draft'
import { DropChanceForm } from './DropChanceForm'
import { EditProductForm } from './EditProductForm'

const PAGE_SIZE = 20
const REASON_MIN_LENGTH = 10

type LifecycleFilter = 'ACTIVE' | 'SUSPENDED'

interface StatusAction {
  readonly productId: string
  readonly nextStatus: LifecycleFilter
}

export interface ProductManagementPageProps {
  /** Transporte inyectable, mismo patron que el resto de pantallas de admin/products. */
  readonly onSearch?: typeof searchAdministeredProducts
  readonly onUpdateStatus?: typeof updateProductLifecycleStatus
  readonly onUpdateDetails?: typeof updateProductDetails
  readonly onConfigureDropChance?: typeof configureProductDropChance
}

/**
 * Gestion de productos (pedido del profesor, dueno del producto,
 * 2026-09-26): el punto unico donde un Administrador busca, edita, elimina o
 * restaura productos del catalogo, y desde donde sigue creando productos
 * nuevos o ajustando el tiraje de uno existente.
 *
 * ANTES, "Crear producto" era el UNICO acceso de menu a esta area, y
 * `AdjustInventoryPage` solo se alcanzaba con un `productId` en la mano (URL
 * directa, sin enlace desde ningun listado). Esta pantalla no sustituye a
 * ninguna de las dos -sus rutas y sus guardas no cambian-, las ENLAZA.
 *
 * "ELIMINAR" ES UN BORRADO LOGICO (HU-35, Management#43): Catalog no expone
 * (ni expondra) un borrado fisico de producto, porque orfanaria las
 * referencias de quienes ya lo poseen en su inventario. Por eso "Eliminar" en
 * esta pantalla llama exactamente al mismo `PATCH .../status` que ya usa
 * `AdjustInventoryPage`, con `status: 'SUSPENDED'` y un motivo -"Restaurar" es
 * la misma llamada con `status: 'ACTIVE'`-, no un endpoint nuevo.
 *
 * BUSQUEDA Y PAGINACION SIGUEN LA MISMA CONVENCION que la vitrina publica
 * (`fetchShowcase`): `page` 1-based, filtros como parametros de consulta. El
 * termino se envia con el mismo retraso (300 ms) que "Mi Inventario", para
 * que teclear no dispare una consulta por pulsacion.
 */
export const ProductManagementPage = ({
  onSearch = searchAdministeredProducts,
  onUpdateStatus = updateProductLifecycleStatus,
  onUpdateDetails = updateProductDetails,
  onConfigureDropChance = configureProductDropChance,
}: ProductManagementPageProps = {}): React.JSX.Element => {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const [term, setTerm] = useState('')
  const [type, setType] = useState<ProductType | ''>('')
  const [lifecycleStatus, setLifecycleStatus] = useState<LifecycleFilter | ''>('')
  const [page, setPage] = useState(1)

  const debouncedTerm = useDebouncedValue(term, 300).trim()

  // Al cambiar la busqueda o un filtro se vuelve a la primera pagina: mismo
  // patron que "Mi Inventario" (comparar con el criterio anterior durante el
  // render, en vez de un efecto que llama a `setState`).
  const criterion = `${debouncedTerm}\u0000${type}\u0000${lifecycleStatus}`
  const [appliedCriterion, setAppliedCriterion] = useState(criterion)

  if (criterion !== appliedCriterion) {
    setAppliedCriterion(criterion)
    setPage(1)
  }

  // HABILIDAD no se vende por separado: va empaquetada con su HEROE (Tabla 7,
  // PI2). Se excluye del listado por defecto para no confundirla con un
  // producto gestionable de forma independiente; un administrador que
  // realmente necesite encontrarla (p. ej. para corregir una errata) la ve
  // igual seleccionando "Habilidad" en el filtro de tipo.
  const queryParams = {
    page,
    query: debouncedTerm,
    type: type === '' ? null : type,
    lifecycleStatus: lifecycleStatus === '' ? null : lifecycleStatus,
  }

  const listQuery = useQuery({
    queryKey: queryKeys.admin.products(queryParams),
    queryFn: ({ signal }) =>
      onSearch(
        {
          page,
          ...(debouncedTerm === '' ? {} : { query: debouncedTerm }),
          ...(type === '' ? { excludeType: 'HABILIDAD' } : { type }),
          ...(lifecycleStatus === '' ? {} : { lifecycleStatus }),
        },
        signal,
      ),
    // Mantiene la pagina anterior visible mientras llega la siguiente: evita
    // el parpadeo a "vacio" al pasar de pagina o teclear en la busqueda.
    placeholderData: keepPreviousData,
  })

  const items = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const pageSize = listQuery.data?.pageSize ?? PAGE_SIZE
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const [editingId, setEditingId] = useState<string | null>(null)
  const [dropChanceEditingId, setDropChanceEditingId] = useState<string | null>(null)
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | undefined>(undefined)
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  const invalidateList = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
  }

  const statusMutation = useMutation({
    mutationFn: ({ productId, nextStatus }: StatusAction) =>
      onUpdateStatus(productId, nextStatus, reason.trim()),
    onSuccess: () => {
      invalidateList()
      setBanner({ kind: 'success', message: t('admin:products.manage.statusUpdated') })
      setStatusAction(null)
      setReason('')
      setReasonError(undefined)
    },
  })

  const openStatusAction = (product: AdminProductSummary): void => {
    setBanner(null)
    setEditingId(null)
    setDropChanceEditingId(null)
    statusMutation.reset()
    setReason('')
    setReasonError(undefined)
    setStatusAction({
      productId: product.productId,
      nextStatus: product.lifecycleStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
    })
  }

  const cancelStatusAction = (): void => {
    setStatusAction(null)
    setReason('')
    setReasonError(undefined)
  }

  const confirmStatusAction = (event: React.SyntheticEvent): void => {
    event.preventDefault()

    if (statusAction === null) {
      return
    }

    const value = reason.trim()

    if (value.length < REASON_MIN_LENGTH) {
      setReasonError(t('admin:products.manage.reasonMin', { min: String(REASON_MIN_LENGTH) }))
      return
    }

    setReasonError(undefined)
    statusMutation.mutate(statusAction)
  }

  const openEdit = (productId: string): void => {
    setBanner(null)
    setStatusAction(null)
    setDropChanceEditingId(null)
    setEditingId((current) => (current === productId ? null : productId))
  }

  const handleEditSuccess = (updated: AdministeredProduct): void => {
    invalidateList()
    setBanner({
      kind: 'success',
      message: t('admin:products.manage.editSaved', { name: updated.name }),
    })
    setEditingId(null)
  }

  const openDropChance = (productId: string): void => {
    setBanner(null)
    setStatusAction(null)
    setEditingId(null)
    setDropChanceEditingId((current) => (current === productId ? null : productId))
  }

  const handleDropChanceSuccess = (updated: AdministeredProduct): void => {
    invalidateList()
    setBanner({
      kind: 'success',
      message: t('admin:products.manage.dropChanceSaved', { name: updated.name }),
    })
    setDropChanceEditingId(null)
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <Breadcrumb
        items={[
          { label: t('admin:home'), to: '/ecommerce' },
          { label: t('admin:products.manage.crumb') },
        ]}
      />

      <header className="mt-6 mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">
            {t('admin:products.eyebrow')}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            {t('admin:products.manage.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('admin:products.manage.intro')}</p>
        </div>

        <Link to="/admin/products/new">
          <Button type="button">{t('admin:products.manage.createNew')}</Button>
        </Link>
      </header>

      {banner !== null && (
        <p
          role={banner.kind === 'success' ? 'status' : 'alert'}
          className={
            banner.kind === 'success'
              ? 'mb-4 rounded-lg border border-brand bg-brand/10 p-3 text-sm text-ink'
              : 'mb-4 rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger'
          }
        >
          {banner.message}
        </p>
      )}

      <div className="mb-6 grid gap-4 rounded-lg border border-border bg-surface-raised p-4 sm:grid-cols-3">
        <TextField
          label={t('admin:products.manage.search')}
          type="search"
          placeholder={t('admin:products.manage.searchPlaceholder')}
          value={term}
          onChange={(event) => {
            setTerm(event.target.value)
          }}
        />

        <SelectField
          label={t('admin:products.manage.typeFilter')}
          value={type}
          placeholder={t('admin:products.manage.allTypes')}
          options={PRODUCT_TYPES.map((productType) => ({
            value: productType,
            label: PRODUCT_TYPE_LABELS[productType],
          }))}
          onChange={(event) => {
            setType(event.target.value as ProductType | '')
          }}
        />

        <SelectField
          label={t('admin:products.manage.statusFilter')}
          value={lifecycleStatus}
          placeholder={t('admin:products.manage.allStatuses')}
          options={[
            { value: 'ACTIVE', label: t('admin:products.adjust.active') },
            { value: 'SUSPENDED', label: t('admin:products.adjust.suspended') },
          ]}
          onChange={(event) => {
            setLifecycleStatus(event.target.value as LifecycleFilter | '')
          }}
        />
      </div>

      {!listQuery.isLoading && listQuery.error === null && (
        <p role="status" className="mb-3 text-xs text-muted">
          {countLabel(t, 'admin:products.manage.resultsCount', total)}
        </p>
      )}

      {listQuery.isLoading && (
        <p role="status" className="text-sm text-muted">
          {t('admin:products.manage.loading')}
        </p>
      )}

      {!listQuery.isLoading && listQuery.error !== null && (
        <p role="alert" className="text-sm text-danger">
          {describeSearchFailure(listQuery.error)}
        </p>
      )}

      {!listQuery.isLoading && listQuery.error === null && total === 0 && (
        <p className="text-sm text-muted">{t('admin:products.manage.empty')}</p>
      )}

      {!listQuery.isLoading && listQuery.error === null && total > 0 && (
        <>
          <ul className="space-y-4" data-testid="product-management-list">
            {items.map((product) => (
              <li key={product.productId}>
                <div className="rounded-lg border border-border bg-surface-raised p-4">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border">
                      {(() => {
                        const heroId = heroIdOfProduct(product.type, product.sku)
                        return heroId === null ? (
                          <ProductImage
                            source={product.imageUrl}
                            name={product.name}
                            className="size-full object-contain"
                          />
                        ) : (
                          <Hero3D heroId={heroId} className="size-full [&>p]:hidden" />
                        )
                      })()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-ink">{product.name}</h2>
                        <span
                          className={
                            product.lifecycleStatus === 'ACTIVE'
                              ? 'rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success'
                              : 'rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-medium text-danger'
                          }
                        >
                          {product.lifecycleStatus === 'ACTIVE'
                            ? t('admin:products.adjust.active')
                            : t('admin:products.adjust.suspended')}
                        </span>
                        <AvailabilityBadge availableUnits={product.availableUnits} />
                      </div>

                      <p className="mt-1 text-xs text-muted">
                        SKU {product.sku} · {PRODUCT_TYPE_LABELS[product.type]}
                      </p>

                      {product.type === 'HABILIDAD' && (
                        <p className="mt-1 text-xs text-muted italic">
                          {t('admin:products.manage.bundledWithHero')}
                        </p>
                      )}

                      <p className="mt-1 text-sm text-ink">
                        {t('admin:products.review.creditsValue', {
                          value: formatInteger(product.creditsPrice),
                        })}
                        {product.premium && product.realMoneyPrice !== null && (
                          <>
                            {' · '}
                            {formatMoney(
                              product.realMoneyPrice.amount,
                              product.realMoneyPrice.currency,
                            )}
                          </>
                        )}
                        {!product.premium && (
                          <span className="text-muted">
                            {' '}
                            · {t('admin:products.manage.notPremium')}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        aria-expanded={editingId === product.productId}
                        onClick={() => {
                          openEdit(product.productId)
                        }}
                      >
                        {t('admin:products.manage.edit')}
                      </Button>
                      <Link to={`/admin/products/${product.productId}/inventory`}>
                        <Button type="button" variant="secondary">
                          {t('admin:products.manage.adjustInventory')}
                        </Button>
                      </Link>
                      {REQUIRES_DROP_CHANCE.has(product.type) && (
                        <Button
                          type="button"
                          variant={dropChanceOf(product) === null ? 'danger' : 'secondary'}
                          aria-expanded={dropChanceEditingId === product.productId}
                          onClick={() => {
                            openDropChance(product.productId)
                          }}
                        >
                          {t('admin:products.manage.dropChance')}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant={product.lifecycleStatus === 'ACTIVE' ? 'danger' : 'primary'}
                        onClick={() => {
                          openStatusAction(product)
                        }}
                      >
                        {product.lifecycleStatus === 'ACTIVE'
                          ? t('admin:products.manage.suspend')
                          : t('admin:products.manage.restore')}
                      </Button>
                    </div>
                  </div>

                  {editingId === product.productId && (
                    <EditProductForm
                      productId={product.productId}
                      initialName={product.name}
                      initialImageUrl={product.imageUrl}
                      onSubmit={onUpdateDetails}
                      onSuccess={handleEditSuccess}
                      onCancel={() => {
                        setEditingId(null)
                      }}
                    />
                  )}

                  {dropChanceEditingId === product.productId && (
                    <DropChanceForm
                      productId={product.productId}
                      productName={product.name}
                      initialDropChanceBasisPoints={dropChanceOf(product)}
                      onSubmit={onConfigureDropChance}
                      onSuccess={handleDropChanceSuccess}
                      onCancel={() => {
                        setDropChanceEditingId(null)
                      }}
                    />
                  )}

                  {statusAction?.productId === product.productId && (
                    <form
                      onSubmit={confirmStatusAction}
                      aria-label={
                        statusAction.nextStatus === 'SUSPENDED'
                          ? t('admin:products.manage.confirmSuspendTitle', { name: product.name })
                          : t('admin:products.manage.confirmRestoreTitle', { name: product.name })
                      }
                      className="mt-4 space-y-3 rounded-lg border border-border bg-surface/60 p-3"
                    >
                      <p className="text-xs text-muted">
                        {statusAction.nextStatus === 'SUSPENDED'
                          ? t('admin:products.manage.suspendNote')
                          : t('admin:products.manage.restoreNote')}
                      </p>

                      <TextareaField
                        label={t('admin:products.manage.reason')}
                        required
                        value={reason}
                        error={reasonError}
                        hint={t('admin:products.manage.reasonHint', {
                          min: String(REASON_MIN_LENGTH),
                        })}
                        disabled={statusMutation.isPending}
                        onChange={(event) => {
                          setReason(event.target.value)
                          setReasonError(undefined)
                        }}
                      />

                      {statusMutation.isError && (
                        <p role="alert" className="text-sm text-danger">
                          {describeLifecycleStatusFailure(statusMutation.error)}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          variant={statusAction.nextStatus === 'SUSPENDED' ? 'danger' : 'primary'}
                          loading={statusMutation.isPending}
                        >
                          {statusAction.nextStatus === 'SUSPENDED'
                            ? t('admin:products.manage.confirmSuspendAction')
                            : t('admin:products.manage.confirmRestoreAction')}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={statusMutation.isPending}
                          onClick={cancelStatusAction}
                        >
                          {t('admin:products.manage.cancel')}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <nav
              aria-label={t('admin:products.manage.pagination')}
              className="mt-6 flex items-center justify-center gap-3"
            >
              <Button
                variant="secondary"
                disabled={page === 1}
                onClick={() => {
                  setPage((current) => Math.max(1, current - 1))
                }}
              >
                {t('admin:previous')}
              </Button>
              <span className="text-xs text-muted">
                {t('admin:products.manage.pageOf', {
                  page: String(page),
                  pages: String(pageCount),
                })}
              </span>
              <Button
                variant="secondary"
                disabled={page >= pageCount}
                onClick={() => {
                  setPage((current) => Math.min(pageCount, current + 1))
                }}
              >
                {t('admin:next')}
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
