import { create } from 'zustand'

/**
 * Fuente unica de verdad del tema de la aplicacion (HU-05.4).
 *
 * Antes convivian cuatro mecanismos: la `@media (prefers-color-scheme)` de
 * `index.css`, el conmutador local de `RegistrationPage` con `THEME_VARIABLES` +
 * `localStorage`, la paleta `NEXUS_DARK_THEME` inline de las pantallas publicas y
 * los colores hex embebidos en `SessionControl`. Todos convergen aqui.
 *
 * El tema es **estado de cliente global** legitimo (una preferencia de la
 * persona que afecta a toda la interfaz), por eso vive en Zustand -ya presente en
 * el proyecto- y no en TanStack Query. Lo unico que se persiste es el propio
 * tema; ninguna otra informacion del usuario.
 *
 * La paleta vive en `src/index.css` (`:root`, `:root[data-theme='dark']`). Este
 * modulo solo decide y aplica `data-theme` sobre `document.documentElement`.
 */

export type Theme = 'light' | 'dark'

/** Clave global. Migra la historica de HU-01 (`nexus-battles.register-theme`). */
export const THEME_STORAGE_KEY = 'nexus-battles.theme'
const LEGACY_THEME_STORAGE_KEY = 'nexus-battles.register-theme'

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark'

/**
 * Preferencia explicita ya guardada, si existe.
 *
 * Orden: (1) clave global; (2) clave historica -y en ese caso se migra: se
 * escribe la global y se retira la historica-; (3) `null` si no hay ninguna.
 * Cualquier fallo de `localStorage` (modo privado, cuota) degrada a `null` sin
 * romper el arranque.
 */
export const readStoredTheme = (): Theme | null => {
  try {
    const current = globalThis.localStorage.getItem(THEME_STORAGE_KEY)

    if (isTheme(current)) {
      return current
    }

    const legacy = globalThis.localStorage.getItem(LEGACY_THEME_STORAGE_KEY)

    if (isTheme(legacy)) {
      try {
        globalThis.localStorage.setItem(THEME_STORAGE_KEY, legacy)
        globalThis.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY)
      } catch {
        // La migracion es best-effort: si no se puede escribir, se sigue
        // devolviendo la preferencia leida.
      }

      return legacy
    }

    return null
  } catch {
    return null
  }
}

/** Tema del sistema. `light` cuando `matchMedia` no existe (jsdom, entornos viejos). */
export const systemTheme = (): Theme => {
  if (typeof globalThis.matchMedia !== 'function') {
    return 'light'
  }

  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const persistTheme = (theme: Theme): void => {
  try {
    globalThis.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Sin almacenamiento la eleccion vive solo en esta pestana. Degradacion
    // aceptable: no debe romper el render.
  }
}

/** Refleja el tema resuelto en el documento para que la paleta de `index.css` aplique. */
const applyTheme = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme
}

const resolveInitialTheme = (): Theme => readStoredTheme() ?? systemTheme()

export interface ThemeState {
  /** Tema en uso (ya resuelto: nunca `null`, nunca `system`). */
  readonly theme: Theme
  /** `true` si la persona lo eligio explicitamente; `false` si viene del sistema. */
  readonly explicit: boolean
  /** Fija un tema concreto y lo persiste. */
  readonly setTheme: (theme: Theme) => void
  /** Alterna entre claro y oscuro. */
  readonly toggleTheme: () => void
}

const initialTheme = resolveInitialTheme()

// El primer import ya deja el documento coherente aunque `initTheme` no se llame
// (p. ej. en pruebas que montan un componente sin arrancar la app entera).
applyTheme(initialTheme)

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  explicit: readStoredTheme() !== null,

  setTheme: (theme) => {
    persistTheme(theme)
    applyTheme(theme)
    set({ theme, explicit: true })
  },

  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    persistTheme(next)
    applyTheme(next)
    set({ theme: next, explicit: true })
  },
}))

/**
 * Re-lee la preferencia (o el sistema) y la aplica. La llama `main.tsx` al
 * arrancar; en pruebas simula "volver a abrir la aplicacion".
 */
export const initTheme = (): void => {
  const resolved = resolveInitialTheme()
  applyTheme(resolved)
  useTheme.setState({ theme: resolved, explicit: readStoredTheme() !== null })
}
