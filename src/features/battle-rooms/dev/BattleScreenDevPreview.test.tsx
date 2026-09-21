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

    const resultado = screen.getByRole('status', { name: 'Resultado del último ataque' })

    expect(resultado).toHaveTextContent('Ana atacó a Bruno: Golpe crítico (137 %)')
    expect(resultado).toHaveTextContent('Vida de Bruno: 44 → 38')
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

    expect(screen.getByRole('status', { name: 'Resultado del último ataque' })).toHaveTextContent(
      'sin efecto',
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

  it('en 2v2 hay que elegir un rival: los radios ofrecen a Bruno y a Carla, no a los aliados', async () => {
    await enTurnoDeAna()
    await userEvent.click(screen.getByRole('button', { name: '2v2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Simular turnAdvanced' }))

    const grupo = screen.getByRole('group', { name: 'Objetivo del ataque' })

    expect(within(grupo).getAllByRole('radio')).toHaveLength(2)
    expect(within(grupo).getByRole('radio', { name: /Carla/u })).toBeInTheDocument()
    expect(within(grupo).queryByRole('radio', { name: /Diego|Ana/u })).not.toBeInTheDocument()
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

  it('3v3: la misma pantalla muestra tres por lado, seis en la franja de turnos y un medidor por cada uno', async () => {
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
    expect(
      within(batalla.getByRole('list', { name: 'Orden de turnos' })).getAllByRole('listitem'),
    ).toHaveLength(6)
  })
})
