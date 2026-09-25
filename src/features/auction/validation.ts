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
    ...(values.productId === '' ? { productId: 'Selecciona un producto de tu inventario.' } : {}),
    ...(minimum === null ? { minimumBidCredits: 'Ingresa un número entero mayor que cero.' } : {}),
    ...(values.buyNowCredits !== '' && buyNow === null
      ? { buyNowCredits: 'Ingresa un número entero mayor que cero.' }
      : buyNow !== null && minimum !== null && buyNow <= minimum
        ? { buyNowCredits: 'Debe ser mayor que el precio mínimo de puja.' }
        : {}),
    ...(!values.confirmed
      ? { confirmed: 'Confirma que deseas cobrar la comisión y bloquear el producto.' }
      : {}),
  }
}

export const validateOfficialAuctionForm = (
  values: OfficialAuctionFormValues,
): OfficialAuctionFormErrors => {
  const minimum = positiveInteger(values.minimumBidAmountMinor)
  const buyNow = values.buyNowAmountMinor === '' ? null : positiveInteger(values.buyNowAmountMinor)
  return {
    ...(values.productId.trim() === ''
      ? { productId: 'Ingresa el identificador del producto.' }
      : {}),
    ...(!/^[A-Z]{3}$/u.test(values.currency)
      ? { currency: 'Usa un código ISO 4217 de tres letras mayúsculas.' }
      : {}),
    ...(minimum === null ? { minimumBidAmountMinor: 'Ingresa un entero mayor que cero.' } : {}),
    ...(values.buyNowAmountMinor !== '' && buyNow === null
      ? { buyNowAmountMinor: 'Ingresa un entero mayor que cero.' }
      : buyNow !== null && minimum !== null && buyNow <= minimum
        ? { buyNowAmountMinor: 'Debe ser mayor que el precio mínimo.' }
        : {}),
    ...(!values.confirmed
      ? { confirmed: 'Confirma que Catalog decidirá la elegibilidad y la marca.' }
      : {}),
  }
}
