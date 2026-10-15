/**
 * Senales de invalidacion de Subasta (EN-034, ADR-024;
 * `docs/contracts/auction-realtime-v1.md` de Nexus-Battle-Infrastructure).
 *
 * Una senal NO es el estado de la subasta: solo dice que cambio y en que revision. La Web la usa
 * para invalidar su cache y volver a leer por HTTP; el estado autoritativo es siempre el del
 * backend (CA-06). `summary` es, como mucho, una pista.
 */
export const AUCTION_SIGNAL_REASONS = [
  'PUBLISHED',
  'BID_ACCEPTED',
  'BOUGHT_NOW',
  'SETTLED',
  'CANCELLED',
] as const

export type AuctionSignalReason = (typeof AUCTION_SIGNAL_REASONS)[number]

export interface AuctionSignal {
  readonly auctionId: string
  readonly revision: number
  readonly reason: AuctionSignalReason
}

const isReason = (value: unknown): value is AuctionSignalReason =>
  typeof value === 'string' && (AUCTION_SIGNAL_REASONS as readonly string[]).includes(value)

/**
 * Valida el cuerpo de una senal. Devuelve `null` ante cualquier forma inesperada: una senal mal
 * formada se ignora y nunca invalida cache a ciegas.
 */
export const parseAuctionSignal = (value: unknown): AuctionSignal | null => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const { auctionId, revision, reason } = value as Record<string, unknown>

  if (typeof auctionId !== 'string' || auctionId === '') {
    return null
  }

  if (typeof revision !== 'number' || !Number.isInteger(revision) || revision < 0) {
    return null
  }

  if (!isReason(reason)) {
    return null
  }

  return { auctionId, revision, reason }
}

/**
 * Recuerda la ultima `revision` vista por subasta y descarta lo que no sea posterior (CA-06: un
 * evento tardio o duplicado no puede deshacer lo que ya se invalido). `occurredAt` no se usa para
 * ordenar: la unica referencia es `revision`.
 *
 * Acepta la primera senal de una subasta aunque sea la revision 0 (`PUBLISHED`).
 */
export class RevisionTracker {
  private readonly latest = new Map<string, number>()

  /** `true` si la senal es nueva y se registra; `false` si es repetida o anterior. */
  accept(signal: AuctionSignal): boolean {
    const previous = this.latest.get(signal.auctionId)

    if (previous !== undefined && signal.revision <= previous) {
      return false
    }

    this.latest.set(signal.auctionId, signal.revision)
    return true
  }
}
