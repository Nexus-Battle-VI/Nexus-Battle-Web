/**
 * Manifiesto de los assets de PixelLab del remaster de Autenticacion (EN-031):
 * Login, Registro, Recuperacion y las pantallas de sesion. Es el UNICO sitio
 * que sabe que fichero de `public/assets/auth/` corresponde a cada concepto,
 * con el mismo criterio que `missionsRemasterAssets.ts`. Los fondos de escena
 * viven en `auth.css`, como en los demas modulos.
 *
 * Procedencia y licencia: `docs/assets/inventario-activos.md`.
 */
const BASE = '/assets/auth'

export type AuthTheme = 'dark' | 'light'

type ByTheme<T> = Readonly<Record<AuthTheme, T>>

const byTheme = (path: string): ByTheme<string> => ({
  dark: `${BASE}/${path}-dark.png`,
  light: `${BASE}/${path}-light.png`,
})

export const AUTH_ICON_NAMES = [
  'user',
  'mail',
  'lock',
  'key',
  'shield',
  'eye',
  'eye-off',
  'scroll',
  'portrait',
  'question',
  'check',
  'alert',
  'hourglass',
  'authenticator',
  'exit',
  'bell',
] as const

export type AuthIconName = (typeof AUTH_ICON_NAMES)[number]

export const authIcons: Readonly<Record<AuthIconName, ByTheme<string>>> = Object.fromEntries(
  AUTH_ICON_NAMES.map((name) => [name, byTheme(`icons/icon-${name}`)]),
) as Record<AuthIconName, ByTheme<string>>

/** Sellos de los pasos del registro, en el orden del asistente. */
export const AUTH_STEP_SEALS = ['personal', 'avatar', 'security', 'terms'] as const

export type AuthStepSeal = (typeof AUTH_STEP_SEALS)[number]

export const authStepSeals: Readonly<Record<AuthStepSeal, ByTheme<string>>> = {
  personal: byTheme('ui/seal-personal'),
  avatar: byTheme('ui/seal-avatar'),
  security: byTheme('ui/seal-security'),
  terms: byTheme('ui/seal-terms'),
}

export const authAvatarFrame: ByTheme<string> = byTheme('ui/avatar-frame')
