import { useTranslation } from 'react-i18next'

import { useNow } from '@/shared/countdown'
import { formatAuctionCountdown, secondsUntil } from './countdown'

/**
 * Cuenta regresiva viva hasta `closesAt`. Usa el reloj compartido de la app
 * (`useNow`): un unico interval de 1 s para todas las tarjetas, que se limpia
 * cuando ya no queda ninguna montada. No vuelve a pedir datos al servidor.
 */
export const AuctionCountdown = ({
  closesAt,
}: {
  readonly closesAt: string
}): React.JSX.Element | null => {
  const { t } = useTranslation()
  const now = useNow()
  const seconds = secondsUntil(closesAt, now)
  if (seconds === null) return null
  return <time dateTime={closesAt}>{formatAuctionCountdown(seconds, t)}</time>
}
