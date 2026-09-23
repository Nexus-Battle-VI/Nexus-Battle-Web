import { useId } from 'react'
import clsx from 'clsx'

import { Coins } from '@/components/ui/icons'

import { useBattleStake } from './useBattleStake'
import { describeOwnStake } from './stakePresentation'
import { useRefreshWalletOn, useWallet } from '@/shared/wallet'

export interface StakePanelProps {
  readonly roomId: string
  /** Sujeto autenticado; sin sesion no hay apuesta propia que mostrar. */
  readonly subject: string | null
}

/**
 * Apuesta de la batalla terminada (HU-23), aditivo a `BattleResultView` y
 * junto al panel de HU-22.
 *
 * NO CALCULA NADA: el monto y el estado llegan ya resueltos de Combat
 * (`GET /rooms/:roomId`), y el saldo final de Wallet (`GET /wallet/me`).
 * Mientras el estado no sea terminal se muestra el que publico el servidor
 * ("Reservando…", "Apuesta reservada"), nunca un resultado adelantado. Sin
 * apuesta propia no se renderiza NADA: no hay una seccion vacia que nadie
 * pidio.
 */
const TERMINAL_STAKE_STATES: ReadonlySet<string> = new Set([
  'RELEASED',
  'CAPTURED',
  'SETTLED_WON',
  'RESERVE_FAILED',
])

export const StakePanel = ({ roomId, subject }: StakePanelProps): React.JSX.Element | null => {
  const headingId = useId()
  const stakeQuery = useBattleStake(roomId, subject, subject !== null)
  const walletQuery = useWallet()
  const status = stakeQuery.data?.status ?? null
  // En cuanto Wallet confirma la liquidacion (o liberacion) se relee el saldo:
  // este panel y la cabecera muestran el mismo valor, nunca uno adelantado.
  useRefreshWalletOn(status !== null && TERMINAL_STAKE_STATES.has(status) ? status : null)

  if (subject === null) {
    return null
  }

  const stake = stakeQuery.data

  if (stake === undefined) {
    return null
  }

  const line = describeOwnStake(stake)

  if (line === null) {
    return null
  }

  return (
    <section
      aria-labelledby={headingId}
      className={clsx(
        'flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-3 sm:p-4',
        'motion-safe:transition-shadow motion-safe:duration-500',
      )}
    >
      <h2 id={headingId} className="sr-only">
        Apuesta de la batalla
      </h2>

      <p
        role="status"
        className="flex items-center justify-center gap-2 text-lg font-bold text-ink"
      >
        <Coins aria-hidden="true" className="h-5 w-5 text-brand" />
        {line}
      </p>

      {walletQuery.data !== undefined && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Saldo</span>
          <span aria-live="polite" className="tabular-nums font-semibold text-ink">
            {`${walletQuery.data.balance.toLocaleString('es-CO')} créditos`}
          </span>
        </div>
      )}
    </section>
  )
}
