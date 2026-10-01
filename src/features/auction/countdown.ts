/**
 * Tiempo restante de una subasta (7.7.9), solo para mostrar: llegar a 0 aqui
 * no cierra nada; el cierre y el `status` los decide Auction.
 */

type Translate = (key: string, options: Record<string, string>) => string

const pad = (value: number): string => String(value).padStart(2, '0')

/**
 * Segundos enteros que faltan hasta `closesAt` (ISO), redondeando hacia arriba
 * para que "00s" nunca se muestre antes de terminar. Nunca negativo; `null` si
 * la fecha no es valida.
 */
export const secondsUntil = (closesAt: string, now: number): number | null => {
  const at = Date.parse(closesAt)
  if (Number.isNaN(at)) return null
  return Math.max(0, Math.ceil((at - now) / 1000))
}

/** «2d 04h 15m 09s», «04h 15m 09s», «15m 09s», «09s» o «Finalizada». */
export const formatAuctionCountdown = (seconds: number, t: Translate): string => {
  if (seconds <= 0) return t('auction:countdown.ended', {})
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const parts = {
    days: String(days),
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds % 60),
  }
  if (days > 0) return t('auction:countdown.days', parts)
  if (hours > 0) return t('auction:countdown.hours', parts)
  if (minutes > 0) return t('auction:countdown.minutes', parts)
  return t('auction:countdown.seconds', parts)
}
