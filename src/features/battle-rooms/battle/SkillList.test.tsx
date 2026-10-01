import { readFileSync } from 'node:fs'
import path from 'node:path'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  ALL_IN,
  combatBattle,
  entry,
  REANIMATE,
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
    // Hotfix post-despliegue: nombre y costo de Poder SI son visibles (la
    // card nunca cambia); el estado/recarga sigue existiendo como texto,
    // pero solo para lectores de pantalla -- nunca anade altura a la card.
    expect(within(items[0]!).getByText(/Disponible · 1 turno de recarga/u)).toHaveClass('sr-only')
    expect(within(items[1]!).getByText('Mano de piedra')).toBeInTheDocument()
    expect(within(items[1]!).getByText('4 de Poder')).toBeInTheDocument()
    for (const aviso of within(items[1]!).getAllByText(/todavía no está disponible en combate/u)) {
      expect(aviso).toHaveClass('sr-only')
    }
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

  it('en recarga: deshabilitada, con los turnos que faltan como texto sr-only (nunca visible), y el clic no envia nada', async () => {
    const value = pintar({ battle: skillsOf(recharging(SHIELD_STRIKE, 2)) })

    expect(usar('Usar Golpe con escudo')).toHaveAttribute('aria-disabled', 'true')
    // Hotfix post-despliegue (causa raiz del layout shift de la Action Bar
    // en produccion): este texto solia quedar VISIBLE dentro del MISMO
    // flex-item que `.br-action-bar` estira (`align-items: stretch`) --
    // una card RECHARGING mas alta forzaba a Ataque basico y a las demas
    // habilidades a estirarse con ella. Ahora es SIEMPRE sr-only.
    const avisos = screen.getAllByText(/Disponible en 2 turnos/u)
    expect(avisos.length).toBeGreaterThan(0)
    for (const aviso of avisos) {
      expect(aviso).toHaveClass('sr-only')
    }

    await userEvent.click(usar('Usar Golpe con escudo'))

    expect(value.onUse).not.toHaveBeenCalled()
  })

  it('no soportada: deshabilitada, explicada como aun no disponible en combate SOLO para lectores de pantalla, y el clic no envia nada', async () => {
    const value = pintar({ battle: skillsOf(STONE_HAND) })

    expect(usar('Usar Mano de piedra')).toHaveAttribute('aria-disabled', 'true')
    const avisos = screen.getAllByText(/todavía no está disponible en combate/u)
    expect(avisos.length).toBeGreaterThan(0)
    for (const aviso of avisos) {
      expect(aviso).toHaveClass('sr-only')
    }

    await userEvent.click(usar('Usar Mano de piedra'))

    expect(value.onUse).not.toHaveBeenCalled()
  })

  it('sin objetivo: deshabilitada y pide elegir uno, sin texto visible que cambie la geometria', async () => {
    const value = pintar({ target: null })

    expect(usar('Usar Golpe con escudo')).toHaveAttribute('aria-disabled', 'true')
    const avisos = screen.getAllByText('Elige un objetivo.')
    expect(avisos.length).toBeGreaterThan(0)
    for (const aviso of avisos) {
      expect(aviso).toHaveClass('sr-only')
    }

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
    // 9a pasada (secciones 33-36 del brief): antes este texto se repetia
    // VISIBLE debajo de CADA habilidad a la vez (aqui, dos) -- sigue
    // existiendo para lectores de pantalla (`aria-describedby`), pero
    // ninguna instancia queda visible.
    const avisos = screen.getAllByText('Esperando el resultado de tu acción…')
    expect(avisos.length).toBeGreaterThan(0)
    for (const aviso of avisos) {
      expect(aviso).toHaveClass('sr-only')
    }
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

    // Ningun `<img>` real proviene del NOMBRE de la habilidad (el unico `<img>`
    // legitimo es el icono decorativo de PixelLab del titulo "Habilidades",
    // ajeno al dato hostil): ninguno tiene el `src` inyectado ni carece de
    // `alt=""`/`aria-hidden` (marca de decorativo real, no de marcado inyectado).
    for (const img of container.querySelectorAll('img')) {
      expect(img.getAttribute('src')).not.toBe('x')
      expect(img).toHaveAttribute('aria-hidden', 'true')
    }
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

/**
 * Hotfix post-despliegue (geometria de la Action Bar): Richard jugo una
 * batalla real tras el merge de PR #182 y encontro que habilidades no
 * disponibles ("Disponible en 1 turno", "1 turno de recarga"...) pintaban
 * texto VISIBLE debajo de su card. Esa card vive dentro de `.br-action-bar`
 * (`align-items: stretch`): una card mas alta estiraba TODAS las demas
 * (Ataque basico incluido), descuadrando la barra completa. La causa real
 * eran dos parrafos en `SkillRow` (`stateId`/`hintId`) que solo se ocultaban
 * (`sr-only`) en algunos estados, no en todos. Estas pruebas verifican,
 * para CADA estado real que Combat puede publicar, que: (1) nombre y costo
 * de Poder SIGUEN visibles -- la card no cambia; (2) NINGUN texto auxiliar
 * de disponibilidad/cooldown queda visible; (3) el bloqueo funcional real
 * (`aria-disabled`, el callback) sigue intacto. No miden pixeles (jsdom no
 * calcula layout) -- la garantia geometrica real es que estos nodos sean
 * `sr-only` siempre, sin excepcion.
 */
describe('SkillList -- Action Bar con geometria estable sin importar el estado de la habilidad (hotfix post-despliegue)', () => {
  /** Todo <p> de SkillRow que podria llevar texto auxiliar de disponibilidad. */
  const auxiliaryParagraphsOf = (item: HTMLElement): readonly HTMLElement[] =>
    within(item)
      .getAllByText(/./u)
      .filter((node) => node.tagName === 'P')

  it('AVAILABLE (lista para usarse): nombre y costo visibles, sin texto auxiliar visible', () => {
    pintar({ battle: skillsOf(SHIELD_STRIKE) })

    const item = screen.getByRole('listitem')

    expect(within(item).getByText('Golpe con escudo')).toBeInTheDocument()
    expect(within(item).getByText('2 de Poder')).toBeInTheDocument()
    for (const paragraph of auxiliaryParagraphsOf(item)) {
      expect(paragraph).toHaveClass('sr-only')
    }
  })

  it('COOLDOWN (recarga): misma card, sin texto auxiliar visible, aria-disabled real', () => {
    pintar({ battle: skillsOf(recharging(SHIELD_STRIKE, 3)) })

    const item = screen.getByRole('listitem')

    expect(within(item).getByText('Golpe con escudo')).toBeInTheDocument()
    expect(within(item).getByText('2 de Poder')).toBeInTheDocument()
    expect(usar('Usar Golpe con escudo')).toHaveAttribute('aria-disabled', 'true')
    for (const paragraph of auxiliaryParagraphsOf(item)) {
      expect(paragraph).toHaveClass('sr-only')
    }
  })

  it('TEMPORARILY UNAVAILABLE (UNSUPPORTED): misma card, sin texto auxiliar visible, aria-disabled real', () => {
    pintar({ battle: skillsOf(STONE_HAND) })

    const item = screen.getByRole('listitem')

    expect(within(item).getByText('Mano de piedra')).toBeInTheDocument()
    expect(usar('Usar Mano de piedra')).toHaveAttribute('aria-disabled', 'true')
    for (const paragraph of auxiliaryParagraphsOf(item)) {
      expect(paragraph).toHaveClass('sr-only')
    }
  })

  it('INVALID TARGET (sin objetivo elegido): misma card, sin texto auxiliar visible, aria-disabled real', () => {
    pintar({ battle: skillsOf(SHIELD_STRIKE), target: null })

    const item = screen.getByRole('listitem')

    expect(within(item).getByText('Golpe con escudo')).toBeInTheDocument()
    expect(usar('Usar Golpe con escudo')).toHaveAttribute('aria-disabled', 'true')
    for (const paragraph of auxiliaryParagraphsOf(item)) {
      expect(paragraph).toHaveClass('sr-only')
    }
  })

  it('vuelve a estar disponible (RECHARGING -> READY): el texto auxiliar sigue sr-only y el callback vuelve a ejecutarse', async () => {
    const value = pintar({ battle: skillsOf(SHIELD_STRIKE) })

    const item = screen.getByRole('listitem')

    for (const paragraph of auxiliaryParagraphsOf(item)) {
      expect(paragraph).toHaveClass('sr-only')
    }

    await userEvent.click(usar('Usar Golpe con escudo'))

    expect(value.onUse).toHaveBeenCalledTimes(1)
  })

  it('INSUFFICIENT POWER no deshabilita la habilidad (HU-11, Combat degrada a ataque basico): no es un estado "disabled" real', () => {
    pintar({
      battle: withSkills(combatBattle(1), [
        { power: [10, 10], skills: [] },
        { power: [0, 10], skills: [SHIELD_STRIKE] },
      ]),
    })

    expect(usar('Usar Golpe con escudo')).toHaveAttribute('aria-disabled', 'false')
  })

  it('Action Bar con multiples habilidades en distintos estados: ninguna agrega texto auxiliar visible', () => {
    pintar({ battle: skillsOf(SHIELD_STRIKE, recharging(STONE_HAND, 1)) })

    for (const item of screen.getAllByRole('listitem')) {
      for (const paragraph of auxiliaryParagraphsOf(item)) {
        expect(paragraph).toHaveClass('sr-only')
      }
    }
  })
})

/**
 * Pasada final (secciones 23, 32-38, 53, 63-64 del brief): con MAS DE UN
 * companero elegible, pulsar una habilidad ally-target (`targetAudience:
 * 'ALLY'`, excepcion de curacion de HU-12) ya NO envia nada de inmediato --
 * abre un popover fuera de la barra de acciones; elegir ahi envia la
 * intencion real y lo cierra; Cancelar lo cierra sin enviar nada. Antes de
 * esta pasada NO habia ninguna prueba que cubriera este flujo con mas de un
 * companero (el bug del radiogroup permanente, que desestabilizaba la barra
 * con 4 acciones, no tenia ningun test que lo hubiera detectado).
 */
describe('SkillList -- popover de companero para habilidades ally-target (HU-12, pasada final)', () => {
  const MEDICO = 'sujeto-medico'

  const alliesOrder = [
    entry(0, {
      teamLabel: 'A',
      seat: 0,
      playerId: MEDICO,
      displayName: 'Medico',
      heroSubtype: 'MEDICO',
    }),
    entry(1, {
      teamLabel: 'A',
      seat: 1,
      playerId: 'sujeto-diego',
      displayName: 'Diego',
      heroSubtype: 'GUERRERO_ARMAS',
    }),
    entry(2, {
      teamLabel: 'A',
      seat: 2,
      playerId: 'sujeto-fer',
      displayName: 'Fer',
      heroSubtype: 'CHAMAN',
    }),
    entry(3, {
      teamLabel: 'B',
      seat: 0,
      playerId: 'sujeto-bruno',
      displayName: 'Bruno',
      heroSubtype: 'GUERRERO_TANQUE',
    }),
  ]

  const healBattle = () =>
    withSkills(
      combatBattle(
        0,
        [
          [10, 10],
          [10, 10],
          [10, 10],
          [10, 10],
        ],
        alliesOrder,
      ),
      [
        { power: [10, 10], skills: [REANIMATE] },
        { power: [10, 10], skills: [] },
        { power: [10, 10], skills: [] },
        { power: [10, 10], skills: [] },
      ],
    )

  const pintarConAliados = (overrides: Partial<SkillListProps> = {}) =>
    pintar({ battle: healBattle(), subject: MEDICO, target: null, ...overrides })

  it('con mas de un companero: el boton esta habilitado pero pulsarlo NO envia nada de inmediato -- abre el popover', async () => {
    const value = pintarConAliados()

    const boton = usar('Usar Reanimación')
    expect(boton).toHaveAttribute('aria-disabled', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(boton)

    expect(value.onUse).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Diego/u })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Fer/u })).toBeInTheDocument()
    // El propio Medico (quien usa la habilidad) nunca es una opcion.
    expect(screen.queryByRole('button', { name: /^Medico/u })).not.toBeInTheDocument()
  })

  it('el popover vive FUERA de la lista de habilidades (nunca dentro del <ul> que estira la barra de acciones)', async () => {
    const { container } = render(
      <SkillList
        {...props({
          battle: healBattle(),
          subject: MEDICO,
          target: null,
        })}
      />,
    )

    await userEvent.click(usar('Usar Reanimación'))

    const dialog = screen.getByRole('dialog')
    const list = container.querySelector('ul')

    expect(list).not.toBeNull()
    expect(list?.contains(dialog)).toBe(false)
  })

  it('elegir un companero en el popover envia la intencion real y lo cierra', async () => {
    const value = pintarConAliados()

    await userEvent.click(usar('Usar Reanimación'))
    await userEvent.click(screen.getByRole('button', { name: /^Diego/u }))

    expect(value.onUse).toHaveBeenCalledTimes(1)
    expect(value.onUse).toHaveBeenCalledWith('hab-reanimacion', { teamLabel: 'A', seat: 1 })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Cancelar cierra el popover SIN enviar ninguna intencion', async () => {
    const value = pintarConAliados()

    await userEvent.click(usar('Usar Reanimación'))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(value.onUse).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('con UN solo companero (o ninguno) no hay popover: se comporta como el objetivo del ataque basico', async () => {
    const soloUnAliado = [
      entry(0, {
        teamLabel: 'A',
        seat: 0,
        playerId: MEDICO,
        displayName: 'Medico',
        heroSubtype: 'MEDICO',
      }),
      entry(1, {
        teamLabel: 'A',
        seat: 1,
        playerId: 'sujeto-diego',
        displayName: 'Diego',
        heroSubtype: 'GUERRERO_ARMAS',
      }),
      entry(2, {
        teamLabel: 'B',
        seat: 0,
        playerId: 'sujeto-bruno',
        displayName: 'Bruno',
        heroSubtype: 'GUERRERO_TANQUE',
      }),
    ]
    const value = pintarConAliados({
      battle: withSkills(
        combatBattle(
          0,
          [
            [10, 10],
            [10, 10],
            [10, 10],
          ],
          soloUnAliado,
        ),
        [
          { power: [10, 10], skills: [REANIMATE] },
          { power: [10, 10], skills: [] },
          { power: [10, 10], skills: [] },
        ],
      ),
    })

    await userEvent.click(usar('Usar Reanimación'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(value.onUse).toHaveBeenCalledWith('hab-reanimacion', { teamLabel: 'A', seat: 1 })
  })
})

describe('battle-rooms.css -- el popover de companero nunca puede estirar la barra de acciones', () => {
  it('.br-ally-target-overlay usa position: fixed (fuera del flujo, jamas participa del alto de .br-action-bar)', () => {
    const css = readFileSync(path.join(__dirname, '..', 'battle-rooms.css'), 'utf-8')
    const start = css.indexOf('.br-ally-target-overlay {')
    const end = css.indexOf('}', start)

    expect(start).toBeGreaterThan(-1)
    expect(css.slice(start, end)).toContain('position: fixed')
  })
})
