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
