import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { HttpError } from '@/lib/http'
import type { AuctionDetail } from '../detail-api'
import { registerBid, type RegisteredBid } from './api'
import { BidRegistrationCard, type BidRegistrationStage } from './BidRegistrationCard'

interface AuctionBidPanelProps {
  readonly auction: AuctionDetail
  readonly product: {
    readonly name: string
    readonly description?: string
  }
  readonly subject: string | null
  readonly availableCredits?: number
}

const createIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `bid-${String(Date.now())}-${Math.random().toString(36).slice(2)}`
}

const errorCode = (error: unknown): string | undefined => {
  if (!(error instanceof HttpError) || typeof error.body !== 'object' || error.body === null) {
    return undefined
  }

  const code = (error.body as { readonly code?: unknown }).code

  return typeof code === 'string' ? code : undefined
}

const errorMessage = (error: unknown): string | undefined => {
  if (!(error instanceof HttpError) || typeof error.body !== 'object' || error.body === null) {
    return undefined
  }

  const message = (error.body as { readonly message?: unknown }).message

  return typeof message === 'string' ? message : undefined
}

const stageFromError = (error: unknown): BidRegistrationStage => {
  switch (errorCode(error)) {
    case 'SELLER_CANNOT_BID':
      return 'own-auction'
    case 'BID_COOLDOWN_ACTIVE':
      return 'cooldown'
    case 'ACTIVE_BID_LIMIT_REACHED':
      return 'limit'
    default:
      return 'rejected'
  }
}

const messageForError = (error: unknown): string | undefined => {
  switch (errorCode(error)) {
    case 'BID_TOO_LOW':
      return 'La puja debe superar la oferta actual y cumplir con el incremento mínimo configurado.'
    case 'MINIMUM_INCREMENT_NOT_MET':
      return 'La puja no cumple con el incremento mínimo configurado.'
    case 'INSUFFICIENT_BID_CREDITS':
      return 'No tienes créditos disponibles suficientes para reservar esta puja.'
    default:
      return errorMessage(error)
  }
}

export const AuctionBidPanel = ({
  auction,
  product,
  subject,
  availableCredits,
}: AuctionBidPanelProps): React.JSX.Element => {
  const [stage, setStage] = useStateStage(auction, subject)
  const [registeredBid, setRegisteredBid] = useState<RegisteredBid | undefined>()
  const [lastError, setLastError] = useState<unknown>()

  const mutation = useMutation({
    mutationFn: ({ amountCredits, idempotencyKey }: { amountCredits: number; idempotencyKey: string }) =>
      registerBid(auction.id, { amountCredits }, idempotencyKey),
    onMutate: () => {
      setStage('processing')
      setLastError(undefined)
    },
    onSuccess: (result) => {
      setRegisteredBid(result)
      setStage('leading')
    },
    onError: (error) => {
      setLastError(error)
      setStage(stageFromError(error))
    },
  })

  return (
    <BidRegistrationCard
      product={{
        name: product.name,
        icon: '⚔️',
        ...(product.description === undefined ? {} : { summary: product.description }),
      }}
      stage={stage}
      {...(auction.currentBid === null
        ? {}
        : { currentBidCredits: auction.currentBid.amountCredits })}
      minimumBidCredits={auction.minimumBidCredits}
      {...(availableCredits === undefined ? {} : { availableCredits })}
      {...(registeredBid === undefined ? {} : { bidCredits: registeredBid.amountCredits })}
      {...(lastError === undefined
        ? {}
        : {
            errorMessage:
              messageForError(lastError) ??
              'La puja no cumple las reglas de la subasta. Revisa el monto e inténtalo de nuevo.',
          })}
      onRegister={(amountCredits) => {
        mutation.mutate({ amountCredits, idempotencyKey: createIdempotencyKey() })
      }}
      onRetry={() => {
        setStage('ready')
        setLastError(undefined)
      }}
      onClose={() => {
        setStage('ready')
        setLastError(undefined)
      }}
      onAccept={() => {
        setStage('ready')
      }}
    />
  )
}

const useStateStage = (
  auction: AuctionDetail,
  subject: string | null,
): [BidRegistrationStage, (stage: BidRegistrationStage) => void] => {
  const [stage, setStage] = useState<BidRegistrationStage>(
    subject !== null && subject === auction.sellerId ? 'own-auction' : 'ready',
  )

  return [stage, setStage]
}
