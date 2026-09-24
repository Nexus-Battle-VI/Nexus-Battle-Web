import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  ALL_IN,
  combatBattle,
  recharging,
  SHIELD_STRIKE,
  skillBattle,
  STONE_HAND,
  withSkills,
} from './fixtures'
import { initialSkillIntentState, type SkillIntentState } from './skillIntent'
import { SkillList, type SkillListProps } from './SkillList'

const ANA_ID = 'sujeto-ana'
const BRUNO_TARGET = { teamLabel: 'B', seat: 0 }

const props = (overrides: Partial<SkillListProps> = {}): SkillListProps => ({
  battle: skillBattle(1),
  subject: ANA_ID,
  connection: 'open',
  synced: true,
  pending: false,
  target: BRUNO_TARGET,
  skill: initialSkillIntentState,
  onUse: vi.fn(),
  onRetry: vi.fn(),
  onDismissRejection: vi.fn(),
  ...overrides,
})

const pintar = (overrides: Partial<SkillListProps> = {}): SkillListProps => {
  const value = props(overrides)

  render(<SkillList {...value} />)

  return value
}

const usar = (name: string): HTMLElement => screen.getByRole('button', { name })

const skillsOf = (...skills: (typeof SHIELD_STRIKE)[]) =>
  withSkills(combatBattle(1), [
    { power: [10, 10], skills: [] },
    { power: [10, 10], skills },
  ])

describe('SkillList — habilidades del heroe (HU-19)', () => {
  it('lista cada habilidad con su costo y su estado en TEXTO, en el orden que Combat publica', () => {
    pintar()

    const items = screen.getAllByRole('listitem')

    expect(screen.getByRole('heading', { name: 'Habilidades' })).toBeInTheDocument()
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByText('Golpe con escudo')).toBeInTheDocument()
    expect(within(items[0]!).getByText('2 de Poder')).toBeInTheDocument()
    expect(within(items[0]!).getByText(/Disponible · 1 turno de recarga/u)).toBeInTheDocument()
    expect(within(items[1]!).getByText('Mano de piedra')).toBeInTheDocument()
    expect(within(items[1]!).getByText('4 de Poder')).toBeInTheDocument()
    expect(
      within(items[1]!).getAllByText(/todavía no está disponible en combate/u).length,
    ).toBeGreaterThan(0)
  })

  it('un costo de todo el Poder se dice con palabras', () => {
    pintar({ battle: skillsOf(ALL_IN) })

    expect(screen.getByText('Todo el Poder')).toBeInTheDocument()
  })

  it('una habilidad disponible y con objetivo se envia con abilityId y objetivo, y nada mas', async () => {
    const value = pintar()

    await userEvent.click(usar('Usar Golpe con escudo'))

    expect(value.onUse).toHaveBeenCalledTimes(1)
    expect(value.onUse).toHaveBeenCalledWith(SHIELD_STRIKE.abilityId, { teamLabel: 'B', seat: 0 })
  })

  it('el objetivo enviado es una COPIA de (teamLabel, seat): nada mas del objetivo viaja', async () => {
    const value = pintar({ target: { ...BRUNO_TARGET, displayName: 'Bruno' } as never })

    await userEvent.click(usar('Usar Golpe con escudo'))

    expect(value.onUse).toHaveBeenCalledWith(SHIELD_STRIKE.abilityId, { teamLabel: 'B', seat: 0 })
  })

  it('en recarga: deshabilitada, con los turnos que faltan como texto, y el clic no envia nada', async () => {
    const value = pintar({ battle: skillsOf(recharging(SHIELD_STRIKE, 2)) })

    expect(usar('Usar Golpe con escudo')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getAllByText(/Disponible en 2 turnos/u).length).toBeGreaterThan(0)

    await userEvent.click(usar('Usar Golpe con escudo'))

    expect(value.onUse).not.toHaveBeenCalled()
  })

  it('no soportada: deshabilitada, explicada como aun no disponible en combate, y el clic no envia nada', async () => {
    const value = pintar({ battle: skillsOf(STONE_HAND) })

    expect(usar('Usar Mano de piedra')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getAllByText(/todavía no está disponible en combate/u)[0]!).toBeInTheDocument()

    await userEvent.click(usar('Usar Mano de piedra'))

    expect(value.onUse).not.toHaveBeenCalled()
  })

  it('sin objetivo: deshabilitada y pide elegir uno', async () => {
    const value = pintar({ target: null })

    expect(usar('Usar Golpe con escudo')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getAllByText('Elige un objetivo.').length).toBeGreaterThan(0)

    await userEvent.click(usar('Usar Golpe con escudo'))

    expect(value.onUse).not.toHaveBeenCalled()
  })

  it('sin conexion lista: deshabilitada', async () => {
    const value = pintar({ connection: 'reconnecting' })

    expect(usar('Usar Golpe con escudo')).toHaveAttribute('aria-disabled', 'true')

    await userEvent.click(usar('Usar Golpe con escudo'))

    expect(value.onUse).not.toHaveBeenCalled()
  })

  it('con una accion pendiente: TODAS deshabilitadas y la enviada dice «Usando…» con aria-busy', async () => {
    const skill: SkillIntentState = {
      intent: { commandId: 'cmd-1', abilityId: SHIELD_STRIKE.abilityId, target: BRUNO_TARGET },
      unconfirmed: false,
      rejection: null,
    }
    const value = pintar({ pending: true, skill })

    expect(usar('Usando…')).toHaveAttribute('aria-busy', 'true')
    expect(usar('Usando…')).toHaveAttribute('aria-disabled', 'true')
    expect(usar('Usar Mano de piedra')).toHaveAttribute('aria-disabled', 'true')

    await userEvent.click(usar('Usando…'))
    await userEvent.click(usar('Usar Mano de piedra'))

    expect(value.onUse).not.toHaveBeenCalled()
    expect(screen.getAllByText('Esperando el resultado de tu acción…').length).toBeGreaterThan(0)
  })

  it('el Poder NO deshabilita: con 0 de Poder la habilidad sigue disponible (Combat la degradara a ataque basico)', async () => {
    const battle = withSkills(combatBattle(1), [
      { power: [10, 10], skills: [] },
      { power: [0, 10], skills: [SHIELD_STRIKE] },
    ])
    const value = pintar({ battle })

    expect(usar('Usar Golpe con escudo')).toHaveAttribute('aria-disabled', 'false')

    await userEvent.click(usar('Usar Golpe con escudo'))

    expect(value.onUse).toHaveBeenCalledTimes(1)
  })

  it('explica siempre, con texto fijo, que sin Poder suficiente se usa un ataque basico', () => {
    pintar()

    expect(
      screen.getByText(/Si tu Poder no alcanza, se usa un ataque básico en su lugar/u),
    ).toBeInTheDocument()
  })

  it('accesibilidad: aria-disabled (NO disabled) mantiene el foco, y la razon esta enlazada con aria-describedby', () => {
    pintar({ target: null })

    const button = usar('Usar Golpe con escudo')
    const ids = (button.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)

    expect(button).not.toBeDisabled()
    expect(ids.length).toBeGreaterThanOrEqual(2)

    for (const id of ids) {
      expect(document.getElementById(id)).not.toBeNull()
    }

    expect(ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ')).toContain(
      'Elige un objetivo.',
    )
  })

  it('un nombre con HTML se pinta como TEXTO, nunca como marcado', () => {
    const hostile = { ...SHIELD_STRIKE, name: '<img src=x onerror=alert(1)>' }

    const { container } = render(<SkillList {...props({ battle: skillsOf(hostile) })} />)

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
  })

  it('un heroe sin habilidades no pinta nada', () => {
    const { container } = render(
      <SkillList
        {...props({
          battle: withSkills(combatBattle(1), [
            { power: [10, 10], skills: [SHIELD_STRIKE] },
            { power: [10, 10], skills: [] },
          ]),
        })}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('una batalla anterior a HU-19 (sin estado de habilidades) no pinta nada', () => {
    const { container } = render(<SkillList {...props({ battle: combatBattle(1) })} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('quien no participa no ve habilidades', () => {
    const { container } = render(<SkillList {...props({ subject: 'sujeto-otro' })} />)

    expect(container).toBeEmptyDOMElement()
  })

  describe('avisos', () => {
    it('sin confirmar: alerta con «Reintentar habilidad» que reenvia SIN crear otra accion', async () => {
      const skill: SkillIntentState = {
        intent: { commandId: 'cmd-1', abilityId: SHIELD_STRIKE.abilityId, target: BRUNO_TARGET },
        unconfirmed: true,
        rejection: null,
      }
      const value = pintar({ skill, pending: true })

      expect(screen.getByRole('alert')).toHaveTextContent(/No se pudo confirmar tu habilidad/u)

      await userEvent.click(screen.getByRole('button', { name: 'Reintentar habilidad' }))

      expect(value.onRetry).toHaveBeenCalledTimes(1)
      expect(value.onUse).not.toHaveBeenCalled()
    })

    it('sin confirmar y sin conexion: «Reintentar habilidad» no envia', async () => {
      const skill: SkillIntentState = {
        intent: { commandId: 'cmd-1', abilityId: SHIELD_STRIKE.abilityId, target: BRUNO_TARGET },
        unconfirmed: true,
        rejection: null,
      }
      const value = pintar({ skill, pending: true, connection: 'reconnecting' })
      const retry = screen.getByRole('button', { name: 'Reintentar habilidad' })

      expect(retry).toHaveAttribute('aria-disabled', 'true')

      await userEvent.click(retry)

      expect(value.onRetry).not.toHaveBeenCalled()
    })

    it('un rechazo se anuncia con role=alert, con texto propio por codigo, y «Entendido» lo cierra', async () => {
      const value = pintar({
        skill: { intent: null, unconfirmed: false, rejection: 'SKILL_ON_COOLDOWN' },
      })

      expect(screen.getByRole('alert')).toHaveTextContent('Esa habilidad sigue en recarga')

      await userEvent.click(screen.getByRole('button', { name: 'Entendido' }))

      expect(value.onDismissRejection).toHaveBeenCalledTimes(1)
    })

    it('un codigo de rechazo desconocido nunca muestra el texto recibido', () => {
      pintar({ skill: { intent: null, unconfirmed: false, rejection: 'RAW <b>boom</b>' } })

      expect(screen.getByRole('alert')).toHaveTextContent(
        'No fue posible usar la habilidad. Inténtalo de nuevo.',
      )
      expect(screen.getByRole('alert')).not.toHaveTextContent('boom')
    })

    it('sin duda ni rechazo no hay alertas', () => {
      pintar()

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
