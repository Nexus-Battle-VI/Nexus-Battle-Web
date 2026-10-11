import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProgressEntry } from '../missionPlayApi'
import { MissionDiorama } from './MissionDiorama'
import { BEAT_MS, CATCH_UP_TAIL } from './useDioramaPlayback'

const entry = (seq: number, enemy: string): ProgressEntry => ({
  seq,
  turn: seq,
  kind: 'ENEMY_APPEARED',
  enemy,
  role: 'ENEMY',
  maxHealth: 10,
  enemyHealth: 10,
})

const renderDiorama = (entries: readonly ProgressEntry[]) =>
  render(
    <MissionDiorama
      entries={entries}
      scene={<svg data-testid="escena" />}
      heroName="Kaelen"
      heroSubtype={null}
      heroMaxHealth={40}
    />,
  )

/** El enemigo que se ve ahora en el escenario (su nombre va en el HUD). */
const enemyOnStage = (): string | null =>
  document.querySelector('[data-side="enemy"] .msn-stage-hud-name')?.textContent ?? null

const mockReducedMotion = (reduce: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: reduce && query.includes('reduce'), media: query })),
  )
}

describe('diorama de progreso (remaster EN-031)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('es decorativo: el escenario no se anuncia y la escena va dentro', () => {
    mockReducedMotion(false)
    const { container } = renderDiorama([])

    expect(container.querySelector('.msn-stage')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByTestId('escena')).toBeInTheDocument()
  })

  it('reproduce las entradas en orden, una por momento', () => {
    mockReducedMotion(false)
    const { rerender } = renderDiorama([])
    const log = [entry(1, 'Primero'), entry(2, 'Segundo')]
    rerender(
      <MissionDiorama
        entries={log}
        scene={null}
        heroName="Kaelen"
        heroSubtype={null}
        heroMaxHealth={40}
      />,
    )

    expect(enemyOnStage()).toBeNull()
    act(() => {
      vi.advanceTimersByTime(BEAT_MS)
    })
    expect(enemyOnStage()).toBe('Primero')
    act(() => {
      vi.advanceTimersByTime(BEAT_MS)
    })
    expect(enemyOnStage()).toBe('Segundo')
  })

  it('al abrir con historia ya revelada solo reproduce los ultimos momentos', () => {
    mockReducedMotion(false)
    const log = [1, 2, 3, 4, 5, 6].map((seq) => entry(seq, `Enemigo ${String(seq)}`))
    renderDiorama(log)

    // Arranca justo antes de los ultimos CATCH_UP_TAIL momentos.
    expect(enemyOnStage()).toBe(`Enemigo ${String(log.length - CATCH_UP_TAIL)}`)
  })

  it('en pausa no avanza, y se puede reanudar', () => {
    mockReducedMotion(false)
    const log = [entry(1, 'Primero'), entry(2, 'Segundo')]
    renderDiorama(log)

    fireEvent.click(screen.getByRole('button', { name: 'Pausar animación' }))
    act(() => {
      vi.advanceTimersByTime(BEAT_MS * 4)
    })
    expect(enemyOnStage()).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Reanudar animación' }))
    act(() => {
      vi.advanceTimersByTime(BEAT_MS)
    })
    expect(enemyOnStage()).toBe('Primero')
  })

  it('con movimiento reducido muestra el ultimo estado, sin animar ni boton de pausa', () => {
    mockReducedMotion(true)
    const { container } = renderDiorama([entry(1, 'Primero'), entry(2, 'Segundo')])

    expect(enemyOnStage()).toBe('Segundo')
    expect(container.querySelector('.msn-stage')).toHaveClass('msn-stage--still')
    expect(container.querySelector('.msn-float')).toBeNull()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('momentos del diorama', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockReducedMotion(false)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const APPEAR: ProgressEntry = {
    seq: 1,
    turn: 0,
    kind: 'ENEMY_APPEARED',
    enemy: 'El Guardián Eterno',
    role: 'BOSS',
    maxHealth: 30,
    enemyHealth: 30,
  }

  /** Avanza el diorama momento a momento: cada paso programa el siguiente. */
  const playMoments = (count: number): void => {
    for (let step = 0; step < count; step++) {
      act(() => {
        vi.advanceTimersByTime(BEAT_MS)
      })
    }
  }

  /** Reproduce la aparicion y luego `moment`, y devuelve lo que flota. */
  const floatAfter = (moment: Omit<ProgressEntry, 'seq' | 'turn'>): string | null => {
    renderDiorama([APPEAR, { seq: 2, turn: 1, ...moment }])
    playMoments(2)
    return document.querySelector('.msn-float')?.textContent ?? null
  }

  it.each([
    [{ kind: 'HERO_ACTION', hit: true, damage: 9, critical: true }, '−9 ¡Crítico!'],
    [{ kind: 'ENEMY_ACTION', hit: true, damage: 4 }, '−4'],
    [{ kind: 'HERO_ACTION', hit: false }, 'Falla'],
    [{ kind: 'ENEMY_ACTION', hit: false }, 'Falla'],
    [{ kind: 'HERO_HEALED', amount: 5 }, '+5'],
    [{ kind: 'HERO_ACTION', attacked: false, ability: 'Rezo' }, 'Rezo'],
  ] as const)('%o hace flotar «%s» sobre quien lo recibe', (moment, text) => {
    expect(floatAfter(moment)).toBe(text)
  })

  it('el escudo de un enemigo en guardia se ve con un icono, sin texto', () => {
    expect(floatAfter({ kind: 'ENEMY_GUARDED' })).toBe('')
    expect(document.querySelector('.msn-float--guard img')).toBeInTheDocument()
  })

  it('un golpe del enemigo reproduce su tira de ataque', () => {
    renderDiorama([APPEAR, { seq: 2, turn: 1, kind: 'ENEMY_ACTION', hit: true, damage: 4 }])
    playMoments(2)

    const strip = document.querySelector<HTMLElement>('.msn-stage-strip')
    expect(strip).toHaveClass('msn-stage-strip--once')
    expect(strip?.style.backgroundImage).toMatch(/el-guardian-eterno-attack/u)
  })

  it('anuncia el encuentro del jefe y el desenlace', () => {
    renderDiorama([
      { seq: 1, turn: 0, kind: 'ENCOUNTER_STARTED', encounter: 3, boss: true },
      { seq: 2, turn: 9, kind: 'MISSION_FINISHED', victory: false },
    ])
    act(() => {
      vi.advanceTimersByTime(BEAT_MS)
    })
    expect(document.querySelector('.msn-stage-callout')).toHaveTextContent('Encuentro 3 · Jefe')

    act(() => {
      vi.advanceTimersByTime(BEAT_MS)
    })
    expect(document.querySelector('.msn-stage-outcome')).toHaveTextContent('Derrota')
  })

  it('con el subtipo del heroe pinta su sprite de la biblioteca visual', () => {
    render(
      <MissionDiorama
        entries={[]}
        scene={null}
        heroName="Kaelen"
        heroSubtype="GUERRERO_TANQUE"
        heroMaxHealth={40}
      />,
    )

    expect(document.querySelector('[data-hero="guerrero-tanque"]')).toBeInTheDocument()
  })
})
