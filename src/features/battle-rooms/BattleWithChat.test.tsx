import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'

import { BattleWithChat } from './BattleWithChat'

// La pantalla de batalla es de HU-17 y tiene sus propias pruebas: aqui solo importa
// que BattleWithChat la muestra. Un componente que devuelve texto no necesita JSX.
vi.mock('./battle/BattlePage', () => ({
  BattlePage: () => 'Pantalla de batalla',
}))

const ROOM = '11111111-1111-4111-8111-111111111111'

const montar = (path: string, routePath: string): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={<BattleWithChat />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BattleWithChat (HU-17)', () => {
  it('muestra la pantalla de batalla', () => {
    montar(`/play/rooms/${ROOM}/battle`, '/play/rooms/:roomId/battle')

    expect(screen.getByText('Pantalla de batalla')).toBeInTheDocument()
  })

  // EN-031: el chat vuelve a la batalla, pero lo monta la propia pantalla (como burbuja
  // dentro del escenario y solo para quien participa, ver BattlePage.test). Este envoltorio
  // no pinta un segundo panel encima.
  it('no pinta un panel de chat propio alrededor de la batalla', () => {
    montar(`/play/rooms/${ROOM}/battle`, '/play/rooms/:roomId/battle')

    expect(screen.queryByRole('heading', { name: 'Chat de la sala' })).not.toBeInTheDocument()
    expect(screen.queryByRole('log')).not.toBeInTheDocument()
  })
})
