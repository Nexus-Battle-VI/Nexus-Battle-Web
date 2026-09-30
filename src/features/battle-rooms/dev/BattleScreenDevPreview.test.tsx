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
    // 4a pasada (seccion 35 del brief): la linea de apertura ya no se ve en
    // "Nexus · Arena" -- sigue siendo dato accesible en el mismo anuncio
    // `role="status"` sr-only de la pantalla de batalla.
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(
      'Inicia Bruno la batalla · Ronda 1',
    )
  })

  it('"Simular turnAdvanced" pasa por el reductor real y alterna el turno', async () => {
    render(<BattleScreenDevPreview />)

    await userEvent.click(screen.getByRole('button', { name: 'Simular turnAdvanced' }))
    expect(screen.getByText('Tu turno')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Simular turnAdvanced' }))
    expect(screen.getByText('Turno de Bruno')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Ronda 2')
  })

  it('cambiar de perspectiva, de formato y de conexion se refleja en la pantalla', async () => {
    render(<BattleScreenDevPreview />)

    await userEvent.click(screen.getByRole('button', { name: 'Bruno' }))
    expect(screen.getByText('Tu turno')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '2v2' }))
    // 4a pasada (seccion 36 del brief): la cola de turnos ya no se muestra --
    // se verifica el formato 2v2 por las tarjetas reales de cada lado de la
    // arena (2 + 2).
    expect(
      within(screen.getByRole('region', { name: 'Tu equipo' })).getAllByRole('listitem'),
    ).toHaveLength(2)
    expect(
      within(screen.getByRole('region', { name: 'Rival' })).getAllByRole('listitem'),
    ).toHaveLength(2)

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
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(
      'Inicia Bruno la batalla · Ronda 1',
    )
  })
})

/** Ana mira y es su turno (Bruno abre y el servidor simulado avanza el turno). */
const enTurnoDeAna = async (): Promise<void> => {
  render(<BattleScreenDevPreview />)
  await userEvent.click(screen.getByRole('button', { name: 'Simular turnAdvanced' }))
}

describe('BattleScreenDevPreview — HU-18: monta los componentes y reductores reales', () => {
  it('muestra la Vida de ambos y, en el turno de Ana, el boton «Ataque básico» del producto', async () => {
    await enTurnoDeAna()

    expect(screen.getAllByRole('meter')).toHaveLength(2)
    expect(screen.getAllByText('44 / 44')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Ataque básico' })).toHaveAttribute(
      'aria-disabled',
      'false',
    )
  })

  it('atacar deja la intencion pendiente y el servidor simulado la resuelve con un evento del contrato', async () => {
    await enTurnoDeAna()

    await userEvent.click(screen.getByRole('button', { name: 'Ataque básico' }))
    expect(screen.getByRole('button', { name: 'Atacando…' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Responde: golpe crítico/u }))

    const resultado = screen.getByRole('status', { name: 'Resultado de la última acción' })

    expect(resultado).toHaveTextContent('¡Golpe crítico de Ana a Bruno!')
    expect(resultado).toHaveTextContent('Bruno: 44 → 38')
    expect(screen.getByRole('meter', { name: 'Vida de Bruno' })).toHaveAttribute(
      'aria-valuenow',
      '38',
    )
    expect(screen.getByText('Turno de Bruno')).toBeInTheDocument()
  })

  it('«sin efecto» deja la Vida como estaba', async () => {
    await enTurnoDeAna()

    await userEvent.click(screen.getByRole('button', { name: 'Ataque básico' }))
    await userEvent.click(screen.getByRole('button', { name: /Responde: sin efecto/u }))

    expect(screen.getByRole('status', { name: 'Resultado de la última acción' })).toHaveTextContent(
      'pero no superó su Defensa',
    )
    expect(screen.getAllByText('44 / 44')).toHaveLength(2)
  })

  it('un rechazo y un COMMAND_CONFLICT pasan por el mismo reductor de la intencion', async () => {
    await enTurnoDeAna()

    await userEvent.click(screen.getByRole('button', { name: 'Ataque básico' }))
    await userEvent.click(screen.getByRole('button', { name: 'Pide reintentar: COMMAND_CONFLICT' }))
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo confirmar tu ataque')

    await userEvent.click(screen.getByRole('button', { name: 'Rechaza: NOT_YOUR_TURN' }))
    expect(screen.getByRole('alert')).toHaveTextContent('No es tu turno')
  })

  it('«Batalla anterior a HU-18» no pinta Vida ni ofrece ataque', async () => {
    await enTurnoDeAna()

    await userEvent.click(screen.getByRole('button', { name: 'Batalla anterior a HU-18' }))

    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ataque básico' })).not.toBeInTheDocument()
  })

  it('un rival sin Vida (desde el servidor) deja de ser objetivo', async () => {
    await enTurnoDeAna()

    await userEvent.click(screen.getByRole('button', { name: 'Rival sin Vida' }))

    expect(screen.getByText('Sin Vida')).toBeInTheDocument()
    expect(screen.getByText('No hay rivales con Vida a los que atacar.')).toBeInTheDocument()
  })

  // 7a pasada (secciones 37-41 del brief): el selector de radios se quito de
  // la UI -- el objetivo se elige haciendo clic sobre el heroe en la arena.
  // Solo los rivales (Bruno, Carla) tienen ese boton; los aliados (Diego,
  // Ana) nunca lo tienen -- mismo criterio real de `attackableTargets`.
  it('en 2v2 hay que elegir un rival: solo Bruno y Carla son clicables en la arena, no los aliados', async () => {
    await enTurnoDeAna()
    await userEvent.click(screen.getByRole('button', { name: '2v2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Simular turnAdvanced' }))

    expect(screen.getByRole('button', { name: 'Elegir a Bruno como objetivo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Elegir a Carla como objetivo' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Elegir a (Diego|Ana) como objetivo/u }),
    ).not.toBeInTheDocument()
  })
})

describe('BattleScreenDevPreview — arena: controles de desarrollo separados de la pantalla de batalla', () => {
  it('los controles viven en un panel rotulado «no forman parte del producto», FUERA de la pantalla de batalla', () => {
    render(<BattleScreenDevPreview />)

    const panel = screen.getByText('Controles de desarrollo — no forman parte del producto')
    const batalla = screen.getByRole('region', { name: 'Batalla' })
    const simular = screen.getByRole('button', { name: 'Simular turnAdvanced' })

    expect(panel.closest('details')).toContainElement(simular)
    expect(batalla).not.toContainElement(simular)
    expect(
      within(batalla).queryByText(/Servidor simulado|Simular turnAdvanced/u),
    ).not.toBeInTheDocument()
  })

  it('3v3: la misma pantalla muestra tres por lado y un medidor por cada uno', async () => {
    render(<BattleScreenDevPreview />)

    await userEvent.click(screen.getByRole('button', { name: '3v3' }))

    const batalla = within(screen.getByRole('region', { name: 'Batalla' }))

    expect(batalla.getAllByRole('meter')).toHaveLength(6)
    expect(
      within(batalla.getByRole('region', { name: 'Rival' })).getAllByRole('listitem'),
    ).toHaveLength(3)
    expect(
      within(batalla.getByRole('region', { name: 'Tu equipo' })).getAllByRole('listitem'),
    ).toHaveLength(3)
  })
})
