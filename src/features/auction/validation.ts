import { i18n } from '@/shared/i18n/i18n'
export interface AuctionFormValues {
  readonly productId: string
  readonly durationHours: 24 | 48
  readonly minimumBidCredits: string
  readonly buyNowCredits: string
  readonly confirmed: boolean
}

export interface AuctionFormErrors {
  readonly productId?: string
  readonly minimumBidCredits?: string
  readonly buyNowCredits?: string
  readonly confirmed?: string
}

export interface OfficialAuctionFormValues {
  readonly productId: string
  readonly durationHours: 24 | 48
  readonly currency: string
  readonly minimumBidAmountMinor: string
  readonly buyNowAmountMinor: string
  readonly confirmed: boolean
}

export interface OfficialAuctionFormErrors {
  readonly productId?: string
  readonly currency?: string
  readonly minimumBidAmountMinor?: string
  readonly buyNowAmountMinor?: string
  readonly confirmed?: string
}

const positiveInteger = (value: string): number | null => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export const validateAuctionForm = (values: AuctionFormValues): AuctionFormErrors => {
  const minimum = positiveInteger(values.minimumBidCredits)
  const buyNow = values.buyNowCredits === '' ? null : positiveInteger(values.buyNowCredits)
  return {
    ...(values.productId === '' ? { productId: i18n.t('auction:validation.productRequired') } : {}),
    ...(minimum === null ? { minimumBidCredits: i18n.t('auction:validation.positiveNumber') } : {}),
    ...(values.buyNowCredits !== '' && buyNow === null
      ? { buyNowCredits: i18n.t('auction:validation.positiveNumber') }
      : buyNow !== null && minimum !== null && buyNow <= minimum
        ? { buyNowCredits: i18n.t('auction:validation.buyNowAboveMinimum') }
        : {}),
    ...(!values.confirmed ? { confirmed: i18n.t('auction:validation.confirmFee') } : {}),
  }
}

export const validateOfficialAuctionForm = (
  values: OfficialAuctionFormValues,
): OfficialAuctionFormErrors => {
  const minimum = positiveInteger(values.minimumBidAmountMinor)
  const buyNow = values.buyNowAmountMinor === '' ? null : positiveInteger(values.buyNowAmountMinor)
  return {
    ...(values.productId.trim() === ''
      ? { productId: i18n.t('auction:validation.productIdRequired') }
      : {}),
    ...(!/^[A-Z]{3}$/u.test(values.currency)
      ? { currency: i18n.t('auction:validation.currency') }
      : {}),
    ...(minimum === null
      ? { minimumBidAmountMinor: i18n.t('auction:validation.positiveInteger') }
      : {}),
    ...(values.buyNowAmountMinor !== '' && buyNow === null
      ? { buyNowAmountMinor: i18n.t('auction:validation.positiveInteger') }
      : buyNow !== null && minimum !== null && buyNow <= minimum
        ? { buyNowAmountMinor: i18n.t('auction:validation.aboveMinimum') }
        : {}),
    ...(!values.confirmed ? { confirmed: i18n.t('auction:validation.confirmCatalog') } : {}),
  }
}
