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

  // Remaster visual Sprint 3 (3a pasada, seccion 55 del brief): la batalla
  // activa ya NO muestra el chat de la sala -- compite visualmente con el
  // HUD de combate y el requisito real es coordinarse ANTES de pelear (eso
  // vive en el chat flotante del lobby/sala de espera, HU-13 sigue intacta
  // ahi). El protocolo de chat NO se elimino: solo se dejo de montar aqui.
  it('NO monta el chat de la sala durante la batalla activa', () => {
    montar(`/play/rooms/${ROOM}/battle`, '/play/rooms/:roomId/battle')

    expect(screen.queryByRole('heading', { name: 'Chat de la sala' })).not.toBeInTheDocument()
    expect(screen.queryByRole('log')).not.toBeInTheDocument()
  })
})
