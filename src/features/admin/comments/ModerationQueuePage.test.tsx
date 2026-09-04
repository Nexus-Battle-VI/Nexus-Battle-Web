import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { HttpError } from '@/lib/http'
import { ModerationQueuePage } from './ModerationQueuePage'
import * as api from './api'
import type { ModerationQueueEntry, ModerationQueuePage as ModerationQueuePageDto } from './api'
import type { ProductComment } from '@/features/product-reviews/api'

const PRODUCT_ID = '3f2a1e4c-6b7d-4a8e-9c1f-2d3e4f5a6b7c'

const comment = (overrides: Partial<ProductComment> = {}): ProductComment => ({
  id: 'comment-1',
  productId: PRODUCT_ID,
  authorId: 'acc-1',
  content: 'Contenido publicitario repetido en varios productos.',
  images: [],
  createdAt: '2026-09-03T10:00:00.000Z',
  moderationStatus: 'PENDING',
  ...overrides,
})

const entry = (overrides: Partial<ModerationQueueEntry> = {}): ModerationQueueEntry => ({
  comment: comment(),
  reportCount: 3,
  lastReportedAt: '2026-09-03T11:00:00.000Z',
  ...overrides,
})

const page = (items: readonly ModerationQueueEntry[]): ModerationQueuePageDto => ({
  items,
  total: items.length,
  limit: 20,
  offset: 0,
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ModerationQueuePage', () => {
  it('muestra estado de carga y luego la cola con reportes y estado de moderacion', async () => {
    const listQueue = vi.fn().mockResolvedValue(page([entry()]))

    renderWithProviders(<ModerationQueuePage listQueue={listQueue} />)

    expect(screen.getByRole('status')).toBeInTheDocument()

    expect(
      await screen.findByText('Contenido publicitario repetido en varios productos.'),
    ).toBeInTheDocument()
    expect(screen.getByText('3 reportes · último reporte', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('muestra el mensaje vacio cuando no hay comentarios reportados', async () => {
    const listQueue = vi.fn().mockResolvedValue(page([]))

    renderWithProviders(<ModerationQueuePage listQueue={listQueue} />)

    expect(
      await screen.findByText('No hay comentarios reportados pendientes de revisión.'),
    ).toBeInTheDocument()
  })

  it('aprueba un comentario: envia el motivo, actualiza la insignia y avisa del exito', async () => {
    const user = userEvent.setup()
    const listQueue = vi.fn().mockResolvedValue(page([entry()]))
    const approve = vi
      .spyOn(api, 'approveComment')
      .mockResolvedValue(comment({ moderationStatus: 'APPROVED' }))

    renderWithProviders(<ModerationQueuePage listQueue={listQueue} />)

    await screen.findByText('Contenido publicitario repetido en varios productos.')

    await user.click(screen.getByRole('button', { name: 'Aprobar' }))

    const form = screen.getByRole('form', { name: /Aprobar comentario/ })
    await user.type(
      within(form).getByRole('textbox', { name: 'Motivo de la acción' }),
      'Comentario legítimo tras revisión.',
    )
    await user.click(within(form).getByRole('button', { name: 'Aprobar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('comentario actualizado')
    expect(screen.getByText('Aprobado')).toBeInTheDocument()
    expect(approve).toHaveBeenCalledWith('comment-1', {
      reason: 'Comentario legítimo tras revisión.',
    })
  })

  it('rechaza aprobar sin motivo, sin llamar al servicio', async () => {
    const user = userEvent.setup()
    const listQueue = vi.fn().mockResolvedValue(page([entry()]))
    const approve = vi.spyOn(api, 'approveComment')

    renderWithProviders(<ModerationQueuePage listQueue={listQueue} />)

    await screen.findByText('Contenido publicitario repetido en varios productos.')
    await user.click(screen.getByRole('button', { name: 'Aprobar' }))

    const form = screen.getByRole('form', { name: /Aprobar comentario/ })
    await user.click(within(form).getByRole('button', { name: 'Aprobar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El motivo es obligatorio.')
    expect(approve).not.toHaveBeenCalled()
  })

  it('un comentario inexistente muestra el rechazo del servicio (404)', async () => {
    const user = userEvent.setup()
    const listQueue = vi.fn().mockResolvedValue(page([entry()]))
    vi.spyOn(api, 'hideComment').mockRejectedValue(new HttpError(404, 'No existe', null))

    renderWithProviders(<ModerationQueuePage listQueue={listQueue} />)

    await screen.findByText('Contenido publicitario repetido en varios productos.')
    await user.click(screen.getByRole('button', { name: 'Ocultar' }))

    const form = screen.getByRole('form', { name: /Ocultar comentario/ })
    await user.type(within(form).getByRole('textbox', { name: 'Motivo de la acción' }), 'Motivo.')
    await user.click(within(form).getByRole('button', { name: 'Ocultar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este comentario ya no está disponible.',
    )
  })

  it('editar precarga el contenido vigente y no aparece en las demas acciones', async () => {
    const user = userEvent.setup()
    const listQueue = vi.fn().mockResolvedValue(page([entry()]))

    renderWithProviders(<ModerationQueuePage listQueue={listQueue} />)

    await screen.findByText('Contenido publicitario repetido en varios productos.')
    await user.click(screen.getByRole('button', { name: 'Editar' }))

    const form = screen.getByRole('form', { name: /Editar comentario/ })
    expect(within(form).getByRole('textbox', { name: 'Nuevo contenido' })).toHaveValue(
      'Contenido publicitario repetido en varios productos.',
    )
  })
})
