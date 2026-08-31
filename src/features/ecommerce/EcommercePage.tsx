import { useEffect, useMemo, useState } from 'react'

import { Card } from '@/components/ui/Card'
import {
  CATEGORY_LABEL,
  CATEGORY_OPTIONS,
  PAGE_SIZE,
  PRODUCTS,
  finalPrice,
  formatMoney,
  isPremium,
  type Category,
  type Product,
} from './catalog-fixtures'
import {
  deleteNamedCart,
  loadActiveCart,
  loadNamedCarts,
  saveActiveCart,
  upsertNamedCart,
  type CartItem,
  type NamedCart,
} from './cart-store'
import {
  formatCardNumber,
  formatCvv,
  formatExpiry,
  formatTitular,
  sendPurchaseConfirmation,
  simulateCheckout,
  validatePaymentForm,
  type PaymentForm,
} from './checkout'
import { foldText, searchRank } from './search'

const CUSTOMER_ID = 'cliente-nexus'
const CUSTOMER_EMAIL = 'cliente.nexus@nexusbattles.local'

const EMPTY_FORM: PaymentForm = {
  titular: '',
  numeroTarjeta: '',
  fechaVencimiento: '',
  codigoSeguridad: '',
}

/**
 * Vitrina de E-commerce (HU-57, 56, 58, 59, 60, 61).
 *
 * Los productos son fixtures de prueba, no el catalogo oficial de Gama.
 * El cobro es simulado: no se guarda la tarjeta ni hay SMTP.
 */
export const EcommercePage = (): React.JSX.Element => {
  const [products, setProducts] = useState<Product[]>(PRODUCTS)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<Category | ''>('')
  const [onlyPromo, setOnlyPromo] = useState(false)
  const [page, setPage] = useState(1)
  const [cart, setCart] = useState<CartItem[]>(() => loadActiveCart(CUSTOMER_ID))
  const [savedCarts, setSavedCarts] = useState<NamedCart[]>(() => loadNamedCarts(CUSTOMER_ID))
  const [cartName, setCartName] = useState('')
  const [paying, setPaying] = useState(false)
  const [form, setForm] = useState<PaymentForm>(EMPTY_FORM)
  const [payMessage, setPayMessage] = useState<string | null>(null)

  useEffect(() => {
    saveActiveCart(CUSTOMER_ID, cart)
  }, [cart])

  const results = useMemo(() => {
    const tokens = foldText(query.trim()).split(/\s+/).filter(Boolean)
    return products
      .map((product) => {
        const rank = searchRank(product, tokens)
        if (rank === null) return null
        if (type !== '' && product.category !== type) return null
        if (onlyPromo && product.discountPct <= 0) return null
        return { product, rank }
      })
      .filter((row): row is { product: Product; rank: number } => row !== null)
      .sort((a, b) => a.rank - b.rank || a.product.name.localeCompare(b.product.name, 'es'))
      .map((row) => row.product)
  }, [products, query, type, onlyPromo])

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const cartLines = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.id)
      if (!product) return null
      return { product, qty: item.qty, subtotal: finalPrice(product) * item.qty }
    })
    .filter((line): line is { product: Product; qty: number; subtotal: number } => line !== null)
  const cartCount = cartLines.reduce((sum, line) => sum + line.qty, 0)
  const total = cartLines.reduce((sum, line) => sum + line.subtotal, 0)

  function addToCart(product: Product) {
    setCart((prev) => {
      const found = prev.find((item) => item.id === product.id)
      if (found) {
        return prev.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item))
      }
      return [...prev, { id: product.id, qty: 1 }]
    })
  }

  function toggleWishlist(id: string) {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === id ? { ...product, wishlisted: !product.wishlisted } : product,
      ),
    )
  }

  async function confirmPay() {
    const errors = validatePaymentForm(form)
    if (Object.values(errors).some(Boolean)) {
      setPayMessage(Object.values(errors).find(Boolean) ?? 'Datos invalidos.')
      return
    }
    const checkout = await simulateCheckout(
      {
        id: 'cart-sesion',
        userId: CUSTOMER_ID,
        items: cartLines.map((line) => ({
          id: line.product.id,
          name: line.product.name,
          qty: line.qty,
          price: line.subtotal / line.qty,
          isAvailable: true,
        })),
        total,
      },
      form,
    )
    if (!checkout.success) {
      setPayMessage(checkout.message)
      return
    }
    const mail = await sendPurchaseConfirmation(checkout, CUSTOMER_EMAIL, formatMoney(total))
    setProducts((prev) =>
      prev.map((product) =>
        cartLines.some((line) => line.product.id === product.id)
          ? { ...product, owned: true }
          : product,
      ),
    )
    setCart([])
    setPaying(false)
    setForm(EMPTY_FORM)
    setPayMessage(mail.message)
  }

  return (
    <Card title="E-commerce" description="Fixtures de prueba. No es el catalogo oficial de Gama.">
      <div className="flex flex-col gap-4">
        <label className="block text-sm font-medium text-ink" htmlFor="ecommerce-search">
          Buscar
          <input
            id="ecommerce-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Nombre, estadistica o precio"
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-ink" htmlFor="ecommerce-type">
            Tipo
            <select
              id="ecommerce-type"
              value={type}
              onChange={(event) => {
                setType(event.target.value as Category | '')
                setPage(1)
              }}
              className="ml-2 rounded-md border border-border bg-surface px-2 py-1 text-sm"
            >
              <option value="">Todos</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={onlyPromo}
              onChange={(event) => {
                setOnlyPromo(event.target.checked)
                setPage(1)
              }}
            />
            En promocion
          </label>
          <p className="text-sm text-muted">{results.length} resultados</p>
        </div>

        {results.length === 0 ? (
          <p className="text-sm text-muted">
            Ningun producto coincide con la busqueda y los filtros.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {pageItems.map((product) => (
              <li key={product.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-ink">{product.name}</h3>
                  {isPremium(product) && (
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900">
                      Premium
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-brand">{formatMoney(finalPrice(product))}</p>
                <p className="mt-1 text-xs text-muted">
                  {CATEGORY_LABEL[product.category]} · {product.abilities.join(' · ')}
                </p>
                {product.discountPct > 0 && (
                  <p className="mt-1 text-xs font-semibold text-ink">-{product.discountPct}%</p>
                )}
                {product.owned && <p className="mt-1 text-xs font-semibold text-ink">Propio</p>}
                {product.wishlisted && <p className="mt-1 text-xs text-ink">En deseos</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-border px-2 py-1 text-xs"
                    onClick={() => {
                      toggleWishlist(product.id)
                    }}
                  >
                    Lista de deseos
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-brand px-2 py-1 text-xs text-white"
                    onClick={() => {
                      addToCart(product)
                    }}
                  >
                    Enviar al carrito
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => {
                setPage((value) => value - 1)
              }}
              className="rounded-md border border-border px-2 py-1 text-sm disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => {
                setPage((value) => value + 1)
              }}
              className="rounded-md border border-border px-2 py-1 text-sm disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        )}

        <section className="rounded-lg border border-border p-3" aria-label="Carrito">
          <h3 className="font-semibold text-ink">Carrito ({cartCount})</h3>
          {cartLines.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Tu carrito esta vacio</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {cartLines.map((line) => (
                <li
                  key={line.product.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>
                    {line.product.name} ×{line.qty}
                  </span>
                  <span>{formatMoney(line.subtotal)}</span>
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => {
                      setCart((prev) => prev.filter((item) => item.id !== line.product.id))
                    }}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-sm font-semibold text-ink">Total {formatMoney(total)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={cartName}
              onChange={(event) => {
                setCartName(event.target.value)
              }}
              placeholder="Nombre del carrito"
              className="rounded-md border border-border px-2 py-1 text-sm"
            />
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-sm"
              onClick={() => {
                const result = upsertNamedCart(CUSTOMER_ID, cartName, cart)
                if (typeof result === 'string') {
                  setPayMessage(result)
                  return
                }
                setSavedCarts(loadNamedCarts(CUSTOMER_ID))
                setCartName('')
              }}
            >
              Guardar carrito
            </button>
            <button
              type="button"
              disabled={cartLines.length === 0}
              className="rounded-md bg-brand px-2 py-1 text-sm text-white disabled:opacity-40"
              onClick={() => {
                setPaying(true)
                setPayMessage(null)
              }}
            >
              Proceder al pago
            </button>
          </div>
          {savedCarts.length > 0 && (
            <ul className="mt-2 text-sm">
              {savedCarts.map((saved) => (
                <li key={saved.id} className="flex gap-2">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      setCart(saved.items.map((item) => ({ ...item })))
                    }}
                  >
                    Cargar {saved.name}
                  </button>
                  <button
                    type="button"
                    className="text-xs"
                    onClick={() => {
                      setSavedCarts(deleteNamedCart(CUSTOMER_ID, saved.id))
                    }}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {paying && (
          <section className="rounded-lg border border-border p-3" aria-label="Simular pago">
            <h3 className="font-semibold text-ink">Simular pago</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input
                aria-label="Titular"
                value={form.titular}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, titular: formatTitular(event.target.value) }))
                }}
                placeholder="NOMBRE COMO APARECE EN LA TARJETA"
                className="rounded-md border border-border px-2 py-1 text-sm"
              />
              <input
                aria-label="Numero de tarjeta"
                value={form.numeroTarjeta}
                onChange={(event) => {
                  setForm((prev) => ({
                    ...prev,
                    numeroTarjeta: formatCardNumber(event.target.value),
                  }))
                }}
                placeholder="0000 0000 0000 0000"
                className="rounded-md border border-border px-2 py-1 text-sm"
              />
              <input
                aria-label="Vencimiento"
                value={form.fechaVencimiento}
                onChange={(event) => {
                  setForm((prev) => ({
                    ...prev,
                    fechaVencimiento: formatExpiry(event.target.value),
                  }))
                }}
                placeholder="MM/AA"
                className="rounded-md border border-border px-2 py-1 text-sm"
              />
              <input
                aria-label="CVV"
                value={form.codigoSeguridad}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, codigoSeguridad: formatCvv(event.target.value) }))
                }}
                placeholder="123"
                className="rounded-md border border-border px-2 py-1 text-sm"
              />
            </div>
            <button
              type="button"
              className="mt-3 rounded-md bg-brand px-3 py-2 text-sm text-white"
              onClick={() => void confirmPay()}
            >
              Confirmar pago simulado
            </button>
          </section>
        )}

        {payMessage && <p className="text-sm text-ink">{payMessage}</p>}
      </div>
    </Card>
  )
}
