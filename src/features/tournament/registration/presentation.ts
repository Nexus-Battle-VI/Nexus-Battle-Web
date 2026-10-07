import type { EntryPayment, EntryTeam, PaidMethod } from './api'
import type { MatchSummary } from './encounterApi'

export const teamStatus: Record<EntryTeam['status'], string> = {
  AWAITING_CONSENT: 'Esperando aceptación de integrantes',
  PENDING_PAYMENT: 'Pendiente de confirmar el cupo',
  PAYMENT_PENDING: 'Comprobando el pago · cupo aún sin confirmar',
  COMPENSATING: 'Comprobando la devolución · cupo sin confirmar',
  CONFIRMED: 'Inscripción confirmada',
  CANCELLED: 'Registro cancelado',
}
export const priceLabel = (method: PaidMethod | EntryPayment): string => {
  if (method.method === 'FREE') return 'Gratis · sin cobro'
  if (method.method === 'CREDITS') return `${String(method.amount)} créditos`
  const amount = BigInt(method.amountMinor)
  const scale = 10n ** BigInt(method.minorUnit)
  const whole = (amount / scale).toLocaleString('es-CO')
  const fraction =
    method.minorUnit === 0 ? '' : `,${(amount % scale).toString().padStart(method.minorUnit, '0')}`
  return `${whole}${fraction} ${method.currency} · pago simulado`
}
export const matchStatus = (match: MatchSummary): string => {
  if (match.status === 'IN_PROGRESS') return 'En curso'
  if (match.status === 'FINISHED') return 'Finalizada'
  if (match.preparationStatus === 'TEAMS_RESOLVED')
    return 'Equipos definidos; preparación pendiente'
  if (match.preparationStatus === 'PREPARING') return 'Preparación pendiente de confirmar'
  if (match.preparationStatus === 'START_PENDING') return 'Inicio pendiente de confirmar'
  if (match.status === 'READY') return 'Equipos y héroes definidos; esperando inicio'
  return 'Esperando participantes o resultados previos'
}
export const dateLabel = (at: string): string => new Date(at).toLocaleString('es-CO')
