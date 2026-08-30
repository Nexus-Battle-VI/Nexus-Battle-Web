import type { CSSProperties } from 'react'

type PublicAuthThemeVariables = CSSProperties & Record<`--${string}`, string>

/**
 * Paleta oscura de las pantallas publicas de autenticacion (Registro HU-01,
 * Login HU-02), acotada a esas pantallas mediante variables en linea sobre su
 * contenedor: no toca `src/index.css` ni repinta ninguna otra vista de la
 * aplicacion.
 *
 * Son los mismos valores que ya aprobo el Figma para HU-01 (ver
 * `src/features/account/registration/constants.ts` en la rama
 * `feature/HU-01-registro-jugador`, todavia no fusionada en `develop`).
 * Viven duplicados aqui porque ambas Historias de Usuario estan en ramas
 * distintas sin un ancestro comun que ya tenga este modulo compartido: no hay
 * forma de importar directamente de una rama que no existe en esta. Cuando
 * HU-01 se fusione, ambas pantallas deberian converger en esta unica copia en
 * lugar de mantener dos declaraciones de los mismos valores.
 *
 * Solo se declara el estado oscuro: es el unico que aprobo el Figma
 * suministrado para HU-02. Anadir aqui una variante clara inventada
 * incumpliria la instruccion de no inventar otra paleta.
 */
export const NEXUS_DARK_THEME: PublicAuthThemeVariables = {
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
}
