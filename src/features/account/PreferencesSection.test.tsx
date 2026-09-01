import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PreferencesSection } from './PreferencesSection'
import { THEME_STORAGE_KEY, initTheme, useTheme } from '@/shared/theme'

afterEach(() => {
  globalThis.localStorage.clear()
  initTheme()
})

describe('PreferencesSection', () => {
  it('marca el tema activo con aria-pressed', () => {
    useTheme.getState().setTheme('light')
    render(<PreferencesSection />)

    expect(screen.getByRole('button', { name: /Claro/u })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Oscuro/u })).toHaveAttribute('aria-pressed', 'false')
  })

  it('cambiar a Oscuro usa el MISMO store y la MISMA persistencia (una sola fuente)', async () => {
    const user = userEvent.setup()
    useTheme.getState().setTheme('light')
    render(<PreferencesSection />)

    await user.click(screen.getByRole('button', { name: /Oscuro/u }))

    expect(useTheme.getState().theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    // La preferencia se guarda en la clave global de `@/shared/theme`, no en una propia.
    expect(globalThis.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('declara el idioma como pendiente, sin inventar persistencia', () => {
    render(<PreferencesSection />)

    expect(screen.getByRole('heading', { name: 'Idioma' })).toBeInTheDocument()
    expect(screen.getByText(/Todavia no disponible/u)).toBeInTheDocument()
  })
})
