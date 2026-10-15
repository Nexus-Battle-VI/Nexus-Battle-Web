import { useTranslation } from 'react-i18next'

import type { AuctionRealtimeStatus } from './useAuctionRealtime'

/**
 * Estado de la conexion en vivo de Subasta (EN-034, CA-03).
 *
 * Solo dice «En vivo» cuando de verdad lo esta. Mientras se reconecta, o si la conexion fallo, lo
 * dice y avisa de que lo que se ve puede estar desactualizado: la pantalla nunca presenta como
 * actual un valor anterior a la desconexion. Si el realtime esta apagado en el servidor
 * (`disabled`) o aun se esta conectando, no muestra nada: la pantalla se ve como siempre.
 */
export const AuctionLiveIndicator = ({
  status,
}: {
  readonly status: Pick<AuctionRealtimeStatus, 'connection'>
}): React.JSX.Element | null => {
  const { t } = useTranslation()

  if (status.connection === 'open') {
    return (
      <p
        role="status"
        className="auction-live-indicator auction-state-badge"
        data-tone="success"
        data-testid="auction-live-indicator"
      >
        {t('auction:realtime.live')}
      </p>
    )
  }

  if (status.connection === 'reconnecting') {
    return (
      <p
        role="status"
        className="auction-live-indicator auction-state-badge"
        data-tone="warning"
        data-testid="auction-live-indicator"
      >
        {t('auction:realtime.reconnecting')}
      </p>
    )
  }

  if (status.connection === 'failed') {
    return (
      <p
        role="status"
        className="auction-live-indicator auction-state-badge"
        data-tone="danger"
        data-testid="auction-live-indicator"
      >
        {t('auction:realtime.failed')}
      </p>
    )
  }

  return null
}
