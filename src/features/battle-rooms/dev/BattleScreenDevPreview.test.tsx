import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { BattleScreenDevPreview } from './BattleScreenDevPreview'

/**
 * La vista previa es un arnes de revision visual (NO evidencia E2E). Estas pruebas
 * solo garantizan que sigue montando la pantalla y el reductor de produccion.
 */
describe('BattleScreenDevPreview', () => {
  it('arranca en un 1v1 con Bruno abriendo y mirando Ana', () => {
    render(<BattleScreenDevPreview />)

    expect(screen.getByText('Turno de Bruno')).toBeInTheDocument()
    expect(screen.getByText('Inicia Bruno la batalla · Ronda 1')).toBeInTheDocument()
  })

  it('"Simular turnAdvanced" pasa por el reductor real y alterna el turno', async () => {
    render(<BattleScreenDevPreview />)

    await userEvent.click(screen.getByRole('button', { name: 'Simular turnAdvanced' }))
    expect(screen.getByText('Tu turno')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Simular turnAdvanced' }))
    expect(screen.getByText('Turno de Bruno')).toBeInTheDocument()
    expect(screen.getByText('Ronda 2')).toBeInTheDocument()
  })

  it('cambiar de perspectiva, de formato y de conexion se refleja en la pantalla', async () => {
    render(<BattleScreenDevPreview />)

    await userEvent.click(screen.getByRole('button', { name: 'Bruno' }))
    expect(screen.getByText('Tu turno')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '2v2' }))
    expect(
      within(screen.getByRole('list', { name: 'Orden de turnos' })).getAllByRole('listitem'),
    ).toHaveLength(4)

    await userEvent.click(screen.getByRole('button', { name: '1 vs IA' }))
    expect(screen.getByText('Turno de Oponente IA')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reconectando' }))
    expect(screen.getByText(/Reconectando en tiempo real/u)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Autenticación fallida' }))
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo autenticar la conexión')
  })

  it('"Reiniciar" vuelve al primer turno', async () => {
    render(<BattleScreenDevPreview />)

    await userEvent.click(screen.getByRole('button', { name: 'Simular turnAdvanced' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reiniciar' }))

    expect(screen.getByText('Turno de Bruno')).toBeInTheDocument()
    expect(screen.getByText('Inicia Bruno la batalla · Ronda 1')).toBeInTheDocument()
  })
})
