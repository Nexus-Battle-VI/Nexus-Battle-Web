import type { CSSProperties } from 'react'

/**
 * Datos fijos de HU-01 — Registro de cuenta de jugador.
 */

export interface SecurityQuestion {
  readonly id: string
  readonly label: string
}

/**
 * Las cuatro preguntas de seguridad definidas para HU-01.
 *
 * Son fijas: no hay nada que elegir, por lo que tampoco hay desplegable. Las
 * cuatro se muestran y las cuatro se responden.
 */
export const SECURITY_QUESTIONS: readonly SecurityQuestion[] = [
  { id: 'first-pet', label: '¿Cuál era el nombre de tu primera mascota?' },
  { id: 'birth-city', label: '¿Cuál es el nombre de la ciudad donde naciste?' },
  { id: 'childhood-nickname', label: '¿Cuál era tu apodo de la infancia?' },
  { id: 'parents-city', label: '¿Cuál es el nombre de la ciudad donde se conocieron tus padres?' },
]

export interface LegalDocument {
  readonly id: string
  readonly label: string
  /** `null` significa que el documento **no existe todavia**, no que no haga falta. */
  readonly href: string | null
}

/**
 * Documentos legales enlazados desde la aceptacion.
 *
 * Ambos `href` son `null` a proposito: en este repositorio no hay ningun PDF ni
 * pagina de terminos o privacidad. Redactar aqui un texto legal inventado seria
 * peor que no tenerlo, porque pareceria vinculante. Cuando existan, basta con
 * poner su URL aqui.
 */
export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  { id: 'terms', label: 'Términos y Condiciones', href: null },
  { id: 'privacy', label: 'Política de Privacidad', href: null },
]

export type Theme = 'light' | 'dark'

/** Clave de `localStorage`. Solo guarda la preferencia visual, nada del formulario. */
export const THEME_STORAGE_KEY = 'nexus-battles.register-theme'

/**
 * Paleta de la pantalla, **acotada a esta pantalla**.
 *
 * Se aplica como variables en linea sobre el contenedor de la pagina, no en la
 * hoja global: asi el conmutador Light/Dark de HU-01 no repinta ninguna otra
 * vista de la aplicacion. Se redefinen los mismos nombres de token del Design
 * System (`--color-surface`, `--color-ink`, ...) para poder seguir usando sus
 * utilidades (`bg-surface`, `text-muted`) en lugar de inventar otras nuevas.
 *
 * Los valores oscuros son los del Figma de Nexus Battles VI y se conservan tal
 * cual los entrega el diseno.
 */
type ThemeVariables = CSSProperties & Record<`--${string}`, string>

export const THEME_VARIABLES: Readonly<Record<Theme, ThemeVariables>> = {
  light: {
    colorScheme: 'light',
    '--color-surface': 'oklch(0.98 0.005 260)',
    '--color-surface-raised': 'oklch(1 0 0)',
    '--color-ink': 'oklch(0.22 0.02 260)',
    '--color-muted': 'oklch(0.52 0.02 260)',
    '--color-border': 'oklch(0.9 0.01 260)',
    '--color-brand': 'oklch(0.55 0.19 265)',
    '--color-brand-ink': 'oklch(0.98 0.01 265)',
    '--color-danger': 'oklch(0.5 0.2 25)',
    // Superficie de un campo dentro de un panel. El Design System todavia no
    // tiene un token para esto, y anadirlo seria un cambio transversal.
    '--nb-field': 'oklch(0.96 0.008 260)',
    '--nb-accent-soft': 'oklch(0.94 0.04 292)',
  },
  dark: {
    colorScheme: 'dark',
    '--color-surface': '#020617',
    '--color-surface-raised': '#0f1725',
    '--color-ink': '#f8fafc',
    '--color-muted': '#94a3b8',
    '--color-border': '#334155',
    '--color-brand': '#7c3aed',
    '--color-brand-ink': '#f8fafc',
    '--color-danger': '#f87171',
    '--nb-field': '#1e293b',
    '--nb-accent-soft': '#291759',
  },
}
