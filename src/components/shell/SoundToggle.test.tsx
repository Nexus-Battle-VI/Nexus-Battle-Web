import { afterEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SFX_STORAGE_KEY, useSfxSettings } from '@/shared/sound'
import { renderWithProviders } from '@/test/render'

import { SoundToggle } from './SoundToggle'

afterEach(() => {
  useSfxSettings.setState({ enabled: false })
  localStorage.removeItem(SFX_STORAGE_KEY)
})

describe('SoundToggle (EN-031)', () => {
  it('arranca apagado y alterna con aria-pressed sin cambiar su nombre', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SoundToggle />)

    const button = screen.getByRole('button', { name: 'Efectos de sonido' })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await user.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(useSfxSettings.getState().enabled).toBe(true)
    expect(localStorage.getItem(SFX_STORAGE_KEY)).toBe('on')

    await user.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })
})
