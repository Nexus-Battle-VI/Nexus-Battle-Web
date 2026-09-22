import { useId } from 'react'
import clsx from 'clsx'

import { Coins, Trophy } from '@/components/ui/icons'

import { useBattleReward } from './useBattleReward'
import {
  chestProgressFraction,
  chestProgressText,
  describeDelivery,
  weeklyLimitReached,
  weeklyLimitText,
} from './rewardPresentation'
import { useWallet } from './useWallet'

export interface RewardPanelProps {
  readonly battleId: string
  /** Sujeto autenticado; sin sesion no hay creditos propios que mostrar. */
  readonly subject: string | null
}

/**
 * Creditos, progreso de cofre y recompensa de HU-22 (`hu-22-reward-contract-v1`
 * S10), aditivo a `BattleResultView` (HU-21): esa vista NUNCA muestra
 * creditos (D4), este panel es el unico lugar que lo hace.
 *
 * NO CALCULA NADA: `creditsEarned`, `balance`, `victoryProgress`,
 * `weeklyChestCount` y `chestEarned` llegan ya resueltos de Combat
 * (`GET .../reward`); `weeklyChestLimit`/`threshold` de Wallet
 * (`GET /wallet/me`). Recuperacion sin depender del evento en tiempo real:
 * `useBattleReward` sondea mientras la entrega no llega a un estado final.
 *
 * `creditsEarned === null` (una vez resuelta la consulta) significa que NO
 * existe un `RewardWorkflow` propio para esta batalla -- un espectador o un
 * participante `AI` -- y el panel no se muestra: no hay nada propio que
 * contar, y mostrar un "confirmando" indefinido seria enganoso.
 */
export const RewardPanel = ({ battleId, subject }: RewardPanelProps): React.JSX.Element | null => {
  const headingId = useId()
  const rewardQuery = useBattleReward(battleId, subject !== null)
  const walletQuery = useWallet()

  if (subject === null) {
    return null
  }

  const reward = rewardQuery.data

  if (reward?.creditsEarned == null) {
    return null
  }

  const wallet = walletQuery.data
  const delivery = describeDelivery(reward.rewardDelivery, reward.reward, reward.balance)
  const limitReached =
    wallet !== undefined &&
    reward.weeklyChestCount !== null &&
    weeklyLimitReached(reward.weeklyChestCount, wallet.weeklyChestLimit)

  return (
    <section
      aria-labelledby={headingId}
      className={clsx(
        'flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-3 sm:p-4',
        'motion-safe:transition-shadow motion-safe:duration-500',
      )}
    >
      <h2 id={headingId} className="sr-only">
        Créditos y recompensa
      </h2>

      <p
        role="status"
        className="flex items-center justify-center gap-2 text-lg font-bold text-ink"
      >
        <Coins aria-hidden="true" className="h-5 w-5 text-brand" />
        {`+${String(reward.creditsEarned)} crédito${reward.creditsEarned === 1 ? '' : 's'}`}
      </p>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">Saldo</span>
        <span aria-live="polite" className="tabular-nums font-semibold text-ink">
          {reward.balance === null ? 'Confirmando…' : `${String(reward.balance)} créditos`}
        </span>
      </div>

      {reward.victoryProgress !== null && wallet !== undefined && (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted">Progreso del cofre</span>
            <span aria-hidden="true" className="tabular-nums text-ink">
              {chestProgressText(reward.victoryProgress, wallet.threshold)}
            </span>
          </div>
          <div
            role="meter"
            aria-label="Progreso hacia el próximo cofre"
            aria-valuemin={0}
            aria-valuemax={wallet.threshold}
            aria-valuenow={reward.victoryProgress}
            aria-valuetext={chestProgressText(reward.victoryProgress, wallet.threshold)}
            className="h-2.5 w-full overflow-hidden rounded-full border border-muted bg-surface"
          >
            <div
              className="h-full rounded-full bg-brand motion-safe:transition-[width] motion-safe:duration-500"
              style={{
                width: `${String(chestProgressFraction(reward.victoryProgress, wallet.threshold) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {reward.weeklyChestCount !== null && wallet !== undefined && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Cofres esta semana</span>
          <span className="tabular-nums font-semibold text-ink">
            {weeklyLimitText(reward.weeklyChestCount, wallet.weeklyChestLimit)}
          </span>
        </div>
      )}

      {limitReached && (
        <p className="text-center text-xs font-semibold text-warning">Límite semanal alcanzado</p>
      )}

      {delivery !== null && (
        <div
          role="status"
          className={clsx(
            'flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center',
            reward.rewardDelivery === 'FAILED' ? 'border-danger' : 'border-muted',
          )}
        >
          {/* El color solo refuerza (nunca es la unica fuente): el titular y el
              detalle ya dicen "no se pudo" en texto. */}
          <Trophy
            aria-hidden="true"
            className={clsx(
              'h-6 w-6',
              reward.rewardDelivery === 'FAILED' ? 'text-danger' : 'text-brand',
            )}
          />
          <p className="font-bold text-ink">{delivery.headline}</p>
          {delivery.detail !== null && <p className="text-sm text-muted">{delivery.detail}</p>}
        </div>
      )}
    </section>
  )
}
