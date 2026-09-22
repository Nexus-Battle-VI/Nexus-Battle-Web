import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { difficultiesAfterNormal, difficultiesWithoutProgress } from '@/test/missions-fixtures'

import type { MissionDifficulty } from './api'
import { DifficultySelector } from './DifficultySelector'

describe('DifficultySelector (HU-75.3)', () => {
  it('presenta los cuatro niveles como opciones de un mismo grupo', () => {
    render(
      <DifficultySelector
        items={difficultiesWithoutProgress().items}
        value={null}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('radiogroup', { name: 'Dificultad' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    for (const name of ['Normal', 'Heroico', 'Legendario', 'Mítico']) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument()
    }
  })

  it('un nivel bloqueado explica el motivo que redacto Missions', () => {
    render(
      <DifficultySelector
        items={difficultiesWithoutProgress().items}
        value={null}
        onChange={vi.fn()}
      />,
    )

    const heroic = screen.getByRole('radio', { name: 'Heroico' })

    expect(heroic).toHaveAttribute('aria-disabled', 'true')
    expect(heroic).toHaveAccessibleDescription(
      expect.stringContaining('Debes completar esta misión en Normal al menos una vez.'),
    )
    expect(heroic).toHaveAccessibleDescription(
      expect.stringContaining('Enemigos con 50 % más estadísticas'),
    )
  })

  it('Mitico se presenta sin un porcentaje inventado', () => {
    render(
      <DifficultySelector
        items={difficultiesWithoutProgress().items}
        value={null}
        onChange={vi.fn()}
      />,
    )

    const mythic = screen.getByRole('radio', { name: 'Mítico' })

    expect(mythic).toHaveAccessibleDescription(expect.stringContaining('Dificultad máxima'))
    expect(mythic).toHaveAccessibleDescription(expect.not.stringContaining('%'))
  })

  it('elegir un nivel libre avisa a quien monta el selector', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <DifficultySelector
        items={difficultiesAfterNormal().items}
        value={null}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('radio', { name: 'Heroico' }))

    expect(onChange).toHaveBeenCalledWith('HEROIC')
  })

  it('un nivel bloqueado no se puede elegir, ni con el raton ni con el teclado', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <DifficultySelector
        items={difficultiesWithoutProgress().items}
        value={null}
        onChange={onChange}
      />,
    )

    await user.tab()
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Heroico' })).toHaveFocus()
    await user.keyboard('{ }')
    await user.click(screen.getByRole('radio', { name: 'Legendario' }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('se opera por teclado: Tab lleva al nivel y Espacio lo elige', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <DifficultySelector
        items={difficultiesWithoutProgress().items}
        value={null}
        onChange={onChange}
      />,
    )

    await user.tab()
    expect(screen.getByRole('radio', { name: 'Normal' })).toHaveFocus()
    await user.keyboard('{ }')

    expect(onChange).toHaveBeenCalledWith('NORMAL')
  })

  it('marca como elegido solo el nivel que recibe', () => {
    render(
      <DifficultySelector
        items={difficultiesAfterNormal().items}
        value="HEROIC"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('radio', { name: 'Heroico' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Normal' })).toHaveAttribute('aria-checked', 'false')
  })

  // Control de "no decide en el navegador": con datos que la regla nunca
  // produciria, el selector sigue obedeciendo al servicio y no los corrige.
  it('obedece lo que dice el servicio en lugar de recalcular la progresion', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const items: MissionDifficulty[] = difficultiesWithoutProgress().items.map((item) =>
      item.difficulty === 'LEGENDARY' ? { ...item, unlocked: true, lockReason: null } : item,
    )
    render(<DifficultySelector items={items} value={null} onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: 'Legendario' }))

    expect(onChange).toHaveBeenCalledWith('LEGENDARY')
    expect(screen.getByRole('radio', { name: 'Heroico' })).toHaveAttribute('aria-disabled', 'true')
  })
})
