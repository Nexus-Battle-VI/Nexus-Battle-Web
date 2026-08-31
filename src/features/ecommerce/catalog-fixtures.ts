/**
 * Fixtures locales de demostracion (HU-57).
 * No son el catalogo oficial de Gama ni se publican a Nexus-Battle-Catalog.
 */
export type Category = 'hero' | 'skill' | 'weapon' | 'armor' | 'item' | 'epic'
export type Role = 'warrior' | 'mage' | 'rogue' | 'healer'
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Product {
  id: string
  name: string
  category: Category
  role: Role
  rarity: Rarity
  description: string
  abilities: [string, string]
  price: number
  discountPct: number
  wishlisted: boolean
  owned: boolean
  premium?: boolean
}

export function isPremium(p: Product): boolean {
  return Boolean(p.premium)
}

export const ROLE_LABEL: Record<Role, string> = {
  warrior: 'Guerrero',
  mage: 'Mago',
  rogue: 'Pícaro',
  healer: 'Sanador',
}

export const CATEGORY_LABEL: Record<Category, string> = {
  hero: 'Héroe',
  skill: 'Habilidad',
  weapon: 'Arma',
  armor: 'Armadura',
  item: 'Ítem',
  epic: 'Épica',
}

export const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'hero', label: 'Héroe' },
  { value: 'skill', label: 'Habilidad' },
  { value: 'weapon', label: 'Arma' },
  { value: 'armor', label: 'Armadura' },
  { value: 'item', label: 'Ítem' },
  { value: 'epic', label: 'Épica' },
]

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Común',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Legendario',
}

export const RARITY_OPTIONS: { value: Rarity; label: string }[] = [
  { value: 'common', label: 'Común' },
  { value: 'rare', label: 'Raro' },
  { value: 'epic', label: 'Épico' },
  { value: 'legendary', label: 'Legendario' },
]

export function formatMoney(value: number): string {
  const n = value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
  return `$ ${n} COP`
}

export function finalPrice(p: Product): number {
  return Math.round(p.price * (1 - p.discountPct / 100))
}

export function productInfoLine(p: Product): string {
  return [RARITY_LABEL[p.rarity], ROLE_LABEL[p.role], ...p.abilities].join(' · ')
}

export function productStats(product: Product) {
  const n = Number(product.id.replace(/\D/g, '')) || 1
  return {
    poder: 1 + (n % 4),
    vida: 16 + n * 2,
    defensa: 4 + (n % 9),
    ataque: 6 + (n % 10),
    dano: 2 + (n % 6),
  }
}

export const PRODUCTS: Product[] = [
  {
    id: 'p01',
    name: 'Espada de una mano',
    category: 'weapon',
    role: 'warrior',
    rarity: 'common',
    description: 'Filo equilibrado del Guerrero. Rápido y confiable en el frente.',
    abilities: ['+1 al ataque', '+1% crítico'],
    price: 20000,
    discountPct: 0,
    wishlisted: false,
    owned: true,
  },
  {
    id: 'p02',
    name: 'Báculo de Permafrost',
    premium: true,
    category: 'skill',
    role: 'mage',
    rarity: 'epic',
    description: 'Núcleo de hielo eterno que congela la ofensiva enemiga.',
    abilities: ['-1 daño oponente', '-2% crítico op.'],
    price: 30000,
    discountPct: 0,
    wishlisted: true,
    owned: false,
  },
  {
    id: 'p03',
    name: 'Escudo de dragón',
    premium: true,
    category: 'armor',
    role: 'warrior',
    rarity: 'rare',
    description: 'Placa forjada en escamas de dragón. Absorbe el castigo pesado.',
    abilities: ['+2 a la defensa', '+1 vida'],
    price: 40000,
    discountPct: 20,
    wishlisted: false,
    owned: false,
  },
  {
    id: 'p04',
    name: 'Túnica arcana',
    category: 'armor',
    role: 'mage',
    rarity: 'common',
    description: 'Tejido encantado que dispersa la energía hostil.',
    abilities: ['+1 a la defensa', '+2 vida'],
    price: 15000,
    discountPct: 0,
    wishlisted: false,
    owned: true,
  },
  {
    id: 'p05',
    name: 'Anillo de Piro-explosión',
    premium: true,
    category: 'item',
    role: 'mage',
    rarity: 'rare',
    description: 'Foco de ignición que sobrecarga cada conjuro de fuego.',
    abilities: ['+3 de daño', 'Caída 7%'],
    price: 25000,
    discountPct: 0,
    wishlisted: false,
    owned: false,
  },
  {
    id: 'p06',
    name: 'Martillo de tormenta',
    premium: true,
    category: 'weapon',
    role: 'warrior',
    rarity: 'epic',
    description: 'Descarga cinética que aturde y desangra al oponente.',
    abilities: ['Habilidad F', 'Habilidad C'],
    price: 50000,
    discountPct: 20,
    wishlisted: false,
    owned: false,
  },
  {
    id: 'p07',
    name: 'Flor de loto',
    category: 'item',
    role: 'rogue',
    rarity: 'common',
    description: 'Toxina de acción prolongada que corroe cada turno.',
    abilities: ['Veneno +4d8', 'Caída 9%'],
    price: 18000,
    discountPct: 0,
    wishlisted: false,
    owned: false,
  },
  {
    id: 'p08',
    name: 'Botas del caminante',
    category: 'armor',
    role: 'rogue',
    rarity: 'rare',
    description: 'Suela silenciosa que mejora la evasión del Pícaro.',
    abilities: ['+2 a la defensa', '+1 vida'],
    price: 22000,
    discountPct: 0,
    wishlisted: true,
    owned: false,
  },
  {
    id: 'p09',
    name: 'Cristal de maná',
    premium: true,
    category: 'item',
    role: 'mage',
    rarity: 'rare',
    description: 'Reserva condensada que acelera la recuperación de poder.',
    abilities: ['+2 poder/turno', 'Caída 5%'],
    price: 35000,
    discountPct: 0,
    wishlisted: false,
    owned: false,
  },
  {
    id: 'p10',
    name: 'Arco largo élfico',
    category: 'weapon',
    role: 'rogue',
    rarity: 'rare',
    description: 'Precisión a distancia con tensión reforzada.',
    abilities: ['+2 al ataque', '+2% crítico'],
    price: 28000,
    discountPct: 0,
    wishlisted: false,
    owned: true,
  },
  {
    id: 'p11',
    name: 'Mangual del verdugo',
    category: 'weapon',
    role: 'warrior',
    rarity: 'common',
    description: 'Cabeza con púas que ignora parte de la armadura enemiga.',
    abilities: ['+2 daño 2 turnos', 'Caída 10%'],
    price: 20000,
    discountPct: 20,
    wishlisted: false,
    owned: false,
  },
  {
    id: 'p12',
    name: 'Amuleto de vacío',
    premium: true,
    category: 'item',
    role: 'mage',
    rarity: 'common',
    description: 'Reliquia que retorna parte del daño recibido.',
    abilities: ['Reflejo 0d4', 'Caída 4%'],
    price: 12000,
    discountPct: 0,
    wishlisted: true,
    owned: false,
  },
  {
    id: 'p13',
    name: 'Orbe del oráculo',
    premium: true,
    category: 'skill',
    role: 'healer',
    rarity: 'epic',
    description: 'Foco de sanación que amplifica el Canto del Bosque.',
    abilities: ['+2 sanación', 'Caída 3%'],
    price: 45000,
    discountPct: 0,
    wishlisted: false,
    owned: false,
  },
  {
    id: 'p14',
    name: 'Yelmo de mirmidón',
    category: 'armor',
    role: 'warrior',
    rarity: 'rare',
    description: 'Casco de guerra que refuerza defensa y vitalidad.',
    abilities: ['+2 a la defensa', '+1 vida'],
    price: 26000,
    discountPct: 0,
    wishlisted: false,
    owned: false,
  },
  {
    id: 'p15',
    name: 'Grimorio de ventisca',
    premium: true,
    category: 'skill',
    role: 'mage',
    rarity: 'epic',
    description: 'Compendio helado que potencia cada conjuro de hielo.',
    abilities: ['+2 de daño', 'Caída 10%'],
    price: 38000,
    discountPct: 0,
    wishlisted: false,
    owned: false,
  },
  {
    id: 'p16',
    name: 'Guardián rúnico',
    premium: true,
    category: 'epic',
    role: 'healer',
    rarity: 'legendary',
    description: 'Peto grabado con runas de protección del grupo.',
    abilities: ['+1 a la defensa', '+2 vida'],
    price: 60000,
    discountPct: 0,
    wishlisted: false,
    owned: true,
  },
  {
    id: 'p17',
    name: 'Daga purulenta',
    category: 'weapon',
    role: 'rogue',
    rarity: 'rare',
    description: 'Hoja impregnada de toxina con daño sostenido y críticos afilados.',
    abilities: ['+1 daño 2 turnos', '+3% crítico'],
    price: 24000,
    discountPct: 0,
    wishlisted: false,
    owned: false,
  },
  {
    id: 'p18',
    name: 'Warrior Tanque',
    premium: true,
    category: 'hero',
    role: 'warrior',
    rarity: 'rare',
    description: 'Héroe de vanguardia. Aguanta el frente y protege al grupo.',
    abilities: ['Poder 2', 'Vida 24 · Defensa 11'],
    price: 20000,
    discountPct: 0,
    wishlisted: false,
    owned: false,
  },
  {
    id: 'p19',
    name: 'Árbol de la vida',
    premium: true,
    category: 'item',
    role: 'healer',
    rarity: 'epic',
    description: 'Reliquia viva que restaura vitalidad al portador y al grupo.',
    abilities: ['+4 vida', '+1 sanación'],
    price: 32000,
    discountPct: 0,
    wishlisted: false,
    owned: false,
  },
]

export const PAGE_SIZE = 16
