import { useState } from 'react'

import { ThemeToggle } from '@/components/ui/ThemeToggle'

import { ImmediatePurchaseCard, type ImmediatePurchaseTransaction } from '../ImmediatePurchaseCard'

/**
 * Harness de verificacion visual de HU-64.1 (solo `import.meta.env.DEV`).
 *
 * Reune los estados de Figma en una sola pantalla para revisarlos en claro y en
 * oscuro con el conmutador de tema. No llama a ninguna API: la orquestacion real
 * llega con HU-64.6.
 */
const SWORD = {
  name: 'Espada Legendaria Nexus',
  icon: '⚔️',
  summary: 'Arma mítica · Poder 95 · Rareza Épica',
}
const SHIELD = {
  name: 'Escudo Antiguo',
  icon: '🛡️',
  summary: 'Escudo raro · Defensa 80 · Rareza Rara',
}
const TRANSACTION: ImmediatePurchaseTransaction = {
  id: '#TXN-2692847',
  debitedCredits: 2500,
  remainingCredits: 2500,
}

const noop = (): void => undefined

const InteractiveCard = (): React.JSX.Element => {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <ImmediatePurchaseCard
      product={SWORD}
      stage="available"
      priceCredits={2500}
      availableCredits={5000}
      confirmed={confirmed}
      onConfirmedChange={setConfirmed}
      onBuy={noop}
    />
  )
}

export const ImmediatePurchaseDevPreview = (): React.JSX.Element => (
  <main className="mx-auto flex max-w-[1560px] flex-col gap-6 p-6">
    <header className="flex items-center justify-between gap-4">
      <h1 className="text-xl font-semibold">HU-64.1 — Compra inmediata (vista previa)</h1>
      <ThemeToggle />
    </header>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] items-start gap-6">
      <InteractiveCard />
      <ImmediatePurchaseCard
        product={SWORD}
        stage="available"
        priceCredits={2500}
        availableCredits={5000}
        confirmed={false}
        initialConfirmationAttempted
        onConfirmedChange={noop}
        onBuy={noop}
      />
      <ImmediatePurchaseCard
        product={SWORD}
        stage="available"
        priceCredits={2500}
        availableCredits={5000}
        confirmed
        onConfirmedChange={noop}
        onBuy={noop}
      />
      <ImmediatePurchaseCard
        product={SWORD}
        stage="processing"
        confirmed
        onConfirmedChange={noop}
        onBuy={noop}
      />
      <ImmediatePurchaseCard
        product={SWORD}
        stage="success"
        transaction={TRANSACTION}
        confirmed
        onConfirmedChange={noop}
        onBuy={noop}
      />
      <ImmediatePurchaseCard
        product={SWORD}
        stage="pending-pickup"
        transaction={TRANSACTION}
        pickupDeadline="27 de septiembre, 2026"
        confirmed
        onConfirmedChange={noop}
        onBuy={noop}
      />
      <ImmediatePurchaseCard
        product={{ name: SHIELD.name, icon: SHIELD.icon }}
        stage="unavailable"
        confirmed={false}
        onConfirmedChange={noop}
        onBuy={noop}
      />
      <ImmediatePurchaseCard
        product={SHIELD}
        stage="available"
        priceCredits={3000}
        availableCredits={2500}
        confirmed={false}
        onConfirmedChange={noop}
        onBuy={noop}
      />
      <ImmediatePurchaseCard
        product={SHIELD}
        stage="insufficient-credits"
        priceCredits={3000}
        availableCredits={2500}
        confirmed={false}
        onConfirmedChange={noop}
        onBuy={noop}
      />
    </div>
  </main>
)
