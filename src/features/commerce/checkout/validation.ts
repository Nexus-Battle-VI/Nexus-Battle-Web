export interface CardForm {
  readonly holder: string
  readonly number: string
  readonly expiry: string
  readonly securityCode: string
}
export const EMPTY_CARD: CardForm = { holder: '', number: '', expiry: '', securityCode: '' }
export type CardField = keyof CardForm
export type CardErrors = Partial<Record<CardField, string>>

/** HU59 exige presencia; no define marcas, longitudes, Luhn ni formatos bancarios. */
export const validateCard = (card: CardForm): CardErrors => {
  const errors: CardErrors = {}
  if (card.holder.trim() === '') errors.holder = 'Escribe el nombre del titular.'
  if (card.number.trim() === '') errors.number = 'Escribe el numero de tarjeta de prueba.'
  if (card.expiry.trim() === '') errors.expiry = 'Escribe el vencimiento de la tarjeta de prueba.'
  if (card.securityCode.trim() === '')
    errors.securityCode = 'Escribe el codigo de seguridad de prueba.'
  return errors
}
export const isCardValid = (card: CardForm): boolean => Object.keys(validateCard(card)).length === 0
