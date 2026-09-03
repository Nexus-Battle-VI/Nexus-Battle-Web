import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { HttpError } from '@/lib/http'
import { AccountDeletionRequest } from './AccountDeletionRequest'
import type { AccountDeletionRequest as DeletionReceipt } from './api'

const RECEIPT: DeletionReceipt = {
  id: 'del-1',
  status: 'RECEIVED',
  receivedAt: '2026-09-03T12:00:00.000Z',
}

describe('AccountDeletionRequest', () => {
  it('muestra la accion y la advertencia funcional dentro del portal de privacidad', () => {
    renderWithProviders(<AccountDeletionRequest requestDeletion={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Eliminar mi cuenta' })).toBeInTheDocument()
    expect(screen.getByText(/plazo máximo de 30 días/u)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Solicitar eliminación de cuenta' }),
    ).toBeInTheDocument()
    // Antes de confirmar, ninguna peticion parte de solo renderizar la seccion.
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('abre la confirmacion sin enviar ninguna peticion, y cancelar tampoco envia ninguna', async () => {
    const user = userEvent.setup()
    const requestDeletion = vi.fn()
    renderWithProviders(<AccountDeletionRequest requestDeletion={requestDeletion} />)

    await user.click(screen.getByRole('button', { name: 'Solicitar eliminación de cuenta' }))

    expect(requestDeletion).not.toHaveBeenCalled()
    expect(
      screen.getByText('¿Confirmas que quieres solicitar la eliminación de tu cuenta?'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(requestDeletion).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Solicitar eliminación de cuenta' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('confirmar envia EXACTAMENTE una peticion, sin cuerpo ni identificador del titular', async () => {
    const user = userEvent.setup()
    const requestDeletion = vi.fn().mockResolvedValue(RECEIPT)
    renderWithProviders(<AccountDeletionRequest requestDeletion={requestDeletion} />)

    await user.click(screen.getByRole('button', { name: 'Solicitar eliminación de cuenta' }))
    await user.click(screen.getByRole('button', { name: 'Sí, solicitar eliminación' }))

    expect(requestDeletion).toHaveBeenCalledTimes(1)
    // TanStack Query invoca `mutationFn(variables, context)`; esta pantalla no
    // pasa ningun identificador del titular como `variables`.
    expect(requestDeletion.mock.calls[0]?.[0]).toBeUndefined()
  })

  it('mientras esta pendiente, evita clics repetidos: solo una peticion en vuelo', async () => {
    const user = userEvent.setup()
    let resolveRequest: (value: DeletionReceipt) => void = () => undefined
    const requestDeletion = vi.fn(
      () =>
        new Promise<DeletionReceipt>((resolve) => {
          resolveRequest = resolve
        }),
    )
    renderWithProviders(<AccountDeletionRequest requestDeletion={requestDeletion} />)

    await user.click(screen.getByRole('button', { name: 'Solicitar eliminación de cuenta' }))
    const confirmButton = screen.getByRole('button', { name: 'Sí, solicitar eliminación' })

    await user.click(confirmButton)
    await user.click(confirmButton)
    await user.click(confirmButton)

    expect(requestDeletion).toHaveBeenCalledTimes(1)
    expect(confirmButton).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()

    resolveRequest(RECEIPT)
    expect(await screen.findByRole('status')).toHaveTextContent('Solicitud recibida.')
  })

  it('muestra RECEPCION, nunca eliminacion terminada, con la fecha real devuelta por Account', async () => {
    const user = userEvent.setup()
    const requestDeletion = vi.fn().mockResolvedValue(RECEIPT)
    renderWithProviders(<AccountDeletionRequest requestDeletion={requestDeletion} />)

    await user.click(screen.getByRole('button', { name: 'Solicitar eliminación de cuenta' }))
    await user.click(screen.getByRole('button', { name: 'Sí, solicitar eliminación' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Solicitud recibida.')
    // La unica mencion a "eliminada" en el texto de recepcion es la aclaracion
    // de que TODAVIA no ocurrio; nunca una afirmacion de que ya se completo.
    expect(status.textContent).toContain('no significa que tu cuenta ya fue eliminada')
    expect(screen.getByText('Recibida')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Sí, solicitar eliminación' }),
    ).not.toBeInTheDocument()
  })

  it('una solicitud ya activa (misma respuesta idempotente de Account) tambien se muestra como recibida', async () => {
    const user = userEvent.setup()
    const yaActiva: DeletionReceipt = { ...RECEIPT, receivedAt: '2026-08-15T09:00:00.000Z' }
    const requestDeletion = vi.fn().mockResolvedValue(yaActiva)
    renderWithProviders(<AccountDeletionRequest requestDeletion={requestDeletion} />)

    await user.click(screen.getByRole('button', { name: 'Solicitar eliminación de cuenta' }))
    await user.click(screen.getByRole('button', { name: 'Sí, solicitar eliminación' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Solicitud recibida.')
    expect(screen.getByText(/15\/08\/2026/u)).toBeInTheDocument()
  })

  it('ante un 401 muestra un mensaje seguro de sesion caducada y permite reintentar', async () => {
    const user = userEvent.setup()
    const requestDeletion = vi
      .fn()
      .mockRejectedValue(new HttpError(401, 'Falta el testimonio o no es válido', null))
    renderWithProviders(<AccountDeletionRequest requestDeletion={requestDeletion} />)

    await user.click(screen.getByRole('button', { name: 'Solicitar eliminación de cuenta' }))
    await user.click(screen.getByRole('button', { name: 'Sí, solicitar eliminación' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/sesión ha caducado/u)
    expect(screen.getByRole('button', { name: 'Sí, solicitar eliminación' })).toBeEnabled()
  })

  it('el flujo completo es operable solo con teclado', async () => {
    const user = userEvent.setup()
    const requestDeletion = vi.fn().mockResolvedValue(RECEIPT)
    renderWithProviders(<AccountDeletionRequest requestDeletion={requestDeletion} />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Solicitar eliminación de cuenta' })).toHaveFocus()
    await user.keyboard('{Enter}')

    await user.tab()
    expect(screen.getByRole('button', { name: 'Sí, solicitar eliminación' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('status')).toHaveTextContent('Solicitud recibida.')
  })

  it('ante un error de servicio no expone detalles tecnicos', async () => {
    const user = userEvent.setup()
    const requestDeletion = vi
      .fn()
      .mockRejectedValue(new HttpError(500, 'StackTrace: subject sub:abc token secret', null))
    const { container } = renderWithProviders(
      <AccountDeletionRequest requestDeletion={requestDeletion} />,
    )

    await user.click(screen.getByRole('button', { name: 'Solicitar eliminación de cuenta' }))
    await user.click(screen.getByRole('button', { name: 'Sí, solicitar eliminación' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo enviar tu solicitud de eliminación. Intenta nuevamente más tarde.',
    )
    expect(container.textContent).not.toMatch(/StackTrace|subject|sub:abc|token|secret/u)
  })
})
