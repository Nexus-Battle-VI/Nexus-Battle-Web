import { describe, expect, it } from 'vitest'

import { validateAuctionForm, type AuctionFormValues } from './validation'

const valid = (): AuctionFormValues => ({
  productId: 'product-1',
  durationHours: 24,
  minimumBidCredits: '10',
  buyNowCredits: '20',
  confirmed: true,
})

describe('validateAuctionForm', () => {
  it('acepta compra inmediata vacía o superior al mínimo', () => {
    expect(validateAuctionForm(valid())).toEqual({})
    expect(validateAuctionForm({ ...valid(), buyNowCredits: '' })).toEqual({})
  })

  it.each(['10', '9'])('rechaza compra inmediata %s menor o igual al mínimo', (buyNowCredits) => {
    expect(validateAuctionForm({ ...valid(), buyNowCredits })).toMatchObject({
      buyNowCredits: 'Debe ser mayor que el precio mínimo de puja.',
    })
  })

  it('exige producto, precio positivo y confirmación explícita', () => {
    expect(
      validateAuctionForm({
        ...valid(),
        productId: '',
        minimumBidCredits: '0',
        confirmed: false,
      }),
    ).toMatchObject({
      productId: expect.any(String),
      minimumBidCredits: expect.any(String),
      confirmed: expect.any(String),
    })
  })
})
