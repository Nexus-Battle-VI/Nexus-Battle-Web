import { describe, expect, it } from 'vitest'

import {
  validateAuctionForm,
  validateOfficialAuctionForm,
  type AuctionFormValues,
  type OfficialAuctionFormValues,
} from './validation'

const valid = (): AuctionFormValues => ({
  productId: 'product-1',
  durationHours: 24,
  minimumBidCredits: '10',
  buyNowCredits: '20',
  confirmed: true,
})

describe('validateOfficialAuctionForm', () => {
  const validOfficial = (): OfficialAuctionFormValues => ({
    productId: 'exclusive-1',
    durationHours: 48,
    currency: 'COP',
    minimumBidAmountMinor: '90000',
    buyNowAmountMinor: '120000',
    confirmed: true,
  })

  it('acepta dinero en unidades menores y compra inmediata opcional', () => {
    expect(validateOfficialAuctionForm(validOfficial())).toEqual({})
    expect(validateOfficialAuctionForm({ ...validOfficial(), buyNowAmountMinor: '' })).toEqual({})
  })

  it('rechaza moneda, importes, producto y confirmacion invalidos', () => {
    expect(
      validateOfficialAuctionForm({
        ...validOfficial(),
        productId: ' ',
        currency: 'cop',
        minimumBidAmountMinor: '0',
        buyNowAmountMinor: '1.5',
        confirmed: false,
      }),
    ).toMatchObject({
      productId: expect.any(String),
      currency: expect.any(String),
      minimumBidAmountMinor: expect.any(String),
      buyNowAmountMinor: expect.any(String),
      confirmed: expect.any(String),
    })
  })

  it('exige que compra inmediata supere el minimo', () => {
    expect(
      validateOfficialAuctionForm({ ...validOfficial(), buyNowAmountMinor: '90000' }),
    ).toMatchObject({ buyNowAmountMinor: expect.any(String) })
  })
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
