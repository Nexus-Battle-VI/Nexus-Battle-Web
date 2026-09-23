import { ThemeToggle } from '@/components/ui/ThemeToggle'

import { BidRegistrationCard } from '../BidRegistrationCard'

const PRODUCT = {
  name: 'Espada Legendaria Nexus',
  icon: '⚔️',
  summary: 'Arma mítica · Poder 95 · Rareza Épica',
}

const noop = (): void => undefined

export const BiddingDevPreview = (): React.JSX.Element => (
  <main className="mx-auto flex max-w-[1560px] flex-col gap-6 p-6">
    <header className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-muted">HU-63.8</p>
        <h1 className="text-xl font-semibold">Registro de puja (vista previa)</h1>
      </div>
      <ThemeToggle />
    </header>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] items-start gap-6">
      <BidRegistrationCard
        product={PRODUCT}
        stage="ready"
        currentBidCredits={1500}
        minimumBidCredits={100}
        availableCredits={5000}
        onRegister={noop}
      />
      <BidRegistrationCard
        product={PRODUCT}
        stage="processing"
        minimumBidCredits={100}
      />
      <BidRegistrationCard
        product={PRODUCT}
        stage="leading"
        minimumBidCredits={100}
        bidCredits={1600}
        onAccept={noop}
      />
      <BidRegistrationCard
        product={PRODUCT}
        stage="rejected"
        minimumBidCredits={100}
        errorMessage="La puja debe ser mayor a 1,600 créditos y cumplir con el incremento mínimo de 100."
        onRetry={noop}
      />
      <BidRegistrationCard
        product={PRODUCT}
        stage="own-auction"
        minimumBidCredits={100}
        onClose={noop}
      />
      <BidRegistrationCard
        product={PRODUCT}
        stage="cooldown"
        minimumBidCredits={100}
        onRetry={noop}
      />
      <BidRegistrationCard
        product={PRODUCT}
        stage="limit"
        minimumBidCredits={100}
        onClose={noop}
      />
      <BidRegistrationCard
        product={{ ...PRODUCT, icon: '📪' }}
        stage="outbid"
        minimumBidCredits={100}
        bidCredits={1600}
        onAccept={noop}
      />
    </div>
  </main>
)

