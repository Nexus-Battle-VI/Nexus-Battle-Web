import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
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
  automaticFlagCount: 0,
  lastAutomaticFlaggedAt: null,
  sources: ['USER_REPORT'],
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
      await screen.findByText(
        'No hay comentarios reportados ni detectados pendientes de revisión.',
      ),
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

  /**
   * HU-41.10 (Management#312): la fila debe mostrar el origen que Community
   * ya calculo (`entry.sources`), sin que Web infiera ni recalcule nada.
   */
  it('muestra el origen "reportado" para una fila que solo tiene reportes', async () => {
    const listQueue = vi
      .fn()
      .mockResolvedValue(
        page([
          entry({ sources: ['USER_REPORT'], automaticFlagCount: 0, lastAutomaticFlaggedAt: null }),
        ]),
      )

    renderWithProviders(<ModerationQueuePage listQueue={listQueue} />)

    expect(await screen.findByText('Reportado por usuarios')).toBeInTheDocument()
    expect(screen.queryByText('Detectado automáticamente')).not.toBeInTheDocument()
  })

  it('muestra el origen "deteccion automatica" para una fila solo detectada por el filtro', async () => {
    const listQueue = vi.fn().mockResolvedValue(
      page([
        entry({
          sources: ['AUTOMATIC_FILTER'],
          reportCount: 0,
          lastReportedAt: null,
          automaticFlagCount: 2,
          lastAutomaticFlaggedAt: '2026-09-04T09:00:00.000Z',
        }),
      ]),
    )

    renderWithProviders(<ModerationQueuePage listQueue={listQueue} />)

    expect(await screen.findByText('Detectado automáticamente')).toBeInTheDocument()
    expect(screen.queryByText('Reportado por usuarios')).not.toBeInTheDocument()
    expect(
      screen.getByText('2 detecciones automáticas · última detección', { exact: false }),
    ).toBeInTheDocument()
  })

  it('una fila con ambos origenes muestra cada insignia una sola vez, sin duplicar', async () => {
    const listQueue = vi.fn().mockResolvedValue(
      page([
        entry({
          sources: ['USER_REPORT', 'AUTOMATIC_FILTER'],
          automaticFlagCount: 1,
          lastAutomaticFlaggedAt: '2026-09-04T09:00:00.000Z',
        }),
      ]),
    )

    renderWithProviders(<ModerationQueuePage listQueue={listQueue} />)

    expect(await screen.findAllByText('Reportado por usuarios')).toHaveLength(1)
    expect(screen.getAllByText('Detectado automáticamente')).toHaveLength(1)
  })

  /**
   * HU-41.9/HU-41.10: eliminar borra FISICAMENTE el comentario en Community,
   * asi que a diferencia de las demas acciones la fila debe desaparecer de la
   * vista en lugar de quedar con una insignia "Eliminado".
   */
  it('eliminar retira la fila de la cola y no dejar una insignia de eliminado', async () => {
    const user = userEvent.setup()
    const listQueue = vi.fn().mockResolvedValue(page([entry()]))
    vi.spyOn(api, 'deleteCommentByModeration').mockResolvedValue(
      comment({ moderationStatus: 'DELETED' }),
    )

    renderWithProviders(<ModerationQueuePage listQueue={listQueue} />)

    await screen.findByText('Contenido publicitario repetido en varios productos.')
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    const form = screen.getByRole('form', { name: /Eliminar comentario/ })
    await user.type(within(form).getByRole('textbox', { name: 'Motivo de la acción' }), 'Infringe.')
    await user.click(within(form).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('eliminado permanentemente')
    expect(
      screen.queryByText('Contenido publicitario repetido en varios productos.'),
    ).not.toBeInTheDocument()
    await waitFor(() => {
      expect(listQueue).toHaveBeenCalledTimes(2)
    })
  })
})
