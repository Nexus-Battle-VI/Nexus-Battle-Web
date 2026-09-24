import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { BattleResultView } from './BattleResultView'
import { noWinnerResult, winResult } from './fixtures'

/**
 * Vista de resultado (HU-21): titular con texto y color, causa, marcador,
 * participantes, foco al titular, un solo anuncio y el enlace real de vuelta.
 * No hay recompensas (D4) ni botones de accion de combate.
 */
describe('BattleResultView (HU-21)', () => {
  it('muestra el titular de victoria, la causa y el marcador final', () => {
    renderWithProviders(<BattleResultView result={winResult()} subject="sujeto-ana" />)

    expect(screen.getByRole('heading', { name: '¡Victoria!' })).toBeInTheDocument()
    expect(screen.getByText('Derrotaste a todos los héroes rivales.')).toBeInTheDocument()
    expect(screen.getByText('Vida restante 44 / 44 (100 %)')).toBeInTheDocument()
    expect(screen.getByText('Vida restante 0 / 44 (0 %)')).toBeInTheDocument()
  })

  it('la derrota y el empate tienen su propio titular', () => {
    const { unmount } = renderWithProviders(
      <BattleResultView result={winResult()} subject="sujeto-bruno" />,
    )

    expect(screen.getByRole('heading', { name: 'Derrota' })).toBeInTheDocument()
    unmount()

    renderWithProviders(<BattleResultView result={noWinnerResult()} subject="sujeto-ana" />)

    expect(screen.getByRole('heading', { name: 'Sin ganador (empate)' })).toBeInTheDocument()
  })

  it('el foco pasa al titular al aparecer', () => {
    renderWithProviders(<BattleResultView result={winResult()} subject="sujeto-ana" />)

    expect(screen.getByRole('heading', { name: '¡Victoria!' })).toHaveFocus()
  })

  it('anuncia el titular UNA vez en una region de estado', () => {
    renderWithProviders(<BattleResultView result={winResult()} subject="sujeto-ana" />)

    const statuses = screen.getAllByRole('status')

    expect(statuses).toHaveLength(1)
    expect(statuses[0]).toHaveTextContent('¡Victoria!')
  })

  it('lista a los participantes con su resultado en texto', () => {
    renderWithProviders(<BattleResultView result={winResult()} subject="sujeto-ana" />)

    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Bruno')).toBeInTheDocument()
    expect(screen.getByText(/Equipo A · Ganó/u)).toBeInTheDocument()
    expect(screen.getByText(/Equipo B · Perdió/u)).toBeInTheDocument()
  })

  it('el unico enlace es «Volver a Jugar Online» hacia /play', () => {
    renderWithProviders(<BattleResultView result={winResult()} subject="sujeto-ana" />)

    const link = screen.getByRole('link', { name: 'Volver a Jugar Online' })

    expect(link).toHaveAttribute('href', '/play')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('NO muestra recompensas, creditos ni botones de accion de combate', () => {
    renderWithProviders(<BattleResultView result={winResult()} subject="sujeto-ana" />)

    expect(screen.queryByText(/credito|crédito|recompensa|cofre|experiencia|apuesta/iu)).toBeNull()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('la animacion de entrada respeta `prefers-reduced-motion`', () => {
    const { container } = renderWithProviders(
      <BattleResultView result={winResult()} subject="sujeto-ana" />,
    )
    const section = container.querySelector('section')

    expect(section?.className).toContain('motion-safe:transition-shadow')
  })

  it('el color del titular acompana al texto, nunca lo sustituye', () => {
    renderWithProviders(<BattleResultView result={winResult()} subject="sujeto-bruno" />)

    const headline = screen.getByRole('heading', { name: 'Derrota' })

    expect(headline.className).toContain('text-danger')
    expect(headline).toHaveTextContent('Derrota')
  })
})
