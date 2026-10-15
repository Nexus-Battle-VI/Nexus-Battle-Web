import { describe, expect, it } from 'vitest'

import { parseAuctionSignal, RevisionTracker } from './signals'

describe('parseAuctionSignal', () => {
  it('acepta una senal valida y se queda solo con lo que necesita', () => {
    expect(
      parseAuctionSignal({
        signalVersion: 1,
        signalId: 'auction:a1:r3',
        auctionId: 'a1',
        revision: 3,
        reason: 'BID_ACCEPTED',
        occurredAt: '2026-10-07T12:00:00.000Z',
        summary: { status: 'ACTIVE', currentBidCredits: 25, bidCount: 2 },
      }),
    ).toEqual({ auctionId: 'a1', revision: 3, reason: 'BID_ACCEPTED' })
  })

  it.each(['PUBLISHED', 'BID_ACCEPTED', 'BOUGHT_NOW', 'SETTLED', 'CANCELLED'])(
    'acepta el motivo %s',
    (reason) => {
      expect(parseAuctionSignal({ auctionId: 'a1', revision: 0, reason })).toEqual({
        auctionId: 'a1',
        revision: 0,
        reason,
      })
    },
  )

  it.each([
    ['null', null],
    ['un texto', 'senal'],
    ['un numero', 7],
    ['sin auctionId', { revision: 1, reason: 'BID_ACCEPTED' }],
    ['auctionId vacio', { auctionId: '', revision: 1, reason: 'BID_ACCEPTED' }],
    ['auctionId numerico', { auctionId: 4, revision: 1, reason: 'BID_ACCEPTED' }],
    ['revision negativa', { auctionId: 'a1', revision: -1, reason: 'BID_ACCEPTED' }],
    ['revision fraccionaria', { auctionId: 'a1', revision: 1.5, reason: 'BID_ACCEPTED' }],
    ['revision como texto', { auctionId: 'a1', revision: '1', reason: 'BID_ACCEPTED' }],
    ['motivo desconocido', { auctionId: 'a1', revision: 1, reason: 'OTRO' }],
    ['sin motivo', { auctionId: 'a1', revision: 1 }],
  ])('descarta una senal mal formada: %s', (_name, value) => {
    expect(parseAuctionSignal(value)).toBeNull()
  })
})

describe('RevisionTracker (CA-06: lo repetido o anterior no cuenta)', () => {
  const signal = (auctionId: string, revision: number) => ({
    auctionId,
    revision,
    reason: 'BID_ACCEPTED' as const,
  })

  it('acepta la primera senal de una subasta, incluso la revision 0 (PUBLISHED)', () => {
    expect(new RevisionTracker().accept(signal('a1', 0))).toBe(true)
  })

  it('descarta una senal repetida y una anterior, y acepta una posterior', () => {
    const tracker = new RevisionTracker()

    expect(tracker.accept(signal('a1', 5))).toBe(true)
    expect(tracker.accept(signal('a1', 5))).toBe(false)
    expect(tracker.accept(signal('a1', 4))).toBe(false)
    expect(tracker.accept(signal('a1', 6))).toBe(true)
  })

  it('acepta un salto de revisiones: no exige que sean consecutivas', () => {
    const tracker = new RevisionTracker()

    expect(tracker.accept(signal('a1', 1))).toBe(true)
    expect(tracker.accept(signal('a1', 9))).toBe(true)
  })

  it('lleva la cuenta por subasta: la revision de una no afecta a otra', () => {
    const tracker = new RevisionTracker()

    expect(tracker.accept(signal('a1', 10))).toBe(true)
    expect(tracker.accept(signal('a2', 1))).toBe(true)
    expect(tracker.accept(signal('a2', 1))).toBe(false)
    expect(tracker.accept(signal('a1', 11))).toBe(true)
  })
})
