import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BattleScreen, type BattleScreenProps } from './BattleScreen'
import { battle, entry } from './fixtures'

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
    expect(screen.getByRole('heading', { name: 'Tu equipo' })).toBeInTheDocument()
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

    // Una vez en la tarjeta del combatiente y otra en la cola.
    expect(screen.getAllByText('Turno actual')).toHaveLength(2)
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

    expect(filas[0]).toHaveTextContent('1.')
    expect(filas[0]).toHaveTextContent('Bruno')
    expect(filas[0]).toHaveTextContent('Equipo B')
    expect(filas[1]).toHaveTextContent('2.')
    expect(filas[1]).toHaveTextContent('Ana (tú)')
    expect(filas[1]).toHaveTextContent('Equipo A')
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
    expect(screen.getAllByText('Turno actual')).toHaveLength(2)
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
