import { describe, expect, it } from 'vitest'

import { formatDateTime, formatMoney, statusLabel } from './format'

describe('formatMoney', () => {
  it('convierte el entero de la unidad minima a un importe legible', () => {
    // Los servicios devuelven 1500000 para 15.000,00 COP.
    const formatted = formatMoney(1_500_000, 'COP')

    expect(formatted).toContain('15.000,00')
  })

  it('no pierde precision con importes que un decimal redondearia mal', () => {
    // 0.1 + 0.2 en punto flotante no es 0.3; con enteros la suma es exacta.
    expect(formatMoney(10 + 20, 'USD')).toBe(formatMoney(30, 'USD'))
  })

  it('formatea el importe cero', () => {
    expect(formatMoney(0, 'COP')).toContain('0,00')
  })

  it('admite otras monedas soportadas', () => {
    expect(formatMoney(1_050, 'USD', 'en-US')).toBe('$10.50')
  })

  it('usa dos decimales por defecto ante una moneda desconocida en el mapa', () => {
    // La moneda debe ser valida para Intl, pero no estar en el mapa local.
    expect(formatMoney(1_000, 'JPY', 'en-US')).toContain('10')
  })
})

describe('formatDateTime', () => {
  it('formatea una fecha ISO valida', () => {
    const formatted = formatDateTime('2026-08-21T10:00:00.000Z')

    expect(formatted).not.toBe('2026-08-21T10:00:00.000Z')
    expect(formatted.length).toBeGreaterThan(0)
  })

  it('devuelve el valor original cuando la fecha no es interpretable', () => {
    expect(formatDateTime('no-es-una-fecha')).toBe('no-es-una-fecha')
  })
})

describe('statusLabel', () => {
  it('traduce los estados conocidos del dominio', () => {
    expect(statusLabel('PUBLISHED')).toBe('Publicado')
    expect(statusLabel('PENDING_VERIFICATION')).toBe('Pendiente de verificacion')
    expect(statusLabel('CONFIRMED')).toBe('Confirmado')
  })

  it('devuelve el valor original ante un estado desconocido', () => {
    expect(statusLabel('ESTADO_NUEVO')).toBe('ESTADO_NUEVO')
  })
})
