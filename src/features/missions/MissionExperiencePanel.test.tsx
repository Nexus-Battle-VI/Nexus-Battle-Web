import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'

import { MissionExperiencePanel } from './MissionExperiencePanel'
import { lineOf } from './fixtures'
import type { MissionExperience } from './missionReport'

/**
 * Panel de experiencia de una mision (HU-09, Task HU-09.5).
 *
 * Es PRESENTACIONAL: recibe el bloque ya resuelto y las lineas del informe. Lo que
 * se comprueba es que no inventa nada -- ni un nivel, ni un cero que parezca un
 * fallo -- y que las tres situaciones se distinguen a texto.
 */
const experienceOf = (overrides: Partial<MissionExperience> = {}): MissionExperience => ({
  defeats: 3,
  totalXp: 0,
  credited: 0,
  pending: 3,
  failed: 0,
  level: null,
  currentXp: null,
  maxLevel: null,
  levelsGained: 0,
  leveledUp: false,
  ...overrides,
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MissionExperiencePanel — las tres situaciones', () => {
  it('sin acreditar todavia: dice que la experiencia va en camino y no ensena XP', () => {
    renderWithProviders(
      <MissionExperiencePanel
        experience={experienceOf()}
        lines={[lineOf(), lineOf({ reference: 'sombra-corrompida#2' })]}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Experiencia' })).toBeInTheDocument()
    expect(screen.getByText('Todavía no hay experiencia acreditada.')).toBeInTheDocument()
    expect(screen.getByText('Experiencia en camino')).toBeInTheDocument()
    // Un "+0 XP" se leeria como una mision que no dio nada.
    expect(screen.queryByText('+0 XP')).not.toBeInTheDocument()
    expect(screen.queryByText('Experiencia acreditada')).not.toBeInTheDocument()
  })

  it('acreditada: ensena la XP acreditada, el nivel y la subida', () => {
    renderWithProviders(
      <MissionExperiencePanel
        experience={experienceOf({
          totalXp: 54,
          credited: 3,
          pending: 0,
          level: 3,
          currentXp: 657,
          maxLevel: 8,
          levelsGained: 1,
          leveledUp: true,
        })}
        lines={[lineOf({ status: 'CREDITED', quantity: 12 })]}
      />,
    )

    expect(screen.getByText('+54 XP')).toBeInTheDocument()
    expect(screen.getByText('Experiencia acreditada')).toBeInTheDocument()
    expect(screen.getByText('+54 XP para tu héroe.')).toBeInTheDocument()
    expect(screen.getByText('Nivel 3')).toBeInTheDocument()
    expect(screen.getByText('657 XP acumulada')).toBeInTheDocument()
    expect(screen.getByText('¡Has subido de nivel!')).toBeInTheDocument()
  })

  it('con derrotas sin acreditar: lo dice primero, sin dar la experiencia por entregada', () => {
    renderWithProviders(
      <MissionExperiencePanel
        experience={experienceOf({ totalXp: 12, credited: 1, pending: 1, failed: 1, level: 2 })}
        lines={[
          lineOf({ status: 'CREDITED', quantity: 12 }),
          lineOf({ reference: 'guardian-eterno#1', status: 'FAILED' }),
        ]}
      />,
    )

    expect(screen.getByText('Parte de la experiencia no se acreditó')).toBeInTheDocument()
    expect(
      screen.getByText('1 derrota sin acreditar de 3 derrotas. El resto sigue en curso.'),
    ).toBeInTheDocument()
  })
})

describe('MissionExperiencePanel — lo que no se inventa', () => {
  it('sin bloque de experiencia lo dice, en lugar de mostrar ceros', () => {
    renderWithProviders(<MissionExperiencePanel experience={null} lines={[]} />)

    expect(
      screen.getByText('Este informe no incluye el resumen de experiencia.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Todavía no hay experiencia acreditada.')).not.toBeInTheDocument()
  })

  it('una mision sin derrotas lo dice: no es un fallo ni una experiencia perdida', () => {
    renderWithProviders(
      <MissionExperiencePanel experience={experienceOf({ defeats: 0, pending: 0 })} lines={[]} />,
    )

    expect(
      screen.getByText('Esta misión no registró derrotas: no hay experiencia que acreditar.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Todavía no hay experiencia acreditada.')).not.toBeInTheDocument()
  })

  it('sin ninguna acreditacion no hay nivel ni subida que ensenar', () => {
    renderWithProviders(<MissionExperiencePanel experience={experienceOf()} lines={[]} />)

    expect(screen.queryByText(/^Nivel/u)).not.toBeInTheDocument()
    expect(screen.queryByText(/Has subido/u)).not.toBeInTheDocument()
  })

  it('en el nivel tope lo dice, y no anuncia una subida que no hubo', () => {
    renderWithProviders(
      <MissionExperiencePanel
        experience={experienceOf({
          totalXp: 12,
          credited: 1,
          pending: 0,
          level: 8,
          currentXp: 900,
          maxLevel: 8,
        })}
        lines={[lineOf({ status: 'CREDITED', quantity: 12 })]}
      />,
    )

    expect(screen.getByText('Nivel 8 · máximo')).toBeInTheDocument()
    expect(screen.queryByText(/Has subido/u)).not.toBeInTheDocument()
  })
})

describe('MissionExperiencePanel — detalle por derrota', () => {
  it('lista cada derrota con su XP solo cuando esta acreditada y su estado en texto', () => {
    renderWithProviders(
      <MissionExperiencePanel
        experience={experienceOf({ totalXp: 12, credited: 1, pending: 1, level: 2 })}
        lines={[
          lineOf({ status: 'CREDITED', quantity: 12 }),
          lineOf({ reference: 'guardian-eterno#1', name: 'El Guardián Eterno' }),
        ]}
      />,
    )

    expect(screen.getByText('Detalle por derrota')).toBeInTheDocument()
    expect(screen.getByText('Sombra Corrompida')).toBeInTheDocument()
    expect(screen.getByText('El Guardián Eterno')).toBeInTheDocument()
    // La XP de la acreditada: la del total arriba y la de su linea.
    expect(screen.getAllByText('+12 XP')).toHaveLength(2)
    expect(screen.getByText('Acreditada')).toBeInTheDocument()
    // La pendiente NO ensena una XP que todavia no tiene.
    expect(screen.getByText('En curso')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(1)
  })

  it('sin lineas no hay desplegable: el resumen sigue siendo suficiente', () => {
    renderWithProviders(<MissionExperiencePanel experience={experienceOf()} lines={[]} />)

    expect(screen.queryByText('Detalle por derrota')).not.toBeInTheDocument()
  })
})
