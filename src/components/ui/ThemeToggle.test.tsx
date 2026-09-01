import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ThemeToggle } from './ThemeToggle'
import { initTheme, useTheme } from '@/shared/theme'

const reset = (): void => {
  globalThis.localStorage.clear()
  delete globalThis.document.documentElement.dataset.theme
  initTheme()
}

beforeEach(reset)
afterEach(reset)

describe('ThemeToggle', () => {
  it('expone Light y Dark como grupo accesible con estado presionado', () => {
    useTheme.getState().setTheme('light')
    render(<ThemeToggle />)

    expect(screen.getByRole('group', { name: 'Tema de la interfaz' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('al elegir un tema actualiza el store global y <html>', async () => {
    const user = userEvent.setup()
    useTheme.getState().setTheme('light')
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Dark' }))

    expect(useTheme.getState().theme).toBe('dark')
    expect(globalThis.document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('es operable por teclado', async () => {
    const user = userEvent.setup()
    useTheme.getState().setTheme('light')
    render(<ThemeToggle />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Light' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(useTheme.getState().theme).toBe('dark')
  })

  it('dos instancias comparten la misma preferencia (no hay estado duplicado)', async () => {
    const user = userEvent.setup()
    useTheme.getState().setTheme('light')
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>,
    )

    const [firstDark] = screen.getAllByRole('button', { name: 'Dark' })
    await user.click(firstDark!)

    for (const button of screen.getAllByRole('button', { name: 'Dark' })) {
      expect(button).toHaveAttribute('aria-pressed', 'true')
    }
  })
})
