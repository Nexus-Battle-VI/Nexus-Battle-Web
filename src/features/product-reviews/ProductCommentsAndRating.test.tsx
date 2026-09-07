import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { HttpError } from '@/lib/http'
import { ProductCommentsAndRating } from './ProductCommentsAndRating'
import { ModerationStatus, type ProductComment } from './api'

const PRODUCT_ID = '3f2a1e4c-6b7d-4a8e-9c1f-2d3e4f5a6b7c'

const COMMENT: ProductComment = {
  id: 'comment-1',
  productId: PRODUCT_ID,
  authorId: 'acc-1',
  content: 'Muy buen producto.',
  images: [],
  createdAt: '2026-09-03T10:00:00.000Z',
  moderationStatus: ModerationStatus.Pending,
}

const escribirComentario = async (
  user: ReturnType<typeof userEvent.setup>,
  texto: string,
): Promise<void> => {
  await user.type(screen.getByRole('textbox', { name: 'Comentario' }), texto)
}

describe('ProductCommentsAndRating', () => {
  it('muestra el formulario principal: comentario, calificacion opcional e imagenes', () => {
    renderWithProviders(
      <ProductCommentsAndRating
        productId={PRODUCT_ID}
        publishComment={vi.fn()}
        submitRating={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Comentarios y calificación' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Comentario' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Calificación' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Agregar imagen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeInTheDocument()
  })

  it('rechaza un envio sin comentario antes de llamar a la API', async () => {
    const user = userEvent.setup()
    const publishComment = vi.fn()
    renderWithProviders(
      <ProductCommentsAndRating
        productId={PRODUCT_ID}
        publishComment={publishComment}
        submitRating={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Escribe un comentario antes de publicar.',
    )
    expect(publishComment).not.toHaveBeenCalled()
  })

  it('publica un comentario SIN calificacion: no llama a submitRating', async () => {
    const user = userEvent.setup()
    const publishComment = vi.fn().mockResolvedValue(COMMENT)
    const submitRating = vi.fn()
    renderWithProviders(
      <ProductCommentsAndRating
        productId={PRODUCT_ID}
        publishComment={publishComment}
        submitRating={submitRating}
      />,
    )

    await escribirComentario(user, 'Excelente calidad.')
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Tu comentario se publicó correctamente.',
    )
    expect(publishComment).toHaveBeenCalledWith(PRODUCT_ID, { content: 'Excelente calidad.' })
    expect(submitRating).not.toHaveBeenCalled()
    // El formulario queda listo para otro comentario (HU-40.4).
    expect(screen.getByRole('textbox', { name: 'Comentario' })).toHaveValue('')
  })

  it('selecciona una calificacion y la envia junto con el comentario', async () => {
    const user = userEvent.setup()
    const publishComment = vi.fn().mockResolvedValue(COMMENT)
    const submitRating = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(
      <ProductCommentsAndRating
        productId={PRODUCT_ID}
        publishComment={publishComment}
        submitRating={submitRating}
      />,
    )

    await escribirComentario(user, 'Me encantó.')
    await user.click(screen.getByRole('radio', { name: '4 de 5 estrellas' }))
    expect(screen.getByRole('radio', { name: '4 de 5 estrellas' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Tu comentario y tu calificación se publicaron correctamente.',
    )
    expect(submitRating).toHaveBeenCalledWith(PRODUCT_ID, 4)
    // Una vez calificado, el selector desaparece: no se puede volver a calificar.
    expect(screen.queryByRole('radiogroup', { name: 'Calificación' })).not.toBeInTheDocument()
    expect(screen.getByText('Ya calificaste este producto anteriormente.')).toBeInTheDocument()
  })

  it('CA-03 / HU-40.3: un 409 al calificar NO deshace el comentario ya publicado', async () => {
    const user = userEvent.setup()
    const publishComment = vi.fn().mockResolvedValue(COMMENT)
    const submitRating = vi
      .fn()
      .mockRejectedValue(new HttpError(409, 'Ya existe una calificación de este jugador', null))
    renderWithProviders(
      <ProductCommentsAndRating
        productId={PRODUCT_ID}
        publishComment={publishComment}
        submitRating={submitRating}
      />,
    )

    await escribirComentario(user, 'Segundo comentario.')
    await user.click(screen.getByRole('radio', { name: '5 de 5 estrellas' }))
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Tu comentario se publicó correctamente. Ya habías registrado una calificación',
    )
    expect(publishComment).toHaveBeenCalledTimes(1)
    // El estado "ya calificado" persiste: el selector de estrellas desaparece.
    expect(screen.queryByRole('radiogroup', { name: 'Calificación' })).not.toBeInTheDocument()
  })

  it('sigue permitiendo publicar comentarios despues de haber calificado (HU-40.4)', async () => {
    const user = userEvent.setup()
    const publishComment = vi.fn().mockResolvedValue(COMMENT)
    const submitRating = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(
      <ProductCommentsAndRating
        productId={PRODUCT_ID}
        publishComment={publishComment}
        submitRating={submitRating}
      />,
    )

    await escribirComentario(user, 'Primero.')
    await user.click(screen.getByRole('radio', { name: '3 de 5 estrellas' }))
    await user.click(screen.getByRole('button', { name: 'Publicar' }))
    await screen.findByRole('status')

    await escribirComentario(user, 'Otro comentario más.')
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Tu comentario se publicó correctamente.',
    )
    expect(publishComment).toHaveBeenCalledTimes(2)
    // La segunda vez no vuelve a intentar calificar: ya no hay selector.
    expect(submitRating).toHaveBeenCalledTimes(1)
  })

  it('ante un 401 al comentar muestra el aviso de sesion caducada', async () => {
    const user = userEvent.setup()
    const publishComment = vi
      .fn()
      .mockRejectedValue(new HttpError(401, 'Falta el testimonio o no es válido', null))
    renderWithProviders(
      <ProductCommentsAndRating
        productId={PRODUCT_ID}
        publishComment={publishComment}
        submitRating={vi.fn()}
      />,
    )

    await escribirComentario(user, 'Hola.')
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Vuelve a iniciar sesión para comentar o calificar/u,
    )
  })

  it('ante un 400 del backend muestra el mensaje de validacion real, sin inventarlo', async () => {
    const user = userEvent.setup()
    const publishComment = vi
      .fn()
      .mockRejectedValue(new HttpError(400, 'content no puede superar 2000 caracteres', null))
    renderWithProviders(
      <ProductCommentsAndRating
        productId={PRODUCT_ID}
        publishComment={publishComment}
        submitRating={vi.fn()}
      />,
    )

    await escribirComentario(user, 'Hola.')
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'content no puede superar 2000 caracteres',
    )
  })

  it('ante un fallo de servicio no expone detalles tecnicos', async () => {
    const user = userEvent.setup()
    const publishComment = vi
      .fn()
      .mockRejectedValue(new HttpError(500, 'StackTrace: token secret interno', null))
    const { container } = renderWithProviders(
      <ProductCommentsAndRating
        productId={PRODUCT_ID}
        publishComment={publishComment}
        submitRating={vi.fn()}
      />,
    )

    await escribirComentario(user, 'Hola.')
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    await screen.findByRole('alert')
    expect(container.textContent).not.toMatch(/StackTrace|token secret/u)
  })

  it('muestra el estado de envio y deshabilita el boton mientras esta pendiente', async () => {
    const user = userEvent.setup()
    let resolvePublish: (value: ProductComment) => void = () => undefined
    const publishComment = vi.fn(
      () =>
        new Promise<ProductComment>((resolve) => {
          resolvePublish = resolve
        }),
    )
    renderWithProviders(
      <ProductCommentsAndRating
        productId={PRODUCT_ID}
        publishComment={publishComment}
        submitRating={vi.fn()}
      />,
    )

    await escribirComentario(user, 'Enviando esto.')
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(screen.getByRole('status')).toHaveTextContent('Enviando…')
    expect(screen.getByRole('button', { name: 'Procesando...' })).toBeDisabled()

    resolvePublish(COMMENT)
    expect(await screen.findByText('Tu comentario se publicó correctamente.')).toBeInTheDocument()
  })

  it('permite agregar y quitar campos de imagen, y envia solo las no vacias', async () => {
    const user = userEvent.setup()
    const publishComment = vi.fn().mockResolvedValue(COMMENT)
    renderWithProviders(
      <ProductCommentsAndRating
        productId={PRODUCT_ID}
        publishComment={publishComment}
        submitRating={vi.fn()}
      />,
    )

    await escribirComentario(user, 'Con imagen.')
    await user.click(screen.getByRole('button', { name: 'Agregar imagen' }))
    await user.click(screen.getByRole('button', { name: 'Agregar imagen' }))
    await user.type(screen.getByLabelText('Imagen 1'), 'https://cdn.test/foto.jpg')
    await user.click(screen.getAllByRole('button', { name: 'Quitar' })[1]!)

    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(publishComment).toHaveBeenCalledWith(PRODUCT_ID, {
      content: 'Con imagen.',
      images: ['https://cdn.test/foto.jpg'],
    })
  })

  it('el selector de estrellas es operable por teclado', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ProductCommentsAndRating
        productId={PRODUCT_ID}
        publishComment={vi.fn()}
        submitRating={vi.fn()}
      />,
    )

    screen.getByRole('radio', { name: '1 de 5 estrellas' }).focus()
    await user.tab()
    await user.tab()
    expect(screen.getByRole('radio', { name: '3 de 5 estrellas' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('radio', { name: '3 de 5 estrellas' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})
