import { describe, expect, it } from 'vitest'

import { i18n } from '@/shared/i18n/i18n'
import { formatAuctionCountdown, secondsUntil } from './countdown'

const NOW = Date.parse('2026-10-01T12:00:00.000Z')
const label = (closesAt: string): string => {
  const seconds = secondsUntil(closesAt, NOW)
  if (seconds === null) throw new Error('fecha invalida')
  return formatAuctionCountdown(seconds, i18n.t)
}

describe('countdown de subasta', () => {
  it('con dias muestra dias, horas, minutos y segundos', () => {
    expect(label('2026-10-03T16:15:09.000Z')).toBe('2d 04h 15m 09s')
  })

  it('con menos de 24 horas no muestra dias', () => {
    expect(label('2026-10-01T16:15:09.000Z')).toBe('04h 15m 09s')
  })

  it('con menos de 1 hora muestra minutos y segundos', () => {
    expect(label('2026-10-01T12:15:09.000Z')).toBe('15m 09s')
  })

  it('con menos de 1 minuto muestra solo segundos', () => {
    expect(label('2026-10-01T12:00:09.000Z')).toBe('09s')
  })

  it('exactamente al cierre muestra Finalizada', () => {
    expect(secondsUntil('2026-10-01T12:00:00.000Z', NOW)).toBe(0)
    expect(label('2026-10-01T12:00:00.000Z')).toBe('Finalizada')
  })

  it('una fecha pasada no da tiempo negativo y muestra Finalizada', () => {
    expect(secondsUntil('2026-09-30T12:00:00.000Z', NOW)).toBe(0)
    expect(label('2026-09-30T12:00:00.000Z')).toBe('Finalizada')
  })

  it('redondea hacia arriba: con fracciones de segundo pendientes aun no termina', () => {
    expect(secondsUntil('2026-10-01T12:00:00.400Z', NOW)).toBe(1)
    expect(label('2026-10-01T12:00:00.400Z')).toBe('01s')
  })

  it('una fecha invalida no produce cuenta', () => {
    expect(secondsUntil('no es fecha', NOW)).toBeNull()
  })
})
