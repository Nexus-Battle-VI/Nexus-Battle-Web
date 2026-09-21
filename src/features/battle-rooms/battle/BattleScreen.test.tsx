import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { CombatControls } from './AttackPanel'
import { initialAttackIntentState } from './attackIntent'
import type { LastAttack } from './battleReducer'
import { BattleScreen, type BattleScreenProps } from './BattleScreen'
import {
  ANA as ANA_REF,
  battle,
  BRUNO as BRUNO_REF,
  combatBattle,
  entry,
  MISS,
  RESOLUTION,
  withCombatants,
} from './fixtures'

const ANA = 'sujeto-ana'
const BRUNO = 'sujeto-bruno'

const pintar = (overrides: Partial<BattleScreenProps> = {}) =>
  render(<BattleScreen battle={battle()} subject={ANA} connection="open" synced {...overrides} />)

describe('BattleScreen — HU-17: ambos heroes, turno vigente y orden fijo (solo lectura)', () => {
  it('muestra a los dos heroes con su modelo real y sus nombres, sin datos fijos del cliente', async () => {
    pintar()

    // Modelos reales de la biblioteca visual, elegidos por el subtipo de cada participante.
    expect(await screen.findByRole('img', { name: 'Guerrero Armas' })).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'Mago Fuego' })).toBeInTheDocument()

    const rival = screen.getByRole('list', { name: /^Orden de turnos$/u })
    expect(within(rival).getAllByRole('listitem')).toHaveLength(2)
  })

  it('separa "Rival" y "Tu equipo": yo (Ana, equipo A) en mi equipo y Bruno (equipo B) como rival', () => {
    pintar()

    expect(screen.getByRole('heading', { name: 'Rival' })).toBeInTheDocument()
    // En 1 contra 1 el lado propio es «Tu héroe»; con equipos, «Tu equipo».
    expect(screen.getByRole('heading', { name: 'Tu héroe' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ana (tú), equipo A')).toBeInTheDocument()
    expect(screen.getByLabelText('Bruno, equipo B, turno actual')).toBeInTheDocument()
  })

  it('dice en TEXTO de quien es el turno: "Turno de Bruno" cuando el turno vigente es del rival', () => {
    pintar()

    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Turno de Bruno')
    expect(screen.getByText('Inicia Bruno la batalla · Ronda 1')).toBeInTheDocument()
  })

  it('dice "Tu turno" cuando el turno vigente es del sujeto de la sesion', () => {
    pintar({ subject: BRUNO })

    expect(screen.getByText('Tu turno')).toBeInTheDocument()
    expect(screen.getByText('Tú inicias la batalla · Ronda 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Bruno (tú), equipo B, turno actual')).toBeInTheDocument()
  })

  it('el turno actual se distingue por texto ("Turno actual"), no solo por color', () => {
    pintar()

    // En la tarjeta del combatiente («Turno actual») y en la franja de turnos («Actual»).
    expect(screen.getAllByText('Turno actual')).toHaveLength(1)
    expect(
      within(screen.getByRole('list', { name: 'Orden de turnos' })).getByText('Actual'),
    ).toBeInTheDocument()
  })

  it('tras avanzar el turno (el servidor publica turnsCompleted=1) el turno pasa a Ana', () => {
    pintar({ battle: battle(1) })

    expect(screen.getByText('Tu turno')).toBeInTheDocument()
    expect(screen.getByText('Ronda 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Ana (tú), equipo A, turno actual')).toBeInTheDocument()
  })

  it('la cola se muestra completa y en el orden que publica el servidor', () => {
    pintar()

    const cola = screen.getByRole('list', { name: 'Orden de turnos' })
    const filas = within(cola).getAllByRole('listitem')

    expect(filas).toHaveLength(2)
    expect(filas[0]).toHaveTextContent('1')
    expect(filas[0]).toHaveTextContent('Bruno')
    expect(filas[0]).toHaveTextContent('Actual')
    expect(filas[1]).toHaveTextContent('2')
    expect(filas[1]).toHaveTextContent('Ana (tú)')
    expect(filas[1]).not.toHaveTextContent('Actual')
  })

  it('un oponente IA se muestra con un marcador (sin heroe conocido) y sin identificadores', () => {
    const view = battle(0, [
      entry(0, { kind: 'AI', playerId: null, displayName: null, heroId: null, heroSubtype: null }),
      entry(1),
    ])
    pintar({ battle: view })

    expect(screen.getByRole('img', { name: 'Oponente IA' })).toBeInTheDocument()
    expect(screen.getByText('Turno de Oponente IA')).toBeInTheDocument()
  })

  it('NUNCA muestra identificadores tecnicos (sujeto ni heroId)', () => {
    const { container } = pintar()

    expect(container.textContent).not.toContain('sujeto-')
    expect(container.textContent).not.toContain('heroe-')
  })

  it('no ofrece botones de accion: ataque, habilidad y epica llegan con HU-18/HU-19', () => {
    pintar({ subject: BRUNO })

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByLabelText('Acciones de combate')).toHaveTextContent(
      'llegarán con las siguientes historias',
    )
  })

  it('2v2: reparte 2 y 2 y marca a un solo participante como turno actual', () => {
    const view = battle(1, [
      entry(0, { teamLabel: 'B', displayName: 'B1', playerId: 'b1', heroSubtype: 'MEDICO' }),
      entry(1, { teamLabel: 'A', displayName: 'A1', playerId: ANA, heroSubtype: 'CHAMAN' }),
      entry(2, {
        teamLabel: 'B',
        displayName: 'B2',
        playerId: 'b2',
        heroSubtype: 'GUERRERO_TANQUE',
      }),
      entry(3, { teamLabel: 'A', displayName: 'A2', playerId: 'a2', heroSubtype: 'MAGO_HIELO' }),
    ])
    pintar({ battle: view })

    const cola = within(screen.getByRole('list', { name: 'Orden de turnos' }))

    expect(cola.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getAllByText('Turno actual')).toHaveLength(1)
    expect(cola.getAllByText('Actual')).toHaveLength(1)
    expect(screen.getByText('Tu turno')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Rival' })).toBeInTheDocument()
  })

  it('reconexion: avisa con texto y conserva lo ultimo que dijo el servidor', () => {
    pintar({ connection: 'reconnecting', synced: false })

    expect(screen.getByText(/Reconectando en tiempo real/u)).toBeInTheDocument()
    expect(screen.getByText('Turno de Bruno')).toBeInTheDocument()
  })

  it('conexion abierta pero sin sincronizar (recuperando estado) tambien lo indica', () => {
    pintar({ connection: 'open', synced: false })

    expect(screen.getByText(/Reconectando en tiempo real/u)).toBeInTheDocument()
  })

  it('conexion sincronizada: no muestra avisos de reconexion', () => {
    pintar()

    expect(screen.queryByText(/Reconectando/u)).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('autenticacion en tiempo real fallida: alerta accesible', () => {
    pintar({ connection: 'failed', synced: false })

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo autenticar la conexión')
  })

  it('el anuncio del turno es una region viva y educada (lectores de pantalla)', () => {
    pintar()

    const region = screen.getByRole('status', { name: '' })

    expect(region).toHaveAttribute('aria-live', 'polite')
  })
})

const lastAttack = (resolution = RESOLUTION, before = 44, after = 38): LastAttack => ({
  seq: 2,
  commandId: 'cmd-1',
  attacker: BRUNO_REF,
  target: ANA_REF,
  resolution,
  targetHealth: { before, after },
})

const controles = (): CombatControls => ({
  attack: initialAttackIntentState,
  onAttack: vi.fn(),
  onRetry: vi.fn(),
  onDismissRejection: vi.fn(),
})

describe('BattleScreen — HU-18: Vida, resultado del ultimo ataque y acciones', () => {
  it('cada tarjeta muestra la Vida como texto y como medidor accesible', () => {
    pintar({
      battle: combatBattle(0, [
        [44, 44],
        [32, 44],
      ]),
    })

    expect(screen.getByText('32 / 44')).toBeInTheDocument()
    expect(screen.getByText('44 / 44')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Vida de Ana' })).toHaveAttribute(
      'aria-valuenow',
      '32',
    )
    expect(screen.getByRole('meter', { name: 'Vida de Bruno' })).toHaveAttribute(
      'aria-valuenow',
      '44',
    )
  })

  it('la Vida sale SOLO de lo que publica el servidor: otra vista, otra Vida (nada calculado)', () => {
    const { rerender } = pintar({
      battle: combatBattle(1, [
        [44, 44],
        [38, 44],
      ]),
    })

    expect(screen.getByText('38 / 44')).toBeInTheDocument()

    rerender(
      <BattleScreen
        battle={combatBattle(2, [
          [44, 44],
          [7, 44],
        ])}
        subject={ANA}
        connection="open"
        synced
      />,
    )

    expect(screen.getByText('7 / 44')).toBeInTheDocument()
    expect(screen.queryByText('38 / 44')).not.toBeInTheDocument()
  })

  it('un combatiente sin Vida se marca en texto («Sin Vida»)', () => {
    pintar({
      battle: combatBattle(0, [
        [44, 44],
        [0, 44],
      ]),
    })

    expect(screen.getByText('Sin Vida')).toBeInTheDocument()
    expect(screen.getByText('0 / 44')).toBeInTheDocument()
  })

  it('una batalla anterior a HU-18 (sin Vida) no pinta barras ni inventa valores', () => {
    pintar()

    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
    expect(screen.queryByText(/Vida/u)).not.toBeInTheDocument()
  })

  it('un oponente IA sin perfil dice que su Vida no esta disponible, sin inventarla', () => {
    const view = withCombatants(
      battle(0, [
        entry(0, {
          kind: 'AI',
          playerId: null,
          displayName: null,
          heroId: null,
          heroSubtype: null,
        }),
        entry(1),
      ]),
      [null, [44, 44]],
    )
    pintar({ battle: view })

    expect(screen.getByText('Vida no disponible')).toBeInTheDocument()
    expect(screen.getAllByRole('meter')).toHaveLength(1)
  })

  it('sin `combat` la pantalla es de solo lectura: se ve la Vida pero no hay ningun boton', () => {
    pintar({ battle: combatBattle(1), subject: ANA })

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('con `combat`, en mi turno aparece «Ataque básico»; fuera de mi turno no', () => {
    const { unmount } = pintar({ battle: combatBattle(1), subject: ANA, combat: controles() })

    expect(screen.getByRole('button', { name: 'Ataque básico' })).toBeInTheDocument()

    unmount()
    pintar({ battle: combatBattle(0), subject: ANA, combat: controles() })

    expect(screen.queryByRole('button', { name: 'Ataque básico' })).not.toBeInTheDocument()
  })

  it('el resultado del ultimo ataque va en una region viva con nombre, SIEMPRE presente', () => {
    pintar()

    const region = screen.getByRole('status', { name: 'Resultado del último ataque' })

    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toBeEmptyDOMElement()
  })

  it('golpe efectivo: describe el efecto, el porcentaje, el dano y la Vida con los datos del servidor', () => {
    pintar({ battle: combatBattle(1), lastAttack: lastAttack() })

    const region = screen.getByRole('status', { name: 'Resultado del último ataque' })

    expect(region).toHaveTextContent('Bruno atacó a Ana: Golpe crítico (137 %)')
    expect(region).toHaveTextContent('El Ataque (14) superó la Defensa (11)')
    expect(region).toHaveTextContent('Daño aplicado: 6')
    expect(region).toHaveTextContent('Vida de Ana: 44 → 38')
  })

  it('golpe que no supera la Defensa: «sin efecto» con los dos valores comparados', () => {
    pintar({ battle: combatBattle(1), lastAttack: lastAttack(MISS, 44, 44) })

    const region = screen.getByRole('status', { name: 'Resultado del último ataque' })

    expect(region).toHaveTextContent('sin efecto')
    expect(region).toHaveTextContent('El Ataque (11) no superó la Defensa (11)')
  })

  it('ambos jugadores ven el mismo resultado (lo pinta cualquier perspectiva)', () => {
    const { unmount } = pintar({ battle: combatBattle(1), subject: ANA, lastAttack: lastAttack() })
    const ana = screen.getByRole('status', { name: 'Resultado del último ataque' }).textContent

    unmount()
    pintar({ battle: combatBattle(1), subject: BRUNO, lastAttack: lastAttack() })

    expect(screen.getByRole('status', { name: 'Resultado del último ataque' }).textContent).toBe(
      ana,
    )
  })

  it('no filtra identificadores tecnicos ni el commandId', () => {
    const { container } = pintar({
      battle: combatBattle(1),
      lastAttack: lastAttack(),
      combat: controles(),
    })

    expect(container.textContent).not.toMatch(/sujeto-|heroe-|cmd-1/u)
  })

  it('tarjetas en una sola columna en movil: la rejilla parte de `grid-cols-1` (320 px)', () => {
    const { container } = pintar({ battle: combatBattle(0) })

    for (const lista of container.querySelectorAll('ul')) {
      expect(lista.className).toContain('grid-cols-1')
    }
  })
})

/** 3 contra 3: equipo B (posiciones pares) y equipo A (impares), con la Vida publicada por el servidor. */
const tresContraTres = (turnsCompleted = 1): ReturnType<typeof battle> =>
  withCombatants(
    battle(turnsCompleted, [
      entry(0, { teamLabel: 'B', seat: 0, displayName: 'B1', playerId: 'b1' }),
      entry(1, { teamLabel: 'A', seat: 0, displayName: 'A1', playerId: ANA }),
      entry(2, { teamLabel: 'B', seat: 1, displayName: 'B2', playerId: 'b2' }),
      entry(3, { teamLabel: 'A', seat: 1, displayName: 'A2', playerId: 'a2' }),
      entry(4, { teamLabel: 'B', seat: 2, displayName: 'B3', playerId: 'b3' }),
      entry(5, { teamLabel: 'A', seat: 2, displayName: 'A3', playerId: 'a3' }),
    ]),
    [
      [44, 44],
      [44, 44],
      [30, 30],
      [52, 52],
      [36, 36],
      [40, 40],
    ],
  )

describe('BattleScreen — arena: una sola pantalla para 1v1, 2v2 y 3v3, con el orden de lectura del DOM', () => {
  it('el orden del DOM es: estado, arena (rival y luego mi lado), resultado, acciones y turnos', () => {
    pintar({ battle: combatBattle(1), lastAttack: lastAttack(), combat: controles() })

    const estado = screen.getByRole('status', { name: '' })
    const rival = screen.getByRole('heading', { name: 'Rival' })
    const propio = screen.getByRole('heading', { name: 'Tu héroe' })
    const resultado = screen.getByRole('status', { name: 'Resultado del último ataque' })
    const acciones = screen.getByRole('heading', { name: 'Acciones de combate' })
    const turnos = screen.getByRole('heading', { name: 'Turnos' })
    const enOrden = [estado, rival, propio, resultado, acciones, turnos]

    for (let i = 0; i < enOrden.length - 1; i += 1) {
      const actual = enOrden[i]
      const siguiente = enOrden[i + 1]

      expect(
        (actual?.compareDocumentPosition(siguiente as Node) ?? 0) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    }
  })

  it('un solo arbol de DOM: una sola lista de turnos y un medidor por combatiente (nada duplicado)', () => {
    pintar({ battle: tresContraTres(), combat: controles() })

    expect(screen.getAllByRole('list', { name: 'Orden de turnos' })).toHaveLength(1)
    expect(screen.getAllByRole('meter')).toHaveLength(6)
    expect(screen.getAllByRole('region', { name: 'Batalla' })).toHaveLength(1)
  })

  it('3v3: tres tarjetas por lado, cada una con su Vida, sin lista gigante de tarjetas de ancho completo', () => {
    pintar({ battle: tresContraTres(), combat: controles() })

    const rival = within(screen.getByRole('region', { name: 'Rival' }))
    const propio = within(screen.getByRole('region', { name: 'Tu equipo' }))

    expect(rival.getAllByRole('listitem')).toHaveLength(3)
    expect(propio.getAllByRole('listitem')).toHaveLength(3)
    expect(rival.getAllByRole('meter')).toHaveLength(3)
    expect(propio.getByLabelText('A1 (tú), equipo A, turno actual')).toBeInTheDocument()
  })

  it('2v2: dos tarjetas por lado y el titulo del lado propio pasa a «Tu equipo»', () => {
    const view = withCombatants(
      battle(1, [
        entry(0, { teamLabel: 'B', seat: 0, displayName: 'B1', playerId: 'b1' }),
        entry(1, { teamLabel: 'A', seat: 0, displayName: 'A1', playerId: ANA }),
        entry(2, { teamLabel: 'B', seat: 1, displayName: 'B2', playerId: 'b2' }),
        entry(3, { teamLabel: 'A', seat: 1, displayName: 'A2', playerId: 'a2' }),
      ]),
      [
        [44, 44],
        [44, 44],
        [30, 30],
        [52, 52],
      ],
    )
    pintar({ battle: view, combat: controles() })

    expect(
      within(screen.getByRole('region', { name: 'Rival' })).getAllByRole('listitem'),
    ).toHaveLength(2)
    expect(
      within(screen.getByRole('region', { name: 'Tu equipo' })).getAllByRole('listitem'),
    ).toHaveLength(2)
  })

  it('en 1 contra 1 no repite ruido: ni «Tu oponente» ni «Equipo B» como texto visible (el equipo sigue en el nombre accesible)', () => {
    const { container } = pintar({ battle: combatBattle(1), combat: controles() })

    expect(screen.queryByText('Tu oponente')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Equipo [AB]$/u)).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/sujeto-|heroe-/u)
    expect(screen.getByLabelText('Bruno, equipo B')).toBeInTheDocument()
  })

  it('la franja de turnos muestra `battle.turnOrder` tal cual llega, sin reordenar ni recalcular', () => {
    pintar({ battle: tresContraTres(3), combat: controles() })

    const nombres = within(screen.getByRole('list', { name: 'Orden de turnos' }))
      .getAllByRole('listitem')
      .map((fila) => fila.textContent)

    expect(nombres).toHaveLength(6)
    expect(nombres[0]).toContain('B1')
    expect(nombres[1]).toContain('A1 (tú)')
    expect(nombres[5]).toContain('A3')
    // Turno 3 completado: el actual es la posicion 3 (A2), tal como lo publico el servidor.
    expect(nombres[3]).toContain('Actual')
    expect(nombres.filter((fila) => fila.includes('Actual'))).toHaveLength(1)
  })

  it('el HUD dice la conexion en texto: «Conectado» y, al perderla, «Reconectando…»', () => {
    const { unmount } = pintar()

    expect(screen.getByText('Conectado')).toBeInTheDocument()

    unmount()
    pintar({ connection: 'reconnecting', synced: false })

    expect(screen.getByText('Reconectando…')).toBeInTheDocument()
    expect(screen.queryByText('Conectado')).not.toBeInTheDocument()
  })

  it('sin ataque previo la region de resultado existe pero vacia (no reserva altura ni texto)', () => {
    pintar({ combat: controles() })

    expect(
      screen.getByRole('status', { name: 'Resultado del último ataque' }),
    ).toBeEmptyDOMElement()
  })

  it('el objetivo, la Vida de ambos y «Ataque básico» estan a la vez en 1 contra 1 (mi turno)', () => {
    pintar({ battle: combatBattle(1), combat: controles() })

    expect(screen.getByRole('radio', { name: /Bruno/u })).toBeChecked()
    expect(screen.getByRole('meter', { name: 'Vida de Bruno' })).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Vida de Ana' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ataque básico' })).toBeInTheDocument()
  })
})
