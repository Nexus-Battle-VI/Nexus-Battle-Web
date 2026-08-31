export interface CartItem {
  id: string
  qty: number
}

export interface ActiveCart {
  ownerId: string
  items: CartItem[]
}

export interface NamedCart {
  id: string
  ownerId: string
  name: string
  items: CartItem[]
  savedAt: number
}

const ACTIVE_KEY = 'nexus-demo-cart'
const SAVED_KEY = 'nexus-demo-saved-carts'

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function loadActiveCart(ownerId: string): CartItem[] {
  const parsed = readJson<ActiveCart | null>(ACTIVE_KEY, null)
  if (parsed?.ownerId === ownerId && Array.isArray(parsed.items)) {
    return parsed.items.filter((item) => item.id && item.qty > 0).map((item) => ({ ...item }))
  }
  try {
    const legacy = sessionStorage.getItem(ACTIVE_KEY)
    if (!legacy) return []
    const fromSession = JSON.parse(legacy) as ActiveCart
    if (fromSession.ownerId !== ownerId || !Array.isArray(fromSession.items)) return []
    const items = fromSession.items
      .filter((item) => item.id && item.qty > 0)
      .map((item) => ({ ...item }))
    saveActiveCart(ownerId, items)
    return items
  } catch {
    return []
  }
}

export function saveActiveCart(ownerId: string, items: CartItem[]): void {
  const next: ActiveCart = {
    ownerId,
    items: items.map((item) => ({ ...item })),
  }
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(next))
}

export function loadNamedCarts(ownerId: string): NamedCart[] {
  const all = readJson<NamedCart[]>(SAVED_KEY, [])
  if (!Array.isArray(all)) return []
  return all
    .filter((cart) => cart.ownerId === ownerId && cart.name && Array.isArray(cart.items))
    .sort((a, b) => b.savedAt - a.savedAt)
}

export function upsertNamedCart(
  ownerId: string,
  name: string,
  items: CartItem[],
): NamedCart | string {
  const trimmed = name.trim()
  if (!trimmed) return 'Escribe un nombre para el carrito.'
  if (items.length === 0) return 'No puedes guardar un carrito vacío.'

  const all = readJson<NamedCart[]>(SAVED_KEY, [])
  const others = all.filter((cart) => cart.ownerId !== ownerId || fold(cart.name) !== fold(trimmed))
  const existing = all.find((cart) => cart.ownerId === ownerId && fold(cart.name) === fold(trimmed))
  const next: NamedCart = {
    id: existing?.id ?? `cart-${String(Date.now())}`,
    ownerId,
    name: trimmed,
    items: items.map((item) => ({ ...item })),
    savedAt: Date.now(),
  }
  localStorage.setItem(SAVED_KEY, JSON.stringify([next, ...others]))
  return next
}

export function deleteNamedCart(ownerId: string, id: string): NamedCart[] {
  const remaining = readJson<NamedCart[]>(SAVED_KEY, []).filter(
    (cart) => !(cart.ownerId === ownerId && cart.id === id),
  )
  localStorage.setItem(SAVED_KEY, JSON.stringify(remaining))
  return remaining.filter((cart) => cart.ownerId === ownerId)
}
