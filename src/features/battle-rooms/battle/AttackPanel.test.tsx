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
    // 9a pasada (secciones 33-36 del brief): el texto sigue en el DOM (sigue
    // describiendo el boton via `aria-describedby`, para lectores de
    // pantalla), pero deja de ser VISIBLE -- ya no se repite bajo cada
    // tarjeta de accion.
    expect(screen.getByText('Esperando el resultado de tu acción…')).toHaveClass('sr-only')
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

  // 7a pasada (secciones 37-41 del brief): el selector de radios ("○ Bea...",
  // "○ Beto...") se quito de la UI -- el objetivo ahora se elige EXCLUSIVAMENTE
  // haciendo clic sobre el heroe en la arena (`BattleArena.tsx`), que le pasa el
  // MISMO `TargetRef` a `BattleScreen`, que lo entrega aqui como el prop
  // `selectedTarget` YA CONTROLADO (exactamente lo que hacia antes el radio,
  // ahora disparado desde afuera en vez de un input interno). Estos tests
  // simulan esa misma entrada controlada, sin inventar una UI propia aqui.
  describe('2 contra 2: varios objetivos posibles (el target llega CONTROLADO, elegido en la arena)', () => {
    const vista = (health: readonly (readonly [number, number])[]) =>
      withCombatants(battle(1, DOS_CONTRA_DOS), health)

    const todos = [
      [44, 44],
      [44, 44],
      [44, 44],
      [44, 44],
    ] as const

    it('attackableTargets ofrece SOLO a los rivales (no a mi ni a mi aliado) -- verificado via la intencion enviada', async () => {
      const combat = pintar({
        battle: vista(todos),
        selectedTarget: { teamLabel: 'B', seat: 1 },
      })

      await userEvent.click(boton())

      // Si `attackableTargets` incluyera a un aliado/a mi, esto no cambia nada
      // aqui -- la regla real vive en `presentation.ts` (sin tocar); esto solo
      // confirma que UN rival valido llega intacto hasta `onAttack`.
      expect(combat.onAttack).toHaveBeenCalledWith({ teamLabel: 'B', seat: 1 })
    })

    it('sin `selectedTarget` el boton esta deshabilitado y pide elegir (en la arena, no en un radio)', async () => {
      const combat = pintar({ battle: vista(todos), selectedTarget: null })

      expect(boton()).toHaveAttribute('aria-disabled', 'true')
      expect(screen.getByText('Elige un objetivo.')).toBeInTheDocument()
      expect(screen.getByText('Selecciona un objetivo en la arena')).toBeInTheDocument()

      await userEvent.click(boton())

      expect(combat.onAttack).not.toHaveBeenCalled()
    })

    it('con `selectedTarget` (elegido en la arena) el boton ataca a ESE rival (teamLabel, seat)', async () => {
      const combat = pintar({
        battle: vista(todos),
        selectedTarget: { teamLabel: 'B', seat: 1 },
      })

      expect(boton()).toHaveAttribute('aria-disabled', 'false')

      await userEvent.click(boton())

      expect(combat.onAttack).toHaveBeenCalledTimes(1)
      expect(combat.onAttack).toHaveBeenCalledWith({ teamLabel: 'B', seat: 1 })
    })

    it('un rival sin Vida NO es un objetivo valido: seleccionarlo NO habilita el ataque', () => {
      pintar({
        battle: vista([
          [0, 44],
          [44, 44],
          [30, 44],
          [44, 44],
        ]),
        // Bea (B/0) ya no tiene Vida -- `attackAvailability` la rechaza aunque
        // llegue como `selectedTarget` (la regla real, sin tocar, decide esto).
        selectedTarget: { teamLabel: 'B', seat: 0 },
      })

      expect(boton()).toHaveAttribute('aria-disabled', 'true')
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
    // 8a pasada (secciones 36-40 del brief): el texto "la habilidad épica
    // llegará..." se quita de la vista -- es una nota tecnica sin
    // contraparte real y sin ningun control que la describa
    // (`aria-describedby`), asi que ya no hace falta en ninguna forma.
    expect(
      screen.queryByText(/La habilidad épica llegará cuando el juego defina/u),
    ).not.toBeInTheDocument()
  })
})
