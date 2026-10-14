import { statusLabel } from '@/lib/format'

type AuctionBadgeTone = 'success' | 'warning' | 'danger' | 'neutral'

/**
 * Mapa de tono LOCAL a Auction: reutiliza el texto de `statusLabel` (mismo
 * diccionario que `StatusBadge` global), pero pinta con el sistema de badge
 * de Auction (`.auction-state-badge`, el mismo que ya aprobaron Bidding/
 * Auto Bid/Immediate Purchase) en vez del pill plano de `StatusBadge`. No se
 * toca `StatusBadge` -es compartido con otros modulos, fuera de alcance-.
 */
const TONE: Readonly<Record<string, AuctionBadgeTone>> = {
  ACTIVE: 'success',
  CONFIRMED: 'success',
  CLAIMED: 'success',
  SOLD: 'neutral',
  FINISHED: 'neutral',
  CANCELLED: 'danger',
  EXPIRED: 'danger',
  PENDING: 'warning',
}

export const AuctionStatusBadge = ({ status }: { readonly status: string }): React.JSX.Element => (
  <span className="auction-state-badge" data-tone={TONE[status] ?? 'neutral'}>
    {statusLabel(status)}
  </span>
)
