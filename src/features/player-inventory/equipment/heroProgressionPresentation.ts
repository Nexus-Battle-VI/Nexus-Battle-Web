import type { HeroProgression } from '../heroSelectionApi'

/**
 * Presentacion de la progresion de un heroe (HU-08) para "Mi Inventario".
 *
 * NO REIMPLEMENTA LA TABLA DE UMBRALES. Player/Inventory ya entrega
 * `currentXp`, `floorForCurrentLevel` y `nextLevel.amount`: los tres son
 * lecturas de `ExperiencePolicy`, calculadas en el backend. Esta funcion solo
 * hace la resta y la razon que hacen falta para pintar una barra -aritmetica
 * de presentacion, no una regla de juego-. Si `ExperiencePolicy` cambiara la
 * tabla, este archivo no se toca: los numeros ya vendrian corregidos.
 */
export interface HeroProgressionPresentation {
  readonly level: number
  readonly maxLevel: number
  readonly isMaxLevel: boolean
  /** XP ACUMULADA total. La misma que publica el backend, sin recalcular. */
  readonly currentXp: number
  /** `null` en nivel maximo: no hay "siguiente nivel" al que apuntar. */
  readonly nextLevel: number | null
  /** XP dentro del nivel actual (`currentXp - floorForCurrentLevel`). */
  readonly xpIntoLevel: number
  /** XP que exige el nivel actual, de piso a techo. `null` en nivel maximo. */
  readonly xpRequiredForLevel: number | null
  /** Porcentaje 0-100 para el ancho de la barra. 100 en nivel maximo. */
  readonly percent: number
}

export const presentHeroProgression = (
  progression: HeroProgression,
): HeroProgressionPresentation => {
  const { level, maxLevel, currentXp, floorForCurrentLevel, nextLevel } = progression
  const xpIntoLevel = currentXp - floorForCurrentLevel

  if (nextLevel.status === 'MAX_LEVEL') {
    return {
      level,
      maxLevel,
      isMaxLevel: true,
      currentXp,
      nextLevel: null,
      xpIntoLevel,
      xpRequiredForLevel: null,
      percent: 100,
    }
  }

  const xpRequiredForLevel = nextLevel.amount - floorForCurrentLevel
  // Defensivo: un umbral mal formado no debe pintar una barra que desborde ni
  // divida por cero. No debería ocurrir -Player/Inventory ya lo garantiza-.
  // Se multiplica ANTES de dividir (`xpIntoLevel * 100`, no `xpIntoLevel / xpRequiredForLevel * 100`)
  // para no perder precisión de coma flotante en el paso intermedio: con enteros
  // pequeños, dividir primero puede convertir un 57,5 exacto en 57,499999999999996.
  const percent =
    xpRequiredForLevel <= 0
      ? 100
      : Math.min(100, Math.max(0, Math.round((xpIntoLevel * 100) / xpRequiredForLevel)))

  return {
    level,
    maxLevel,
    isMaxLevel: false,
    currentXp,
    nextLevel: nextLevel.forNextLevel,
    xpIntoLevel,
    xpRequiredForLevel,
    percent,
  }
}
