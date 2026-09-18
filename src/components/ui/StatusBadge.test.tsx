import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('mantiene los tonos ya existentes de otros dominios (no-regresion)', () => {
    render(<StatusBadge status="PUBLISHED" />)
    expect(screen.getByText('Publicado')).toHaveClass('bg-success/15', 'text-success')

    render(<StatusBadge status="CANCELLED" />)
    expect(screen.getByText('Cancelado')).toHaveClass('bg-danger/15', 'text-danger')

    render(<StatusBadge status="PENDING" />)
    expect(screen.getByText('Pendiente')).toHaveClass('bg-warning/15', 'text-warning')
  })

  it('anade un tono para WAITING_FOR_PLAYERS (HU-14) sin colisionar con otro dominio', () => {
    render(<StatusBadge status="WAITING_FOR_PLAYERS" />)

    const badge = screen.getByText('Esperando jugadores')
    expect(badge).toHaveClass('bg-success/15', 'text-success')
  })

  it('un estado desconocido cae al tono neutro', () => {
    render(<StatusBadge status="ALGO_NUEVO" />)
    expect(screen.getByText('ALGO_NUEVO')).toHaveClass('bg-border', 'text-muted')
  })
})
