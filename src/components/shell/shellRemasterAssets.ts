/**
 * Manifiesto de los assets de PixelLab del armazon comun (EN-031): el mundo
 * vivo de fondo y los iconos de la navegacion. Es el UNICO sitio que sabe que
 * fichero de `public/assets/shell/` corresponde a cada concepto, con el mismo
 * criterio que `missionsRemasterAssets.ts`. Las capas del mundo viven en
 * `src/app/shell.css`; aqui solo lo que pinta un `<img>`. Vive en una capa
 * compartida porque tambien lo usan features (Preferencias de Mi Cuenta).
 *
 * Procedencia y licencia: `docs/assets/inventario-activos.md`.
 */
const BASE = '/assets/shell'

export type ShellTheme = 'dark' | 'light'

type ByTheme<T> = Readonly<Record<ShellTheme, T>>

const byTheme = (path: string): ByTheme<string> => ({
  dark: `${BASE}/${path}-dark.png`,
  light: `${BASE}/${path}-light.png`,
})

export const NAV_ICON_NAMES = [
  'ecommerce',
  'play',
  'missions',
  'tournament',
  'inventory',
  'auction',
  'console',
  'menu',
  'close',
  'sound-on',
  'sound-off',
  'catalog',
  'community',
  'account',
  'logout',
  'gem',
] as const

export type NavIconName = (typeof NAV_ICON_NAMES)[number]

export const navIcons: Readonly<Record<NavIconName, ByTheme<string>>> = Object.fromEntries(
  NAV_ICON_NAMES.map((name) => [name, byTheme(`nav/icon-${name}`)]),
) as Record<NavIconName, ByTheme<string>>

/** Modulo de la navegacion principal que corresponde a una ruta, si tiene icono. */
export const navModuleForPath = (path: string): NavIconName | null => {
  const name = path.replace(/^\//u, '')
  return (NAV_ICON_NAMES as readonly string[]).includes(name) ? (name as NavIconName) : null
}
