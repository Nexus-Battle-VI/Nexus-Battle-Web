import { ThemeToggle } from '@/components/ui/ThemeToggle'

import { AutoBidConfigCard } from '../AutoBidConfigCard'

const noop = (): void => undefined

export const AutoBidDevPreview = (): React.JSX.Element => (
  <main className="mx-auto flex max-w-[1560px] flex-col gap-6 p-6">
    <header className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-muted">HU-67.6</p>
        <h1 className="text-xl font-semibold">Puja automática (vista previa)</h1>
      </div>
      <ThemeToggle />
    </header>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] items-start gap-6">
      <AutoBidConfigCard stage="ready" availableCredits={5000} onConfigure={noop} />
      <AutoBidConfigCard stage="processing" />
      <AutoBidConfigCard
        stage="configured"
        maxAmountCredits={5000}
        configuredAt="2026-09-22T12:00:00.000Z"
      />
      <AutoBidConfigCard
        stage="rejected"
        errorMessage="El límite debe ser un entero mayor que 0."
        onRetry={noop}
      />
      <AutoBidConfigCard stage="own-auction" onClose={noop} />
      <AutoBidConfigCard stage="auction-not-active" onClose={noop} />
    </div>
  </main>
)
