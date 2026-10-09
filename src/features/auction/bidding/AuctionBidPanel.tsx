import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { HttpError } from '@/lib/http'
import { queryKeys } from '@/shared/query-keys'
import { invalidateWallet } from '@/shared/wallet'
import type { PlayerAuctionDetail } from '../detail-api'
import { registerBid, type RegisteredBid } from './api'
import { BidRegistrationCard, type BidRegistrationStage } from './BidRegistrationCard'
import { i18n } from '@/shared/i18n/i18n'
import { currentLanguage } from '@/shared/i18n/language'

interface AuctionBidPanelProps {
  /** Solo PLAYER/CREDITS: una subasta oficial (HU-88) no admite pujas. */
  readonly auction: PlayerAuctionDetail
  readonly product: {
    readonly name: string
    readonly description?: string
    readonly imageUrl?: string
    readonly type?: string
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
    case 'MINIMUM_INCREMENT_NOT_MET':
    case 'INSUFFICIENT_BID_CREDITS':
      return i18n.t(`auction:bid.errors.${String(errorCode(error))}`)
    default:
      // El mensaje del servicio solo se muestra tal cual en español; en otro
      // idioma se usa el texto generico traducido.
      return currentLanguage() === 'es' ? errorMessage(error) : undefined
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

  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({
      amountCredits,
      idempotencyKey,
    }: {
      amountCredits: number
      idempotencyKey: string
    }) => registerBid(auction.id, { amountCredits }, idempotencyKey),
    onMutate: () => {
      setStage('processing')
      setLastError(undefined)
    },
    onSuccess: (result) => {
      setRegisteredBid(result)
      setStage('leading')
      // La puja reserva creditos: el saldo disponible (cabecera incluida) cambia.
      invalidateWallet(queryClient)
      // HU-88: bidCount/currentBid (detalle) y el historial de pujas tambien
      // cambiaron con esta puja; cada uno se invalida por separado -ninguno
      // es un refetch global- para que ambos reflejen el nuevo estado real.
      void queryClient.invalidateQueries({ queryKey: queryKeys.auction.detail(auction.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.auction.bidHistoryAll(auction.id) })
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
        ...(product.imageUrl === undefined ? {} : { imageUrl: product.imageUrl }),
        ...(product.type === undefined ? {} : { type: product.type }),
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
            errorMessage: messageForError(lastError) ?? i18n.t('auction:bid.defaultError'),
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
  auction: PlayerAuctionDetail,
  subject: string | null,
): [BidRegistrationStage, (stage: BidRegistrationStage) => void] => {
  const [stage, setStage] = useState<BidRegistrationStage>(
    subject !== null && subject === auction.sellerId ? 'own-auction' : 'ready',
  )

  return [stage, setStage]
}
