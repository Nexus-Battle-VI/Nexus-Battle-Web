import type { Product } from './catalog-fixtures'
import {
  CATEGORY_LABEL,
  RARITY_LABEL,
  ROLE_LABEL,
  finalPrice,
  formatMoney,
  productStats,
} from './catalog-fixtures'

export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function contains(haystack: string, token: string): boolean {
  return haystack.includes(token)
}

/** 0 = mejor (nombre). Mayor = menos relevante. */
function tokenRank(product: Product, token: string): number | null {
  const name = foldText(product.name)
  if (name.startsWith(token)) return 0
  if (contains(name, token)) return 1

  const description = foldText(product.description)
  if (contains(description, token)) return 2

  const abilities = foldText(product.abilities.join(' '))
  if (contains(abilities, token)) return 3

  const stats = productStats(product)
  const statLine = foldText(
    `poder ${String(stats.poder)} vida ${String(stats.vida)} defensa ${String(stats.defensa)} ataque ${String(stats.ataque)} dano ${String(stats.dano)}`,
  )
  if (contains(statLine, token)) return 4

  const price = finalPrice(product)
  if (
    /^\d+$/.test(token) &&
    (String(price).includes(token) || String(product.price).includes(token))
  ) {
    return 5
  }

  const extra = foldText(
    [
      CATEGORY_LABEL[product.category],
      ROLE_LABEL[product.role],
      RARITY_LABEL[product.rarity],
      formatMoney(price),
      'cop',
      product.owned ? 'adquirido propio' : '',
      product.wishlisted ? 'deseos' : '',
      product.discountPct > 0 ? `promocion ${String(product.discountPct)}` : '',
      product.premium ? 'premium' : '',
    ].join(' '),
  )
  if (contains(extra, token)) return 6

  return null
}

export function searchRank(product: Product, tokens: string[]): number | null {
  if (tokens.length === 0) return 0
  let total = 0
  for (const token of tokens) {
    const rank = tokenRank(product, token)
    if (rank === null) return null
    total += rank
  }
  return total
}
