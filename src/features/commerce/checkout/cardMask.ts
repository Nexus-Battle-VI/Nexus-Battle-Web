const MAX_CARD_DIGITS = 16
const MAX_SECURITY_DIGITS = 4
const MAX_EXPIRY_DIGITS = 4

/**
 * Mascaras de entrada del formulario de pago (HU-59 + correccion de formato).
 *
 * Solo dan FORMATO a lo que ya escribe la persona: no validan marca, no
 * calculan Luhn ni longitudes bancarias -esa es una decision deliberada de
 * `validation.ts`, ver su comentario, y sigue intacta-. El unico dato que se
 * ve distinto de como se envia es el numero de tarjeta: lo que se muestra
 * esta agrupado en bloques de 4 para leerlo mejor, pero lo que viaja a
 * `checkout/api.ts` es siempre el PAN canonico (solo digitos), nunca con los
 * espacios de agrupacion.
 */

/** Deja solo digitos y recorta a 16: el PAN canonico, lo que se envia al backend. */
export const sanitizeCardNumber = (raw: string): string =>
  raw.replace(/\D/g, '').slice(0, MAX_CARD_DIGITS)

/** El PAN canonico agrupado en bloques de 4 para mostrarlo: "4111 1111 1111 1111". */
export const formatCardNumber = (digits: string): string => digits.replace(/(.{4})(?=.)/g, '$1 ')

/** Deja solo digitos y recorta a 4 (MMAA): el vencimiento sin formatear aun. */
export const sanitizeExpiryDigits = (raw: string): string =>
  raw.replace(/\D/g, '').slice(0, MAX_EXPIRY_DIGITS)

/** "MMAA" a "MM/AA": inserta la barra automaticamente en cuanto empieza el año. */
export const formatExpiry = (digits: string): string =>
  digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits

/** Deja solo digitos y recorta a 4: el codigo de seguridad (3-4 digitos). */
export const sanitizeSecurityCode = (raw: string): string =>
  raw.replace(/\D/g, '').slice(0, MAX_SECURITY_DIGITS)

/** Cuantos digitos hay en `value` antes de la posicion `cursor`. */
export const digitsBeforeCursor = (value: string, cursor: number): number =>
  value.slice(0, cursor).replace(/\D/g, '').length

/**
 * Posicion, dentro de `formatted`, que deja exactamente `digitCount` digitos
 * a su izquierda (saltandose separadores como el espacio o la barra). Con
 * esto se recoloca el cursor tras strip+reformat sin romper la edicion
 * natural (borrar o escribir en medio del numero, no solo al final).
 */
export const caretPositionForDigitCount = (formatted: string, digitCount: number): number => {
  if (digitCount <= 0) return 0

  let seen = 0
  for (let index = 0; index < formatted.length; index++) {
    if (/\d/.test(formatted.charAt(index))) {
      seen++
      if (seen === digitCount) return index + 1
    }
  }

  return formatted.length
}
