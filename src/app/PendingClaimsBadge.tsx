import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { Package } from '@/components/ui/icons'
import { fetchPendingClaims } from '@/features/auction/pending-claims/api'
import { queryKeys } from '@/shared/query-keys'
import { useSession } from '@/shared/session'

/**
 * Contador de productos pendientes de reclamo en la cabecera (HU-69.7).
 *
 * Mismo criterio que `CreditsBadge`: se oculta sin sesion y sin alertas si la
 * consulta falla -un problema de Auction no debe romper la cabecera global-.
 * A diferencia de `CreditsBadge`, aqui SI se pide refetch al volver el foco a
 * la pestaña (`refetchOnWindowFocus`): reclamar un producto en otra pestaña o
 * pantalla debe reflejarse pronto sin depender de que algo mas invalide la
 * consulta.
 *
 * Oculto por completo cuando el conteo es 0: un badge con "0" no aporta
 * nada y compite por espacio en la cabecera de forma permanente.
 */
export const PendingClaimsBadge = (): React.JSX.Element | null => {
  const subject = useSession((state) => state.subject)

  const query = useQuery({
    queryKey: queryKeys.auction.pendingClaims,
    queryFn: ({ signal }) => fetchPendingClaims(signal),
    enabled: subject !== null,
    refetchOnWindowFocus: true,
  })

  const count = query.data?.filter((claim) => claim.claimStatus === 'PENDING').length ?? 0

  if (subject === null || query.isError || count === 0) {
    return null
  }

  return (
    <Link
      to="/auction/pending-claims"
      aria-label={`Pendientes de recoger: ${String(count)}`}
      title={`Pendientes de recoger: ${String(count)}`}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 text-sm font-semibold tabular-nums text-ink hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <Package aria-hidden="true" className="h-4 w-4 text-brand" />
      <span className="hidden sm:inline">Pendientes</span>
      <span>{count}</span>
    </Link>
  )
}
