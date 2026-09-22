import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AttackPanel, type AttackPanelProps, type CombatControls } from './AttackPanel'
import { initialAttackIntentState, type AttackIntentState } from './attackIntent'
import { battle, combatBattle, entry, withCombatants } from './fixtures'

const ANA = 'sujeto-ana'
const BRUNO = 'sujeto-bruno'

const controls = (attack: AttackIntentState = initialAttackIntentState): CombatControls => ({
  attack,
  onAttack: vi.fn(),
  onRetry: vi.fn(),
  onDismissRejection: vi.fn(),
})

/** 1v1 con turno de Ana (turnsCompleted = 1). */
const pintar = (overrides: Partial<AttackPanelProps> = {}, combat = controls()) => {
  render(
    <AttackPanel
      battle={combatBattle(1)}
      subject={ANA}
      connection="open"
      synced
      combat={combat}
      {...overrides}
    />,
  )

  return combat
}

const boton = (): HTMLElement => screen.getByRole('button', { name: /Ataque básico|Atacando/u })

/** 2v2: Ana (A/0) y su aliado (A/1) contra B1 (B/0) y B2 (B/1); el turno de la posicion 1 es de Ana. */
const DOS_CONTRA_DOS = [
  entry(0, { teamLabel: 'B', seat: 0, displayName: 'Bea', playerId: 'sujeto-bea' }),
  entry(1, { teamLabel: 'A', seat: 0, displayName: 'Ana', playerId: ANA }),
  entry(2, { teamLabel: 'B', seat: 1, displayName: 'Beto', playerId: 'sujeto-beto' }),
  entry(3, { teamLabel: 'A', seat: 1, displayName: 'Alan', playerId: 'sujeto-alan' }),
]

describe('AttackPanel — «Ataque básico» (HU-18)', () => {
  it('en mi turno muestra el boton habilitado; con un unico rival ya es el objetivo (sin elegir)', () => {
    pintar()

    expect(boton()).toHaveAttribute('aria-disabled', 'false')
    expect(screen.getByRole('radio', { name: /Bruno/u })).toBeChecked()
  })

  it('al pulsar envia UNA intencion con el objetivo (teamLabel, seat) y nada mas', async () => {
    const combat = pintar()

    await userEvent.click(boton())

    expect(combat.onAttack).toHaveBeenCalledTimes(1)
    expect(combat.onAttack).toHaveBeenCalledWith({ teamLabel: 'B', seat: 0 })
  })

  it('fuera de mi turno NO hay boton de ataque y se explica cuando podras atacar', () => {
    pintar({ subject: BRUNO })

    expect(screen.queryByRole('button', { name: /Ataque básico/u })).not.toBeInTheDocument()
    expect(screen.getByText('Podrás atacar cuando sea tu turno.')).toBeInTheDocument()
  })

  it('un espectador (sin sujeto) no ve el boton', () => {
    pintar({ subject: null })

    expect(screen.queryByRole('button', { name: /Ataque básico/u })).not.toBeInTheDocument()
  })

  it('con un ataque pendiente: «Atacando…», aria-busy, y otro clic NO envia nada', async () => {
    const combat = pintar(
      {},
      controls({
        intent: { commandId: 'cmd-1', target: { teamLabel: 'B', seat: 0 } },
        unconfirmed: false,
        rejection: null,
      }),
    )

    expect(boton()).toHaveTextContent('Atacando…')
    expect(boton()).toHaveAttribute('aria-busy', 'true')
    expect(boton()).toHaveAttribute('aria-disabled', 'true')

    await userEvent.click(boton())
    await userEvent.click(boton())

    expect(combat.onAttack).not.toHaveBeenCalled()
    expect(screen.getByText('Esperando el resultado de tu acción…')).toBeInTheDocument()
  })

  it('el boton pendiente conserva el foco (aria-disabled, no disabled)', () => {
    pintar(
      {},
      controls({
        intent: { commandId: 'cmd-1', target: { teamLabel: 'B', seat: 0 } },
        unconfirmed: false,
        rejection: null,
      }),
    )

    expect(boton()).not.toBeDisabled()
  })

  it.each([
    ['reconectando', { connection: 'reconnecting' as const, synced: false }],
    ['conectando', { connection: 'connecting' as const, synced: false }],
    ['abierta sin sincronizar', { connection: 'open' as const, synced: false }],
  ])('conexion %s: deshabilitado, sin enviar, con la razon en texto', async (_name, patch) => {
    const combat = pintar(patch)

    expect(boton()).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Esperando la conexión con la batalla…')).toBeInTheDocument()

    await userEvent.click(boton())

    expect(combat.onAttack).not.toHaveBeenCalled()
  })

  it('la razon por la que no se puede atacar esta enlazada con el boton (aria-describedby), no es solo un tooltip', () => {
    pintar({ synced: false })

    const razon = screen.getByText('Esperando la conexión con la batalla…')

    expect(boton().getAttribute('aria-describedby')).toBe(razon.id)
  })

  it('NO depende del Poder: nada de la interfaz menciona Poder y el boton esta habilitado', () => {
    const { container } = render(
      <AttackPanel
        battle={combatBattle(1)}
        subject={ANA}
        connection="open"
        synced
        combat={controls()}
      />,
    )

    expect(container.textContent).not.toMatch(/poder/iu)
    expect(within(container).getByRole('button', { name: 'Ataque básico' })).toHaveAttribute(
      'aria-disabled',
      'false',
    )
  })

  describe('2 contra 2: un solo objetivo', () => {
    const vista = (health: readonly (readonly [number, number])[]) =>
      withCombatants(battle(1, DOS_CONTRA_DOS), health)

    const todos = [
      [44, 44],
      [44, 44],
      [44, 44],
      [44, 44],
    ] as const

    it('ofrece SOLO a los rivales como opciones (no a mi ni a mi aliado)', () => {
      pintar({ battle: vista(todos) })

      const grupo = screen.getByRole('group', { name: 'Objetivo del ataque' })
      const opciones = within(grupo).getAllByRole('radio')

      expect(opciones).toHaveLength(2)
      expect(within(grupo).getByRole('radio', { name: /Bea/u })).toBeInTheDocument()
      expect(within(grupo).getByRole('radio', { name: /Beto/u })).toBeInTheDocument()
      expect(within(grupo).queryByRole('radio', { name: /Alan|Ana/u })).not.toBeInTheDocument()
    })

    it('sin elegir objetivo el boton esta deshabilitado y pide elegir', async () => {
      const combat = pintar({ battle: vista(todos) })

      expect(boton()).toHaveAttribute('aria-disabled', 'true')
      expect(screen.getByText('Elige un objetivo.')).toBeInTheDocument()

      await userEvent.click(boton())

      expect(combat.onAttack).not.toHaveBeenCalled()
    })

    it('elegir un rival habilita el boton y ataca a ESE rival (teamLabel, seat)', async () => {
      const combat = pintar({ battle: vista(todos) })

      await userEvent.click(screen.getByRole('radio', { name: /Beto/u }))
      await userEvent.click(boton())

      expect(combat.onAttack).toHaveBeenCalledTimes(1)
      expect(combat.onAttack).toHaveBeenCalledWith({ teamLabel: 'B', seat: 1 })
    })

    it('se elige con el teclado (flechas) como cualquier grupo de opciones nativo', async () => {
      const combat = pintar({ battle: vista(todos) })

      await userEvent.tab()
      await userEvent.keyboard('{ArrowDown}')
      await userEvent.keyboard('{Enter}')

      expect(screen.getByRole('radio', { name: /Beto/u })).toBeChecked()

      await userEvent.click(boton())

      expect(combat.onAttack).toHaveBeenCalledWith({ teamLabel: 'B', seat: 1 })
    })

    it('un rival sin Vida NO es una opcion; el otro pasa a ser el unico objetivo', () => {
      pintar({
        battle: vista([
          [0, 44],
          [44, 44],
          [30, 44],
          [44, 44],
        ]),
      })

      expect(screen.queryByRole('radio', { name: /Bea/u })).not.toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /Beto/u })).toBeChecked()
    })

    it('cada opcion muestra la Vida del rival en texto', () => {
      pintar({
        battle: vista([
          [12, 44],
          [44, 44],
          [30, 44],
          [44, 44],
        ]),
      })

      expect(screen.getByRole('radio', { name: /Bea.*Vida 12 \/ 44/u })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /Beto.*Vida 30 \/ 44/u })).toBeInTheDocument()
    })
  })

  it('sin rivales con Vida no hay nada que atacar y se dice en texto', () => {
    pintar({
      battle: withCombatants(battle(1), [
        [0, 44],
        [44, 44],
      ]),
    })

    expect(boton()).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('No hay rivales con Vida a los que atacar.')).toBeInTheDocument()
  })

  it('una batalla anterior a HU-18 no ofrece ataque y explica por que', () => {
    pintar({ battle: battle(1) })

    expect(screen.queryByRole('button', { name: /Ataque básico/u })).not.toBeInTheDocument()
    expect(screen.getByText(/antes de que existieran las acciones de combate/u)).toBeInTheDocument()
  })

  describe('rechazos del servidor (por codigo, con alerta accesible)', () => {
    it.each([
      ['NOT_YOUR_TURN', 'No es tu turno'],
      ['INVALID_TARGET', 'ya no existe'],
      ['TARGET_UNAVAILABLE', 'ya no tiene Vida'],
    ])('%s se anuncia con role=alert y texto propio', (code, fragmento) => {
      pintar({}, controls({ intent: null, unconfirmed: false, rejection: code }))

      expect(screen.getByRole('alert')).toHaveTextContent(fragmento)
    })

    it('«Entendido» cierra el aviso', async () => {
      const combat = pintar(
        {},
        controls({ intent: null, unconfirmed: false, rejection: 'NOT_YOUR_TURN' }),
      )

      await userEvent.click(screen.getByRole('button', { name: 'Entendido' }))

      expect(combat.onDismissRejection).toHaveBeenCalledTimes(1)
    })

    it('sin rechazo no hay alerta', () => {
      pintar()

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('sin confirmar (perdida de conexion o COMMAND_CONFLICT)', () => {
    const sinConfirmar = controls({
      intent: { commandId: 'cmd-1', target: { teamLabel: 'B', seat: 0 } },
      unconfirmed: true,
      rejection: null,
    })

    it('avisa que puede haberse procesado y ofrece reintentar con el mismo comando', async () => {
      pintar({}, sinConfirmar)

      expect(screen.getByRole('alert')).toHaveTextContent('No se pudo confirmar tu ataque')
      expect(screen.getByRole('alert')).toHaveTextContent('no se duplica')

      await userEvent.click(screen.getByRole('button', { name: 'Reintentar ataque' }))

      expect(sinConfirmar.onRetry).toHaveBeenCalledTimes(1)
    })

    it('«Reintentar» no envia nada mientras la conexion no esta lista', async () => {
      const combat = controls({
        intent: { commandId: 'cmd-1', target: { teamLabel: 'B', seat: 0 } },
        unconfirmed: true,
        rejection: null,
      })
      pintar({ connection: 'reconnecting', synced: false }, combat)

      await userEvent.click(screen.getByRole('button', { name: 'Reintentar ataque' }))

      expect(combat.onRetry).not.toHaveBeenCalled()
    })

    it('no ofrece «Ataque básico» como una accion nueva mientras hay una intencion sin confirmar', async () => {
      const combat = pintar({}, sinConfirmar)

      await userEvent.click(boton())

      expect(combat.onAttack).not.toHaveBeenCalled()
    })
  })

  it('sin controles de habilidad y con la epica bloqueada (HU-31): no hay botones de ellas', () => {
    pintar()

    expect(screen.queryByRole('button', { name: /habilidad|épica/iu })).not.toBeInTheDocument()
    expect(
      screen.getByText(/La habilidad épica llegará cuando el juego defina/u),
    ).toBeInTheDocument()
  })
})
