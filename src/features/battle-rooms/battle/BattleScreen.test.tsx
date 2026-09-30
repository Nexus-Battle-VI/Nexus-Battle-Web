import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

describe('BattleScreen — avatar del jugador junto a su nombre (HU-15)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pide el avatar de cada jugador humano por su sujeto, una sola vez por jugador', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(['png'], { type: 'image/png' }), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn().mockReturnValue('blob:avatar'),
      revokeObjectURL: vi.fn(),
    })

    pintar()

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls.some((url) => url.includes('/accounts/by-subject/sujeto-ana/avatar'))).toBe(true)
    expect(urls.some((url) => url.includes('/accounts/by-subject/sujeto-bruno/avatar'))).toBe(true)
    // El heroe sigue siendo el elemento principal: el modelo no se sustituye.
    expect(await screen.findByRole('img', { name: 'Guerrero Armas' })).toBeInTheDocument()
  })
})

describe('BattleScreen — HU-17: ambos heroes, turno vigente y orden fijo (solo lectura)', () => {
  it('muestra a los dos heroes con su modelo real y sus nombres, sin datos fijos del cliente', async () => {
    pintar()

    // Modelos reales de la biblioteca visual, elegidos por el subtipo de cada participante.
    expect(await screen.findByRole('img', { name: 'Guerrero Armas' })).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'Mago Fuego' })).toBeInTheDocument()
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

    // 4a pasada (seccion 35 del brief): la linea de apertura ("Inicia X la
    // batalla · Ronda N") ya NO se muestra visualmente en "Nexus · Arena" --
    // sigue siendo dato accesible dentro del MISMO anuncio `role="status"`
    // sr-only de arriba (titular + detalle).
    const estado = screen.getByRole('status', { name: '' })
    expect(estado).toHaveTextContent('Turno de Bruno')
    expect(estado).toHaveTextContent('Inicia Bruno la batalla · Ronda 1')
    expect(screen.getByText('Turno de Bruno')).toBeInTheDocument()
  })

  it('dice "Tu turno" cuando el turno vigente es del sujeto de la sesion', () => {
    pintar({ subject: BRUNO })

    expect(screen.getByText('Tu turno')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(
      'Tú inicias la batalla · Ronda 1',
    )
    expect(screen.getByLabelText('Bruno (tú), equipo B, turno actual')).toBeInTheDocument()
  })

  it('el turno actual se anuncia por accesibilidad y por "Turno de X"/"Tu turno", sin chip visible redundante sobre el heroe', () => {
    pintar()

    // Pasada final (secciones 5-8, 82 del brief): el chip "TURNO ACTUAL"
    // sobre el heroe se quita -- era redundante con "Turno de Bruno" (Nexus
    // Arena, arriba) y ademas era la UNICA pieza de contenido variable entre
    // dos turnos que desestabilizaba el ancho del nameplate. Ningun texto
    // visible "Turno actual" debe existir ya en el DOM; la fuente textual
    // del turno sigue siendo "Turno de X"/"Tu turno", y el aria-label del
    // heroe activo sigue anunciandolo para lectores de pantalla.
    expect(screen.queryByText('Turno actual')).not.toBeInTheDocument()
    expect(screen.getByText('Turno de Bruno')).toBeInTheDocument()
    expect(screen.getByLabelText('Bruno, equipo B, turno actual')).toBeInTheDocument()
  })

  it('tras avanzar el turno (el servidor publica turnsCompleted=1) el turno pasa a Ana', () => {
    pintar({ battle: battle(1) })

    expect(screen.getByText('Tu turno')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Ronda 1')
    expect(screen.getByLabelText('Ana (tú), equipo A, turno actual')).toBeInTheDocument()
  })

  // 6a pasada (secciones 33-35, 76-77, 127 del brief): Richard pidio verificar EXPLICITAMENTE
  // que la decoracion de "turno actual" no esta hardcodeada en un combatiente concreto --
  // debe moverse solo porque `battle.currentTurn` (dato real, seccion 34) cambia. Se prueba
  // con TRES combatientes distintos (no solo dos) para demostrar que se mueve mas de una vez.
  describe('la decoracion de "turno actual" depende UNICAMENTE de battle.currentTurn (nunca hardcodeada)', () => {
    const threeWay = (turnsCompleted: number) =>
      battle(turnsCompleted, [
        entry(0, { teamLabel: 'B', seat: 0, displayName: 'Bruno', playerId: BRUNO }),
        entry(1, { teamLabel: 'A', seat: 0, displayName: 'Ana', playerId: ANA }),
        entry(2, { teamLabel: 'B', seat: 1, displayName: 'Carla', playerId: 'sujeto-carla' }),
      ])

    it('estado 1: currentTurn = Bruno -> la insignia esta SOLO en Bruno', () => {
      pintar({ battle: threeWay(0) })

      expect(screen.getByLabelText(/^Bruno, equipo B, turno actual$/u)).toBeInTheDocument()
      expect(screen.getAllByLabelText(/turno actual/u)).toHaveLength(1)
    })

    it('estado 2: turnAdvanced -> currentTurn = Ana -> la insignia se MUEVE a Ana y desaparece de Bruno', () => {
      pintar({ battle: threeWay(1) })

      expect(screen.queryByLabelText(/^Bruno,.*turno actual$/u)).not.toBeInTheDocument()
      expect(screen.getByLabelText(/^Ana \(tú\), equipo A, turno actual$/u)).toBeInTheDocument()
      expect(screen.getAllByLabelText(/turno actual/u)).toHaveLength(1)
    })

    it('estado 3: otro turnAdvanced -> currentTurn = Carla -> la insignia se mueve de nuevo (no vuelve a Bruno)', () => {
      pintar({ battle: threeWay(2) })

      expect(screen.queryByLabelText(/^Ana.*turno actual$/u)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/^Bruno,.*turno actual$/u)).not.toBeInTheDocument()
      expect(screen.getByLabelText(/^Carla, equipo B, turno actual$/u)).toBeInTheDocument()
      expect(screen.getAllByLabelText(/turno actual/u)).toHaveLength(1)
    })
  })

  // 6a pasada (secciones 77 del brief): target y turno actual son estados
  // independientes -- elegir a quien atacar durante el turno de Ana NO
  // cambia `battle.currentTurn` (Ana sigue con la insignia de turno actual).
  // 7a pasada (secciones 38-44, 63, 84-85 del brief): el click ahora ocurre
  // DIRECTO sobre el heroe en la arena (ya no hay radio visible) -- MISMO
  // `TargetRef`/handler real (`onSelectTarget`, elevado a `BattleScreen`),
  // solo cambia la superficie de interaccion.
  it('click en el heroe rival en la arena selecciona target SIN cambiar quien tiene el turno actual (target y currentTurn son independientes)', () => {
    // 2 rivales (Bruno y Carla): con mas de uno, NINGUNO se auto-selecciona --
    // asi el clic prueba de verdad que selecciona, no solo que "ya estaba".
    const conDosRivales = combatBattle(
      1,
      [
        [44, 44],
        [44, 44],
        [44, 44],
      ],
      [
        entry(0, { teamLabel: 'B', seat: 0, displayName: 'Bruno', playerId: BRUNO }),
        entry(1, { teamLabel: 'A', seat: 0, displayName: 'Ana', playerId: ANA }),
        entry(2, { teamLabel: 'B', seat: 1, displayName: 'Carla', playerId: 'sujeto-carla' }),
      ],
    )
    pintar({ battle: conDosRivales, combat: controles() })

    expect(screen.getByLabelText('Ana (tú), equipo A, turno actual')).toBeInTheDocument()

    const brunoEnArena = screen.getByRole('button', { name: 'Elegir a Bruno como objetivo' })
    expect(brunoEnArena).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(brunoEnArena)

    // El target queda marcado en el HEROE (data-selected, seccion 43), NUNCA
    // con la decoracion de turno actual (conceptos distintos, seccion 63).
    expect(brunoEnArena).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Ana (tú), equipo A, turno actual')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Bruno,.*turno actual$/u)).not.toBeInTheDocument()
  })

  it('click en OTRO rival cambia el target (seccion 85): Carla queda seleccionada y Bruno deja de estarlo', () => {
    const conDosRivales = combatBattle(
      1,
      [
        [44, 44],
        [44, 44],
        [44, 44],
      ],
      [
        entry(0, { teamLabel: 'B', seat: 0, displayName: 'Bruno', playerId: BRUNO }),
        entry(1, { teamLabel: 'A', seat: 0, displayName: 'Ana', playerId: ANA }),
        entry(2, { teamLabel: 'B', seat: 1, displayName: 'Carla', playerId: 'sujeto-carla' }),
      ],
    )
    pintar({ battle: conDosRivales, combat: controles() })

    const brunoEnArena = screen.getByRole('button', { name: 'Elegir a Bruno como objetivo' })
    const carlaEnArena = screen.getByRole('button', { name: 'Elegir a Carla como objetivo' })

    fireEvent.click(brunoEnArena)
    expect(brunoEnArena).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(carlaEnArena)
    expect(carlaEnArena).toHaveAttribute('aria-pressed', 'true')
    expect(brunoEnArena).toHaveAttribute('aria-pressed', 'false')
    // El turno sigue siendo de Ana en todo momento.
    expect(screen.getByLabelText('Ana (tú), equipo A, turno actual')).toBeInTheDocument()
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

  it('sin controles de combate la pantalla es de solo lectura: ningun boton de accion', () => {
    pintar({ subject: BRUNO })

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByLabelText('Acciones de combate')).toHaveTextContent(
      'no están disponibles en esta vista',
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

    expect(screen.queryByText('Turno actual')).not.toBeInTheDocument()
    expect(screen.getAllByLabelText(/turno actual/u)).toHaveLength(1)
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

    const region = screen.getByRole('status', { name: 'Resultado de la última acción' })

    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toBeEmptyDOMElement()
  })

  it('golpe efectivo: describe el efecto, el porcentaje, el dano y la Vida con los datos del servidor', () => {
    pintar({ battle: combatBattle(1), lastAttack: lastAttack() })

    const region = screen.getByRole('status', { name: 'Resultado de la última acción' })

    expect(region).toHaveTextContent('¡Golpe crítico de Bruno a Ana!')
    expect(region).toHaveTextContent('−6 Vida')
    expect(region).toHaveTextContent('Ana: 44 → 38')
    expect(region).toHaveTextContent('Ataque 14 vs Defensa 11 · Golpe crítico 137 %')
  })

  it('golpe que no supera la Defensa: sin daño, con los dos valores comparados', () => {
    pintar({ battle: combatBattle(1), lastAttack: lastAttack(MISS, 44, 44) })

    const region = screen.getByRole('status', { name: 'Resultado de la última acción' })

    expect(region).toHaveTextContent('Bruno atacó a Ana, pero no superó su Defensa')
    expect(region).toHaveTextContent('Sin daño')
    expect(region).toHaveTextContent('Ataque 11 vs Defensa 11')
  })

  it('ambos jugadores ven el mismo resultado (lo pinta cualquier perspectiva)', () => {
    const { unmount } = pintar({ battle: combatBattle(1), subject: ANA, lastAttack: lastAttack() })
    const ana = screen.getByRole('status', { name: 'Resultado de la última acción' }).textContent

    unmount()
    pintar({ battle: combatBattle(1), subject: BRUNO, lastAttack: lastAttack() })

    expect(screen.getByRole('status', { name: 'Resultado de la última acción' }).textContent).toBe(
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
    pintar({ battle: combatBattle(0) })

    // Remaster visual Sprint 3 (2a pasada): las rejillas de HEROES (una por
    // lado, dentro de "Rival"/"Tu héroe") siguen partiendo de una columna en
    // movil. La lista de ESTADO del HUD (`br-hud-status`, Vida/Poder) es una
    // columna vertical propia, no una rejilla de heroes -- no aplica aqui.
    const rival = within(screen.getByRole('region', { name: 'Rival' }))
    const propio = within(screen.getByRole('region', { name: 'Tu héroe' }))

    for (const lista of [rival.getByRole('list'), propio.getByRole('list')]) {
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
  // Remaster visual Sprint 3 (3a pasada, seccion 32-45 del brief): el orden
  // visual cambio (mi HUD y "Nexus · Arena" arriba, mi equipo a la izquierda
  // de la arena, el enemigo a la derecha), pero el orden del DOM sigue siendo
  // UNA sola secuencia logica, sin `order`.
  it('el orden del DOM es: estado, mi lado, rival, resultado y acciones', () => {
    pintar({ battle: combatBattle(1), lastAttack: lastAttack(), combat: controles() })

    const estado = screen.getByRole('status', { name: '' })
    const propio = screen.getByRole('heading', { name: 'Tu héroe' })
    const rival = screen.getByRole('heading', { name: 'Rival' })
    const resultado = screen.getByRole('status', { name: 'Resultado de la última acción' })
    const acciones = screen.getByRole('heading', { name: 'Acciones de combate' })
    const enOrden = [estado, propio, rival, resultado, acciones]

    for (let i = 0; i < enOrden.length - 1; i += 1) {
      const actual = enOrden[i]
      const siguiente = enOrden[i + 1]

      expect(
        (actual?.compareDocumentPosition(siguiente as Node) ?? 0) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    }
  })

  it('un solo arbol de DOM: un medidor de Vida por combatiente y una sola region de batalla', () => {
    pintar({ battle: tresContraTres(), combat: controles() })

    expect(screen.getAllByRole('region', { name: 'Batalla' })).toHaveLength(1)
    // Remaster visual Sprint 3 (3a pasada): el combatiente principal de cada
    // lado va en el HUD de esquina, sus companeros debajo -- AMBOS con el
    // mismo `HealthBar` real de produccion (nada calculado dos veces): 6
    // medidores de Vida en total para 3v3.
    expect(screen.getAllByRole('meter', { name: /^Vida de /u })).toHaveLength(6)
  })

  it('3v3: tres tarjetas por lado en la arena, y tres unidades de HUD por lado (fila, no columna)', () => {
    const { container } = pintar({ battle: tresContraTres(), combat: controles() })

    const rival = within(screen.getByRole('region', { name: 'Rival' }))
    const propio = within(screen.getByRole('region', { name: 'Tu equipo' }))

    expect(rival.getAllByRole('listitem')).toHaveLength(3)
    expect(propio.getAllByRole('listitem')).toHaveLength(3)
    // 6a pasada (secciones 23, 89 del brief): 3 unidades de HUD por lado, en
    // la MISMA fila (`.br-hud-row`) -- nunca una columna aparte de
    // "companeros". Con Vida real (mismo `HealthBar` de produccion).
    const leftUnits = container.querySelectorAll('.br-hud-corner--left .br-hud-unit')
    const rightUnits = container.querySelectorAll('.br-hud-corner--right .br-hud-unit')
    expect(leftUnits).toHaveLength(3)
    expect(rightUnits).toHaveLength(3)
    expect([...leftUnits].some((unit) => unit.textContent.includes('52 / 52'))).toBe(true)
    expect([...rightUnits].some((unit) => unit.textContent.includes('30 / 30'))).toBe(true)
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

  // 6a pasada (secciones 16-24, 89-B/C/D, 125-126 del brief): el bug reportado --
  // "Ana ocupa una anchura grande, Diego se ve mas compacto" -- era la asimetria entre el
  // combatiente principal (a todo el ancho del HUD) y sus companeros (en una fila mas chica
  // debajo). Ahora los DOS son la MISMA unidad (`.br-hud-unit`), en fila horizontal
  // (`.br-hud-row`), y dentro de cada una el orden es SIEMPRE Nombre -> Vida -> Poder.
  it('HUD: mi lado y el rival son unidades horizontales iguales, cada una Nombre -> Vida -> Poder (nunca Poder antes que Vida)', () => {
    const order = [
      entry(0, { teamLabel: 'B', seat: 0, displayName: 'Bruno', playerId: 'b1' }),
      entry(1, { teamLabel: 'A', seat: 0, displayName: 'Ana', playerId: ANA }),
      entry(2, { teamLabel: 'B', seat: 1, displayName: 'Carla', playerId: 'b2' }),
      entry(3, { teamLabel: 'A', seat: 1, displayName: 'Diego', playerId: 'a2' }),
    ]
    // Con Poder real (a diferencia de `withCombatants`, que solo trae Vida):
    // el orden Nombre -> Vida -> Poder solo es verificable de verdad cuando
    // el Poder tambien esta presente en los 4 combatientes.
    const view = {
      ...battle(1, order),
      combatants: [
        {
          teamLabel: 'B' as const,
          seat: 0,
          health: { current: 40, max: 44 },
          power: { current: 4, max: 10 },
        },
        {
          teamLabel: 'A' as const,
          seat: 0,
          health: { current: 44, max: 44 },
          power: { current: 6, max: 10 },
        },
        {
          teamLabel: 'B' as const,
          seat: 1,
          health: { current: 30, max: 30 },
          power: { current: 8, max: 10 },
        },
        {
          teamLabel: 'A' as const,
          seat: 1,
          health: { current: 52, max: 52 },
          power: { current: 2, max: 10 },
        },
      ],
    }
    const { container } = pintar({ battle: view, combat: controles() })

    // Nunca una columna vertical alta: ambos lados son filas (seccion 18/21).
    const leftUnits = container.querySelectorAll('.br-hud-corner--left .br-hud-unit')
    const rightUnits = container.querySelectorAll('.br-hud-corner--right .br-hud-unit')

    expect(leftUnits).toHaveLength(2)
    expect(rightUnits).toHaveLength(2)

    // Misma clase/estructura para TODOS -- eso es lo que garantiza el mismo
    // ancho compacto (seccion 17), no una unidad principal + companeros
    // aparte con otra estructura.
    for (const unit of [...leftUnits, ...rightUnits]) {
      const name = unit.querySelector('.br-hud-unit-name')?.textContent ?? ''
      const text = unit.textContent
      const nameIndex = text.indexOf(name)
      const vidaIndex = text.indexOf('Vida')
      const poderIndex = text.indexOf('Poder')

      expect(name.length).toBeGreaterThan(0)
      expect(nameIndex).toBe(0)
      expect(vidaIndex).toBeGreaterThan(nameIndex)
      expect(poderIndex).toBeGreaterThan(vidaIndex)
    }
  })

  it('en 1 contra 1 no repite ruido: ni «Tu oponente» ni «Equipo B» como texto visible (el equipo sigue en el nombre accesible)', () => {
    const { container } = pintar({ battle: combatBattle(1), combat: controles() })

    expect(screen.queryByText('Tu oponente')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Equipo [AB]$/u)).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/sujeto-|heroe-/u)
    expect(screen.getByLabelText('Bruno, equipo B')).toBeInTheDocument()
  })

  it('ya no muestra «Conectado» de forma permanente; al reconectar SI avisa (seccion 37 del brief)', () => {
    const { unmount } = pintar()

    expect(screen.queryByText('Conectado')).not.toBeInTheDocument()

    unmount()
    pintar({ connection: 'reconnecting', synced: false })

    expect(
      screen.getByText(
        'Reconectando en tiempo real… El estado se recuperará al volver la conexión.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Conectado')).not.toBeInTheDocument()
  })

  it('sin ataque previo la region de resultado existe pero vacia (no reserva altura ni texto)', () => {
    pintar({ combat: controles() })

    expect(
      screen.getByRole('status', { name: 'Resultado de la última acción' }),
    ).toBeEmptyDOMElement()
  })

  it('el objetivo (unico rival, ya elegido en la arena), la Vida de ambos y «Ataque básico» estan a la vez en 1 contra 1 (mi turno)', () => {
    pintar({ battle: combatBattle(1), combat: controles() })

    // Con un unico rival, la arena lo marca como objetivo sin clic (mismo
    // criterio de siempre: nada que elegir con una sola opcion valida).
    expect(screen.getByRole('button', { name: 'Elegir a Bruno como objetivo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('meter', { name: 'Vida de Bruno' })).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Vida de Ana' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ataque básico' })).toBeInTheDocument()
  })
})

/**
 * 8a pasada (secciones 5-25 del brief): "TU EQUIPO"/"RIVAL" dejan de verse
 * sobre el piso de la arena y el VS pasa a ser SIEMPRE el mismo divisor
 * geometrico central -- sin depender del numero de combatientes. Estas
 * pruebas cubren 1v1/2v2/3v3 con la MISMA asercion estructural: el titulo de
 * cada lado sigue siendo accesible (heading real, `aria-labelledby`) pero
 * visualmente oculto (`sr-only`), el nombre real de cada heroe SI se ve, y
 * el VS aparece UNA sola vez con el modificador `--battle` fijo (nunca uno
 * distinto segun el formato).
 */
describe('BattleScreen — remaster 8a pasada: arena sin "TU EQUIPO"/"RIVAL" visibles y VS fijo', () => {
  const trio = (letter: 'A' | 'B', seatBase: number) => [
    entry(seatBase, {
      teamLabel: letter,
      seat: 0,
      displayName: letter === 'A' ? 'Ana' : 'Bruno',
      playerId: letter === 'A' ? ANA : BRUNO,
    }),
    entry(seatBase + 1, {
      teamLabel: letter,
      seat: 1,
      displayName: letter === 'A' ? 'Diego' : 'Carla',
      playerId: letter === 'A' ? 'sujeto-diego' : 'sujeto-carla',
    }),
    entry(seatBase + 2, {
      teamLabel: letter,
      seat: 2,
      displayName: letter === 'A' ? 'Elsa' : 'Fer',
      playerId: letter === 'A' ? 'sujeto-elsa' : 'sujeto-fer',
    }),
  ]

  const casos = [
    { nombre: '1v1', order: [entry(0), entry(1)] },
    {
      nombre: '2v2',
      order: [
        entry(0, { teamLabel: 'B', seat: 0, displayName: 'Bruno', playerId: BRUNO }),
        entry(1, { teamLabel: 'A', seat: 0, displayName: 'Ana', playerId: ANA }),
        entry(2, { teamLabel: 'B', seat: 1, displayName: 'Carla', playerId: 'sujeto-carla' }),
        entry(3, { teamLabel: 'A', seat: 1, displayName: 'Diego', playerId: 'sujeto-diego' }),
      ],
    },
    { nombre: '3v3', order: [...trio('A', 100), ...trio('B', 200)] },
  ] as const

  for (const { nombre, order } of casos) {
    it(`${nombre}: "Tu equipo"/"Tu héroe" y "Rival" son accesibles pero NO se ven; los nombres reales SI`, () => {
      pintar({ battle: battle(0, order) })

      const propio = screen.getByRole('heading', {
        name: order.filter((e) => e.teamLabel === 'A').length > 1 ? 'Tu equipo' : 'Tu héroe',
      })
      const rival = screen.getByRole('heading', { name: 'Rival' })

      // Siguen en el arbol de accesibilidad (aria-labelledby de cada
      // `<section>`), pero visualmente ocultos -- nunca texto flotando
      // sobre el piso de la arena.
      expect(propio).toHaveClass('sr-only')
      expect(rival).toHaveClass('sr-only')

      // El dato real (nombre de cada heroe) SI se ve: al menos un nombre por
      // bando, tomado de la propia orden de turnos de este caso.
      const primerPropio = order.find((e) => e.teamLabel === 'A')
      const primerRival = order.find((e) => e.teamLabel === 'B')
      const nombrePropio = primerPropio?.displayName ?? null
      const nombreRival = primerRival?.displayName ?? null
      expect(nombrePropio).not.toBeNull()
      expect(nombreRival).not.toBeNull()
      expect(screen.getAllByText(nombrePropio ?? '').length).toBeGreaterThan(0)
      expect(screen.getAllByText(nombreRival ?? '').length).toBeGreaterThan(0)
    })

    it(`${nombre}: el VS aparece UNA vez, con el modificador fijo de batalla (nunca otro segun el formato)`, () => {
      pintar({ battle: battle(0, order) })

      const vs = screen.getAllByText('VS')
      expect(vs).toHaveLength(1)
      expect(vs[0]).toHaveClass('br-vs-divider')
      expect(vs[0]).toHaveClass('br-vs-divider--battle')
      // Nunca el modificador de la Sala de espera (regresion de la 6a
      // pasada): esa clase es exclusiva de `BattleRoomLobbyPage`.
      expect(vs[0]).not.toHaveClass('br-vs-divider--room')
    })
  }

  it('la arena (mi lado, VS, rival) y la barra de acciones/combat log viven en bloques DOM separados (nunca uno dentro del otro)', () => {
    pintar({ battle: combatBattle(1), combat: controles() })

    const arena = screen.getByText('VS').closest('.br-arena-field')
    const acciones = screen
      .getByRole('button', { name: 'Ataque básico' })
      .closest('.br-bottom-actions')

    expect(arena).not.toBeNull()
    expect(acciones).not.toBeNull()
    // Bloques hermanos dentro de `.br-battle-stage`, nunca uno anidado en el
    // otro -- el solapamiento visual reportado (personajes vs. Action Bar)
    // se resuelve con el `padding`/`align-items` de `.br-arena-field`
    // (CSS, verificado por lectura), no con jerarquia de DOM.
    expect(arena?.contains(acciones ?? null)).toBe(false)
    expect(acciones?.contains(arena ?? null)).toBe(false)
  })
})

/**
 * 9a pasada (secciones 38-44, 75 del brief): el feedback del ultimo ataque es
 * TRANSITORIO -- aparece, se lee, desaparece solo (~3000ms,
 * `COMBAT_FEEDBACK_VISIBLE_MS`). Usa temporizadores falsos (nunca 3s reales
 * en la suite, seccion 75).
 */
describe('BattleScreen — remaster 9a pasada: feedback de ataque transitorio', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const golpeCritico = lastAttack()
  const sinEfecto = lastAttack(MISS, 44, 44)

  it('aparece al llegar el resultado y desaparece solo pasados ~3s', () => {
    vi.useFakeTimers()
    pintar({ battle: combatBattle(1), lastAttack: golpeCritico })

    const region = screen.getByRole('status', { name: 'Resultado de la última acción' })
    expect(region).toHaveTextContent('¡Golpe crítico de Bruno a Ana!')

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(region).toHaveTextContent('¡Golpe crítico de Bruno a Ana!')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(region).toBeEmptyDOMElement()
  })

  it('si llega un nuevo resultado antes de que termine, se reinicia el temporizador (nunca se acumula una cola)', () => {
    vi.useFakeTimers()
    const { rerender } = pintar({ battle: combatBattle(1), lastAttack: golpeCritico })

    const region = screen.getByRole('status', { name: 'Resultado de la última acción' })
    expect(region).toHaveTextContent('¡Golpe crítico de Bruno a Ana!')

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    rerender(
      <BattleScreen
        battle={combatBattle(1)}
        subject={ANA}
        connection="open"
        synced
        lastAttack={sinEfecto}
      />,
    )

    // El nuevo resultado reemplaza al anterior de inmediato (nunca un
    // historial/cola de dos mensajes a la vez).
    expect(region).toHaveTextContent('Bruno atacó a Ana, pero no superó su Defensa')
    expect(region).not.toHaveTextContent('¡Golpe crítico de Bruno a Ana!')

    // Con el temporizador reiniciado, a los 2999ms de ESTE segundo evento
    // (aunque ya pasaron 2000+1500=3500ms desde el primer montaje) el
    // mensaje sigue visible -- prueba de que se reinicio, no se acumulo.
    act(() => {
      vi.advanceTimersByTime(1999)
    })
    expect(region).toHaveTextContent('Bruno atacó a Ana, pero no superó su Defensa')

    act(() => {
      vi.advanceTimersByTime(1001)
    })
    expect(region).toBeEmptyDOMElement()
  })
})
