const FULL = new Intl.NumberFormat('es-CO')

/** Cifra completa con separador de miles de es-CO ("49.800"). */
export const fullCredits = (value: number): string => FULL.format(value)
const ONE_DECIMAL = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

/**
 * Cifra corta para pantallas estrechas ("49,8 mil", "1,2 M"). Propia en vez de
 * `notation: 'compact'`, cuya abreviatura cambia entre motores ("mil" / "k").
 * Trunca en lugar de redondear: nunca muestra mas creditos de los que hay.
 */
export const compactCredits = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) {
    return `${ONE_DECIMAL.format(Math.trunc(value / 100_000) / 10)} M`
  }

  if (Math.abs(value) >= 10_000) {
    return `${ONE_DECIMAL.format(Math.trunc(value / 100) / 10)} mil`
  }

  return FULL.format(value)
}
