import { i18n } from '@/shared/i18n/i18n'
/**
 * Presentación del Poder de un héroe en batalla (HU-11, RF-11).
 *
 * EL FRONTEND NO CALCULA LA REGLA: no gasta, no regenera, no restaura ni decide
 * si una habilidad se puede pagar. Eso lo hace Combat (`HeroPowerPolicy`) y aquí
 * solo se muestra el valor que Combat envía, tal cual, en cuanto llega.
 *
 * Lo único que se comprueba es que el dato sea presentable. La regla garantiza
 * `0 ≤ actual ≤ máximo` con enteros; si algo llega roto, dibujar una barra con un
 * porcentaje inventado o recortado le mostraría al jugador un Poder que el héroe
 * no tiene. Es preferible decir que no está disponible.
 */
export interface HeroPower {
  readonly current: number
  readonly max: number
}

export type PowerDisplay =
  | {
      readonly valid: true
      readonly current: number
      readonly max: number
      /** Porcentaje de la barra, entre 0 y 100. Con máximo 0 la barra queda vacía. */
      readonly percent: number
      /** Texto visible: `6/10`. */
      readonly text: string
      /** Texto para lectores de pantalla: `6 de 10`. */
      readonly spoken: string
    }
  | { readonly valid: false }

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0

export const describePower = (power: HeroPower): PowerDisplay => {
  const { current, max } = power as { readonly current: unknown; readonly max: unknown }

  if (!isNonNegativeInteger(current) || !isNonNegativeInteger(max) || current > max) {
    return { valid: false }
  }

  return {
    valid: true,
    current,
    max,
    percent: max === 0 ? 0 : (current / max) * 100,
    text: `${String(current)}/${String(max)}`,
    spoken: i18n.t('battle:power.spoken', { current: String(current), max: String(max) }),
  }
}
