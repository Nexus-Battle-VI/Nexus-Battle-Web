import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { HttpError } from '@/lib/http'
import { ModerationActionForm } from './ModerationActionForm'
import type { ProductComment } from '@/features/product-reviews/api'

const COMMENT_ID = 'comment-1'

const MODERATED_COMMENT: ProductComment = {
  id: COMMENT_ID,
  productId: '3f2a1e4c-6b7d-4a8e-9c1f-2d3e4f5a6b7c',
  authorId: 'acc-1',
  content: 'Contenido publicitario repetido.',
  images: [],
  createdAt: '2026-09-03T10:00:00.000Z',
  moderationStatus: 'APPROVED',
}

describe('ModerationActionForm', () => {
  it('no envia sin motivo, e indica el motivo por UX', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderWithProviders(
      <ModerationActionForm
        commentId={COMMENT_ID}
        action="approve"
        actionLabel="Aprobar"
        onSubmit={onSubmit}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Aprobar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El motivo es obligatorio.')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envia el motivo y notifica el exito con el comentario actualizado', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(MODERATED_COMMENT)
    const onSuccess = vi.fn()
    renderWithProviders(
      <ModerationActionForm
        commentId={COMMENT_ID}
        action="approve"
        actionLabel="Aprobar"
        onSubmit={onSubmit}
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />,
    )

    await user.type(
      screen.getByRole('textbox', { name: 'Motivo de la acción' }),
      'Comentario legítimo tras revisión.',
    )
    await user.click(screen.getByRole('button', { name: 'Aprobar' }))

    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(MODERATED_COMMENT)
    })
    expect(onSubmit).toHaveBeenCalledWith(COMMENT_ID, {
      reason: 'Comentario legítimo tras revisión.',
    })
  })

  it('accion edit tambien exige y envia el contenido nuevo', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue({ ...MODERATED_COMMENT, moderationStatus: 'EDITED' })
    renderWithProviders(
      <ModerationActionForm
        commentId={COMMENT_ID}
        action="edit"
        actionLabel="Editar"
        initialContent="Contenido original."
        onSubmit={onSubmit}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const contentField = screen.getByRole('textbox', { name: 'Nuevo contenido' })
    expect(contentField).toHaveValue('Contenido original.')

    await user.clear(contentField)
    await user.type(contentField, 'Contenido corregido.')
    await user.type(
      screen.getByRole('textbox', { name: 'Motivo de la acción' }),
      'Se retiró un enlace externo.',
    )
    await user.click(screen.getByRole('button', { name: 'Editar' }))

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(COMMENT_ID, {
        reason: 'Se retiró un enlace externo.',
        content: 'Contenido corregido.',
      })
    })
  })

  it('muestra el rechazo del comentario inexistente (404)', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new HttpError(404, 'No existe', null))
    renderWithProviders(
      <ModerationActionForm
        commentId={COMMENT_ID}
        action="hide"
        actionLabel="Ocultar"
        onSubmit={onSubmit}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await user.type(
      screen.getByRole('textbox', { name: 'Motivo de la acción' }),
      'Motivo cualquiera.',
    )
    await user.click(screen.getByRole('button', { name: 'Ocultar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este comentario ya no está disponible.',
    )
  })

  it('llama a onCancel sin enviar nada', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    renderWithProviders(
      <ModerationActionForm
        commentId={COMMENT_ID}
        action="mark"
        actionLabel="Marcar"
        onSubmit={onSubmit}
        onSuccess={vi.fn()}
        onCancel={onCancel}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
