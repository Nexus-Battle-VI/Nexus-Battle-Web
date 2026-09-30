import { readFileSync } from 'node:fs'
import path from 'node:path'

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ArenaSide } from './BattleArena'
import { entry } from './fixtures'

/**
 * 10a pasada (secciones 3-9, 26-29, 47, 58, 71 del brief): "SE MUEVE EL
 * INDICADOR DEL TURNO, NO LA FORMACION". Estas pruebas NO miden pixeles (eso
 * lo hace Richard en el navegador) -- verifican, de forma estructural, que
 * ninguna clase/atributo que decide la POSICION de un combatiente (ancho del
 * heroe, columnas del grid, orden en el DOM, tope de ancho del lado) cambia
 * cuando `currentTurn`/`isTargetSelected` cambian. Solo la decoracion
 * (`br-combatant--active`, `data-selected`) puede moverse de un heroe a otro.
 */

const THREE_A_SIDE = [
  entry(1, { seat: 0, displayName: 'Guerrero Armas', teamLabel: 'A' }),
  entry(3, { seat: 1, displayName: 'Guerrero Tanque', teamLabel: 'A' }),
  entry(5, { seat: 2, displayName: 'Chaman', teamLabel: 'A' }),
]

/** Todo lo que decide POSICION de un `<li>`, sin lo que es pura decoracion de turno/target. */
const formationClassesOf = (li: Element): string =>
  (li.getAttribute('class') ?? '')
    .split(' ')
    .filter((token) => token !== 'br-combatant--active')
    .sort()
    .join(' ')

describe('ArenaSide/BattleArena -- formacion inmutable ante cambios de currentTurn (10a pasada)', () => {
  it('el <ul> del lado conserva el mismo data-side-size y las mismas clases de ancho/columnas sin importar quien tiene el turno', () => {
    const renderWithActive = (activePosition: number) =>
      render(
        <ArenaSide
          title="Equipo A"
          entries={THREE_A_SIDE}
          isSelf={() => false}
          isCurrent={(e) => e.position === activePosition}
        />,
      )

    const first = renderWithActive(1)
    const ulFirst = first.container.querySelector('ul')
    if (ulFirst === null) {
      throw new Error('La formacion de prueba debe pintar un <ul>.')
    }
    const classesFirst = ulFirst.getAttribute('class')
    const dataSideSizeFirst = ulFirst.getAttribute('data-side-size')
    first.unmount()

    const second = renderWithActive(3)
    const ulSecond = second.container.querySelector('ul')
    if (ulSecond === null) {
      throw new Error('La formacion de prueba debe pintar un <ul>.')
    }

    expect(ulSecond.getAttribute('class')).toBe(classesFirst)
    expect(ulSecond.getAttribute('data-side-size')).toBe(dataSideSizeFirst)
    expect(dataSideSizeFirst).toBe('3')
  })

  it('cada <li> mantiene sus clases de formacion, y el orden en el DOM, sin importar quien tiene el turno', () => {
    const renderWithActive = (activePosition: number) =>
      render(
        <ArenaSide
          title="Equipo A"
          entries={THREE_A_SIDE}
          isSelf={() => false}
          isCurrent={(e) => e.position === activePosition}
        />,
      )

    const first = renderWithActive(1)
    const lisFirst = screen.getAllByRole('listitem')
    const namesFirst = lisFirst.map((li) =>
      within(li).getByText(/./u, { selector: 'span.truncate' }),
    )
    const orderFirst = namesFirst.map((span) => span.textContent)
    const formationFirst = lisFirst.map(formationClassesOf)
    first.unmount()

    renderWithActive(5)
    const lisSecond = screen.getAllByRole('listitem')
    const namesSecond = lisSecond.map((li) =>
      within(li).getByText(/./u, { selector: 'span.truncate' }),
    )
    const orderSecond = namesSecond.map((span) => span.textContent)
    const formationSecond = lisSecond.map(formationClassesOf)

    expect(orderSecond).toEqual(orderFirst)
    expect(formationSecond).toEqual(formationFirst)
  })

  it('SOLO el combatiente activo trae br-combatant--active; cambiar el turno mueve la decoracion, no la lista', () => {
    render(
      <ArenaSide
        title="Equipo A"
        entries={THREE_A_SIDE}
        isSelf={() => false}
        isCurrent={(e) => e.position === 3}
      />,
    )

    const lis = screen.getAllByRole('listitem')
    const activeFlags = lis.map((li) => li.classList.contains('br-combatant--active'))

    expect(activeFlags).toEqual([false, true, false])
  })

  it('el target seleccionado decora con data-selected, sin alterar las clases de formacion del <li>', () => {
    const withoutSelection = render(
      <ArenaSide
        title="Equipo A"
        entries={THREE_A_SIDE}
        isSelf={() => false}
        isCurrent={() => false}
        isTargetable={() => true}
        isTargetSelected={() => false}
      />,
    )
    const formationWithout = screen.getAllByRole('listitem').map(formationClassesOf)
    withoutSelection.unmount()

    render(
      <ArenaSide
        title="Equipo A"
        entries={THREE_A_SIDE}
        isSelf={() => false}
        isCurrent={() => false}
        isTargetable={() => true}
        isTargetSelected={(e) => e.position === 5}
      />,
    )
    const formationWith = screen.getAllByRole('listitem').map(formationClassesOf)

    expect(formationWith).toEqual(formationWithout)
    expect(screen.getByRole('button', { name: /Chaman/u }).getAttribute('data-selected')).toBe(
      'true',
    )
  })
})

describe('battle-rooms.css -- guardas de la formacion inmutable (10a pasada)', () => {
  const css = readFileSync(path.join(__dirname, '..', 'battle-rooms.css'), 'utf-8')

  it('.br-combatant reserva min-width: 0 (evita que el badge de turno ensanche su columna del grid)', () => {
    const start = css.indexOf('.br-combatant {')
    const end = css.indexOf('}', start)
    if (start === -1 || end === -1) {
      throw new Error('No se encontro la regla .br-combatant en battle-rooms.css.')
    }

    expect(css.slice(start, end)).toContain('min-width: 0')
  })

  it('los offsets de formacion (nth-child / data-side-size) nunca dependen de turno, target ni pending', () => {
    const start = css.indexOf('@media (min-width: 640px) {\n  .br-arena-side ul > li:nth-child(1)')
    const end = css.indexOf('/* El heroe se ve SOLO sobre la arena')
    if (start === -1 || end === -1) {
      throw new Error('No se encontro el bloque de offsets de formacion en battle-rooms.css.')
    }

    const formationBlock = css.slice(start, end)

    for (const forbidden of [
      'br-combatant--active',
      'data-selected',
      'aria-pressed',
      'data-current-turn',
    ]) {
      expect(formationBlock).not.toContain(forbidden)
    }
  })
})
