import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { HttpError } from '@/lib/http'
import type { AuctionDetail } from '../detail-api'
import { configureAutoBid, type AutoBidConfig } from './api'
import { AutoBidConfigCard, type AutoBidConfigStage } from './AutoBidConfigCard'
import { i18n } from '@/shared/i18n/i18n'
import { currentLanguage } from '@/shared/i18n/language'

interface AutoBidPanelProps {
  readonly auction: AuctionDetail
  readonly subject: string | null
  readonly availableCredits?: number
}

const createIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `auto-bid-${String(Date.now())}-${Math.random().toString(36).slice(2)}`
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

const stageFromError = (error: unknown): AutoBidConfigStage => {
  switch (errorCode(error)) {
    case 'SELLER_CANNOT_CONFIGURE_AUTO_BID':
      return 'own-auction'
    case 'AUCTION_NOT_ACTIVE':
      return 'auction-not-active'
    default:
      return 'rejected'
  }
}

const messageForError = (error: unknown): string | undefined => {
  switch (errorCode(error)) {
    case 'INVALID_AUTO_BID_LIMIT':
      return i18n.t('auction:autoBid.errors.INVALID_AUTO_BID_LIMIT')
    default:
      // El mensaje del servicio solo se muestra tal cual en español.
      return currentLanguage() === 'es' ? errorMessage(error) : undefined
  }
}

export const AutoBidPanel = ({
  auction,
  subject,
  availableCredits,
}: AutoBidPanelProps): React.JSX.Element => {
  const [stage, setStage] = useStateStage(auction, subject)
  const [config, setConfig] = useState<AutoBidConfig | undefined>()
  const [lastError, setLastError] = useState<unknown>()

  const mutation = useMutation({
    mutationFn: ({
      maxAmountCredits,
      idempotencyKey,
    }: {
      maxAmountCredits: number
      idempotencyKey: string
    }) => configureAutoBid(auction.id, { maxAmountCredits }, idempotencyKey),
    onMutate: () => {
      setStage('processing')
      setLastError(undefined)
    },
    onSuccess: (result) => {
      setConfig(result)
      setStage('configured')
    },
    onError: (error) => {
      setLastError(error)
      setStage(stageFromError(error))
    },
  })

  return (
    <AutoBidConfigCard
      stage={stage}
      {...(availableCredits === undefined ? {} : { availableCredits })}
      {...(config === undefined ? {} : { maxAmountCredits: config.maxAmountCredits })}
      {...(config === undefined ? {} : { configuredAt: config.configuredAt })}
      {...(lastError === undefined
        ? {}
        : {
            errorMessage: messageForError(lastError) ?? i18n.t('auction:autoBid.defaultError'),
          })}
      onConfigure={(maxAmountCredits) => {
        mutation.mutate({ maxAmountCredits, idempotencyKey: createIdempotencyKey() })
      }}
      onRetry={() => {
        setStage('ready')
        setLastError(undefined)
      }}
      onClose={() => {
        setStage('ready')
        setLastError(undefined)
      }}
    />
  )
}

const useStateStage = (
  auction: AuctionDetail,
  subject: string | null,
): [AutoBidConfigStage, (stage: AutoBidConfigStage) => void] => {
  const [stage, setStage] = useState<AutoBidConfigStage>(
    subject !== null && subject === auction.sellerId ? 'own-auction' : 'ready',
  )

  return [stage, setStage]
}
