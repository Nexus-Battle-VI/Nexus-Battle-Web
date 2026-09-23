import { Coins } from '@/components/ui/icons'
import { useSession } from '@/shared/session'
import { spendableCredits, useWallet } from '@/shared/wallet'

import { compactCredits, fullCredits } from './creditsFormat'

/**
 * Creditos del jugador en la cabecera: Mi cuenta → Créditos → tema.
 *
 * Muestra `available` (lo que puede gastar o apostar), no el saldo total: una
 * apuesta reservada no reduce `balance` pero si lo disponible (HU-23). El
 * detalle (total y reservado) va en el nombre accesible y en el `title`.
 *
 * El valor SIEMPRE viene de Wallet (`GET /v1/wallet/me`); nunca se calcula
 * ni se adelanta. Se relee solo cuando algo lo invalida (`invalidateWallet`):
 * reserva o liberacion de una apuesta, liquidacion, recompensa, puja.
 *
 * Nunca bloquea la cabecera: sin sesion no se pinta; cargando, un marcador
 * compacto; si Wallet falla (5xx, o 403 de una cuenta sin rol de jugador) se
 * oculta sin alertas. En pantallas estrechas usa la notacion compacta
 * ("49,8 mil") para no desbordar la fila.
 */
export const CreditsBadge = (): React.JSX.Element | null => {
  const subject = useSession((state) => state.subject)
  const wallet = useWallet()

  if (subject === null || wallet.isError) {
    return null
  }

  if (wallet.data === undefined) {
    return (
      <span
        aria-hidden="true"
        data-testid="credits-badge-loading"
        className="h-7 w-16 rounded-full bg-surface-raised motion-safe:animate-pulse"
      />
    )
  }

  const available = spendableCredits(wallet.data)
  const reserved = wallet.data.reserved ?? 0
  const detail =
    reserved > 0
      ? `Créditos disponibles: ${fullCredits(available)}. Saldo total: ${fullCredits(wallet.data.balance)}. Reservado en apuestas o pujas: ${fullCredits(reserved)}.`
      : `Créditos disponibles: ${fullCredits(available)}.`

  return (
    <span
      role="img"
      aria-label={detail}
      title={detail}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 text-sm font-semibold tabular-nums text-ink"
    >
      <Coins aria-hidden="true" className="h-4 w-4 text-brand" />
      <span className="sm:hidden">{compactCredits(available)}</span>
      <span className="hidden sm:inline">{fullCredits(available)}</span>
    </span>
  )
}
