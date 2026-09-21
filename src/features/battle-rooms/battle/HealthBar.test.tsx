import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HealthBar } from './HealthBar'

const fill = (): HTMLElement => {
  const meter = screen.getByRole('meter')
  const inner = meter.firstElementChild

  if (!(inner instanceof HTMLElement)) {
    throw new Error('La barra no tiene relleno.')
  }

  return inner
}

describe('HealthBar — Vida como texto y como medidor accesible (HU-18)', () => {
  it('muestra la Vida como texto `32 / 44` (nunca solo color)', () => {
    render(<HealthBar name="Ana" health={{ current: 32, max: 44 }} />)

    expect(screen.getByText('32 / 44')).toBeInTheDocument()
    expect(screen.getByText('Vida')).toBeInTheDocument()
  })

  it('es un `meter` con rango, valor y texto legible para lectores de pantalla', () => {
    render(<HealthBar name="Ana" health={{ current: 32, max: 44 }} />)

    const meter = screen.getByRole('meter', { name: 'Vida de Ana' })

    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '44')
    expect(meter).toHaveAttribute('aria-valuenow', '32')
    expect(meter).toHaveAttribute('aria-valuetext', '32 de 44 de Vida')
  })

  it('el ancho del relleno es la fraccion de Vida que publica el servidor', () => {
    render(<HealthBar name="Ana" health={{ current: 22, max: 44 }} />)

    expect(fill().style.width).toBe('50%')
  })

  it('Vida llena: 100 % y color verde', () => {
    render(<HealthBar name="Ana" health={{ current: 44, max: 44 }} />)

    expect(fill().style.width).toBe('100%')
    expect(fill().className).toContain('bg-success')
  })

  it.each([
    [27, 44, 'bg-success'], // 61,36 % -> verde
    [26, 44, 'bg-warning'], // 59,09 % -> amarillo
    [18, 44, 'bg-warning'], // 40,90 % -> amarillo
    [17, 44, 'bg-danger'], // 38,63 % -> rojo
    [1, 44, 'bg-danger'],
  ])('%i de %i usa %s (umbrales 60 % y 40 % del documento oficial)', (current, max, color) => {
    render(<HealthBar name="Ana" health={{ current, max }} />)

    expect(fill().className).toContain(color)
  })

  it('Vida 0: ancho 0, rojo y el texto «Sin Vida» (no solo color)', () => {
    render(<HealthBar name="Ana" health={{ current: 0, max: 44 }} />)

    expect(fill().style.width).toBe('0%')
    expect(fill().className).toContain('bg-danger')
    expect(screen.getByText('0 / 44')).toBeInTheDocument()
    expect(screen.getByText('Sin Vida')).toBeInTheDocument()
  })

  it('la animacion solo aplica si el usuario no pidio movimiento reducido (motion-safe)', () => {
    render(<HealthBar name="Ana" health={{ current: 30, max: 44 }} />)

    expect(fill().className).toContain('motion-safe:transition-[width]')
    expect(fill().className).not.toMatch(/(^|\s)transition-\[width\]/u)
  })

  it('un participante sin perfil de combate no inventa una Vida', () => {
    render(<HealthBar name="Oponente IA" health={null} />)

    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
    expect(screen.getByText('Vida no disponible')).toBeInTheDocument()
  })
})
