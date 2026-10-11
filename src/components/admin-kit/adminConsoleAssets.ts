/**
 * Manifiesto de los assets de PixelLab de la Consola del Consejo (EN-031): el
 * UNICO sitio que sabe que fichero de `public/assets/admin/` corresponde a cada
 * seccion de administracion. La escena del salon vive en `admin-kit.css`.
 *
 * Procedencia y licencia: `docs/assets/inventario-activos.md`.
 */
const BASE = '/assets/admin'

export type AdminTheme = 'dark' | 'light'

type ByTheme<T> = Readonly<Record<AdminTheme, T>>

const byTheme = (path: string): ByTheme<string> => ({
  dark: `${BASE}/${path}-dark.png`,
  light: `${BASE}/${path}-light.png`,
})

export const ADMIN_ICON_NAMES = [
  'console',
  'missions',
  'products',
  'new-product',
  'inventory',
  'banners',
  'roles',
  'metrics',
  'chatbot-model',
  'chatbot-knowledge',
  'chatbot-analytics',
  'chatbot-tickets',
  'moderation',
  'official-auction',
  'pending',
  'security',
] as const

export type AdminIconName = (typeof ADMIN_ICON_NAMES)[number]

export const adminIcons: Readonly<Record<AdminIconName, ByTheme<string>>> = Object.fromEntries(
  ADMIN_ICON_NAMES.map((name) => [name, byTheme(`icons/icon-${name}`)]),
) as Record<AdminIconName, ByTheme<string>>
