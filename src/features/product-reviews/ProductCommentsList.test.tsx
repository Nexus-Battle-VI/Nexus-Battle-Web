import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { ProductCommentsList } from './ProductCommentsList'
import { ModerationStatus, type ProductComment, type ProductCommentPage } from './api'

const PRODUCT_ID = '3f2a1e4c-6b7d-4a8e-9c1f-2d3e4f5a6b7c'

const comment = (overrides: Partial<ProductComment>): ProductComment => ({
  id: 'comment-1',
  productId: PRODUCT_ID,
  authorId: 'acc-1',
  content: 'Muy buen producto.',
  images: [],
  createdAt: '2026-09-03T10:00:00.000Z',
  moderationStatus: ModerationStatus.Pending,
  ...overrides,
})

const page = (items: readonly ProductComment[]): ProductCommentPage => ({
  items,
  total: items.length,
  limit: 20,
  offset: 0,
})

describe('ProductCommentsList (HU-40 + HU-46)', () => {
  it('muestra el estado de carga antes de que responda el servicio', () => {
    renderWithProviders(
      <ProductCommentsList
        productId={PRODUCT_ID}
        listComments={() => new Promise(() => undefined)}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
  })

  it('un producto sin comentarios muestra el estado vacio, no un error', async () => {
    renderWithProviders(
      <ProductCommentsList productId={PRODUCT_ID} listComments={() => Promise.resolve(page([]))} />,
    )

    expect(
      await screen.findByText('Todavía no hay comentarios sobre este producto.'),
    ).toBeInTheDocument()
  })

  it('renderiza cada comentario con su accion de reportar', async () => {
    renderWithProviders(
      <ProductCommentsList
        productId={PRODUCT_ID}
        listComments={() =>
          Promise.resolve(page([comment({ id: 'comment-1', content: 'Muy buen producto.' })]))
        }
      />,
    )

    expect(await screen.findByText('Muy buen producto.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reportar' })).toBeInTheDocument()
  })

  it('abre el formulario de reporte del comentario correcto y lo cierra al cancelar', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ProductCommentsList
        productId={PRODUCT_ID}
        listComments={() =>
          Promise.resolve(
            page([
              comment({ id: 'comment-1', content: 'Primer comentario.' }),
              comment({ id: 'comment-2', content: 'Segundo comentario.' }),
            ]),
          )
        }
      />,
    )

    await screen.findByText('Primer comentario.')
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)

    await user.click(within(items[1]!).getByRole('button', { name: 'Reportar' }))

    // Solo el formulario del SEGUNDO comentario aparece.
    expect(
      within(items[1]!).getByRole('combobox', { name: 'Motivo del reporte' }),
    ).toBeInTheDocument()
    expect(
      within(items[0]!).queryByRole('combobox', { name: 'Motivo del reporte' }),
    ).not.toBeInTheDocument()

    await user.click(within(items[1]!).getByRole('button', { name: 'Cancelar' }))

    expect(
      within(items[1]!).queryByRole('combobox', { name: 'Motivo del reporte' }),
    ).not.toBeInTheDocument()
  })

  it('abrir el formulario de reporte no oculta el resto de la lista', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <ProductCommentsList
        productId={PRODUCT_ID}
        listComments={() =>
          Promise.resolve(
            page([
              comment({ id: 'comment-1', content: 'Primer comentario.' }),
              comment({ id: 'comment-2', content: 'Segundo comentario.' }),
            ]),
          )
        }
      />,
    )

    await screen.findByText('Primer comentario.')
    await user.click(screen.getAllByRole('button', { name: 'Reportar' })[0]!)

    expect(screen.getByText('Primer comentario.')).toBeInTheDocument()
    expect(screen.getByText('Segundo comentario.')).toBeInTheDocument()
  })
})
