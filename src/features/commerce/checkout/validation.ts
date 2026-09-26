import { i18n } from '@/shared/i18n/i18n'
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
  if (card.holder.trim() === '') errors.holder = i18n.t('commerce:checkout.errors.holder')
  if (card.number.trim() === '') errors.number = i18n.t('commerce:checkout.errors.number')
  if (card.expiry.trim() === '') errors.expiry = i18n.t('commerce:checkout.errors.expiry')
  if (card.securityCode.trim() === '')
    errors.securityCode = i18n.t('commerce:checkout.errors.securityCode')
  return errors
}
export const isCardValid = (card: CardForm): boolean => Object.keys(validateCard(card)).length === 0
