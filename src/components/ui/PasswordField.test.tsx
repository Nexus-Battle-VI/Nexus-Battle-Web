import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PasswordField } from './PasswordField'

const renderField = () =>
  render(
    <>
      <label htmlFor="pwd">Contraseña</label>
      <PasswordField
        id="pwd"
        aria-invalid={true}
        aria-describedby="pwd-error"
        autoComplete="new-password"
        defaultValue="s3creto!"
      />
      <p id="pwd-error">obligatoria</p>
    </>,
  )

afterEach(() => {
  globalThis.localStorage.clear()
  globalThis.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('PasswordField', () => {
  it('nace enmascarado y la etiqueta apunta al input', () => {
    renderField()
    const input = screen.getByLabelText('Contraseña')

    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAttribute('id', 'pwd')
  })

  it('reenvia aria-invalid, aria-describedby y autoComplete al input', () => {
    renderField()
    const input = screen.getByLabelText('Contraseña')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'pwd-error')
    expect(input).toHaveAttribute('autocomplete', 'new-password')
  })

  it('el boton "Mostrar contraseña" revela el texto y cambia de nombre', async () => {
    const user = userEvent.setup()
    renderField()

    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'pwd')

    await user.click(toggle)

    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text')
    const hide = screen.getByRole('button', { name: 'Ocultar contraseña' })
    expect(hide).toHaveAttribute('aria-pressed', 'true')

    await user.click(hide)
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
  })

  it('el toggle es operable por teclado', async () => {
    const user = userEvent.setup()
    renderField()

    const input = screen.getByLabelText('Contraseña')
    input.focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text')
  })

  it('no escribe la contraseña ni el estado de visibilidad en almacenamiento', async () => {
    const user = userEvent.setup()
    const localSpy = vi.spyOn(Storage.prototype, 'setItem')
    renderField()

    await user.type(screen.getByLabelText('Contraseña'), 'MasTexto1!')
    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))

    expect(localSpy).not.toHaveBeenCalled()
    expect(globalThis.localStorage.length).toBe(0)
    expect(globalThis.sessionStorage.length).toBe(0)
  })
})
