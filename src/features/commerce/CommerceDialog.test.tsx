import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CommerceDialog } from './CommerceDialog'

describe('CommerceDialog', () => {
  it('abre un dialog nativo accesible y solicita cerrar desde el boton', async () => {
    const onClose = vi.fn()
    render(
      <CommerceDialog title="Carrito" onClose={onClose}>
        Contenido del carrito
      </CommerceDialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Carrito' })
    expect(dialog).toHaveAttribute('open')
    expect(dialog).toHaveTextContent('Contenido del carrito')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar Carrito' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('solicita cerrar al recibir cancel, el evento nativo de Escape', () => {
    const onClose = vi.fn()
    render(
      <CommerceDialog title="Detalle" onClose={onClose}>
        Producto
      </CommerceDialog>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Detalle' })
    // jsdom no ejecuta la accion por defecto de Escape sobre HTMLDialogElement.
    const cancel = new Event('cancel', { cancelable: true })

    fireEvent(dialog, cancel)

    expect(onClose).toHaveBeenCalledExactlyOnceWith()
    expect(cancel.defaultPrevented).toBe(true)
  })

  it('impide cerrar con Escape o el boton mientras esta bloqueado', async () => {
    const onClose = vi.fn()
    render(
      <CommerceDialog title="Confirmar compra" onClose={onClose} locked>
        Procesando compra
      </CommerceDialog>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Confirmar compra' })
    const closeButton = screen.getByRole('button', { name: 'Cerrar Confirmar compra' })
    const cancel = new Event('cancel', { cancelable: true })

    expect(closeButton).toBeDisabled()
    await userEvent.click(closeButton)
    fireEvent(dialog, cancel)

    expect(onClose).not.toHaveBeenCalled()
    expect(cancel.defaultPrevented).toBe(true)
    expect(dialog).toHaveAttribute('open')
  })

  it('cierra el elemento nativo al desmontarse', () => {
    const { unmount } = render(
      <CommerceDialog title="Detalle" onClose={vi.fn()}>
        Producto
      </CommerceDialog>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Detalle' })
    const close = vi.spyOn(dialog as HTMLDialogElement, 'close')

    unmount()

    expect(close).toHaveBeenCalledExactlyOnceWith()
    expect(dialog).not.toHaveAttribute('open')
  })
})
