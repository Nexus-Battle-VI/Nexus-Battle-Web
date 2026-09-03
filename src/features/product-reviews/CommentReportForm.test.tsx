import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { HttpError } from '@/lib/http'
import { CommentReportForm } from './CommentReportForm'
import type { CommentReport } from './api'

const COMMENT_ID = 'comment-1'

const REPORT: CommentReport = {
  id: 'report-1',
  commentId: COMMENT_ID,
  authorId: 'acc-1',
  category: 'SPAM',
  description: null,
  createdAt: '2026-09-03T10:00:00.000Z',
}

const CATEGORY_LABELS = [
  'Spam',
  'Contenido ofensivo',
  'Acoso',
  'Información falsa',
  'Contenido inapropiado',
  'Violación de derechos de autor',
]

const seleccionarMotivo = async (
  user: ReturnType<typeof userEvent.setup>,
  motivo: string,
): Promise<void> => {
  await user.selectOptions(screen.getByRole('combobox', { name: 'Motivo del reporte' }), motivo)
}

describe('CommentReportForm', () => {
  it('muestra el formulario con las seis categorias de RF-46', () => {
    renderWithProviders(
      <CommentReportForm commentId={COMMENT_ID} onCancel={vi.fn()} report={vi.fn()} />,
    )

    const select = screen.getByRole('combobox', { name: 'Motivo del reporte' })
    const labels = Array.from(select.querySelectorAll('option'))
      .map((option) => option.textContent)
      .filter((label) => label !== 'Selecciona un motivo')

    expect(labels).toEqual(CATEGORY_LABELS)
    expect(
      screen.getByRole('textbox', { name: 'Descripción adicional (opcional)' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar reporte' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('no envia sin categoria seleccionada, e indica el motivo por UX', async () => {
    const user = userEvent.setup()
    const report = vi.fn()
    renderWithProviders(
      <CommentReportForm commentId={COMMENT_ID} onCancel={vi.fn()} report={report} />,
    )

    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Selecciona un motivo para continuar.',
    )
    expect(report).not.toHaveBeenCalled()
  })

  it('envia categoria y descripcion, y usa el commentId correcto', async () => {
    const user = userEvent.setup()
    const report = vi.fn().mockResolvedValue(REPORT)
    renderWithProviders(
      <CommentReportForm commentId={COMMENT_ID} onCancel={vi.fn()} report={report} />,
    )

    await seleccionarMotivo(user, 'Acoso')
    await user.type(
      screen.getByRole('textbox', { name: 'Descripción adicional (opcional)' }),
      'Insulta a otro jugador.',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Tu reporte fue enviado para revisión.',
    )
    expect(report).toHaveBeenCalledWith(COMMENT_ID, {
      category: 'HARASSMENT',
      description: 'Insulta a otro jugador.',
    })
    // Nunca se envia quien reporta: Community lo resuelve del testimonio.
    const [, sentInput] = report.mock.calls[0] as [string, Record<string, unknown>]
    expect(sentInput).not.toHaveProperty('authorId')
    expect(sentInput).not.toHaveProperty('userId')
    expect(sentInput).not.toHaveProperty('playerId')
    expect(sentInput).not.toHaveProperty('accountId')
  })

  it('envia categoria sin descripcion: el campo opcional no viaja vacio', async () => {
    const user = userEvent.setup()
    const report = vi.fn().mockResolvedValue(REPORT)
    renderWithProviders(
      <CommentReportForm commentId={COMMENT_ID} onCancel={vi.fn()} report={report} />,
    )

    await seleccionarMotivo(user, 'Spam')
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(report).toHaveBeenCalledWith(COMMENT_ID, { category: 'SPAM' })
  })

  it('201: muestra el mensaje de enviado para revision, no un veredicto', async () => {
    const user = userEvent.setup()
    const report = vi.fn().mockResolvedValue(REPORT)
    renderWithProviders(
      <CommentReportForm commentId={COMMENT_ID} onCancel={vi.fn()} report={report} />,
    )

    await seleccionarMotivo(user, 'Spam')
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Tu reporte fue enviado para revisión.')
    expect(status.textContent).not.toMatch(/infringe|sancionado|aprobado/iu)
  })

  it('400: muestra el mensaje de validacion real del backend', async () => {
    const user = userEvent.setup()
    const report = vi
      .fn()
      .mockRejectedValue(new HttpError(400, 'description no puede superar 500 caracteres', null))
    renderWithProviders(
      <CommentReportForm commentId={COMMENT_ID} onCancel={vi.fn()} report={report} />,
    )

    await seleccionarMotivo(user, 'Spam')
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'description no puede superar 500 caracteres',
    )
  })

  it('401: muestra el aviso de sesion caducada', async () => {
    const user = userEvent.setup()
    const report = vi
      .fn()
      .mockRejectedValue(new HttpError(401, 'Falta el testimonio o no es válido', null))
    renderWithProviders(
      <CommentReportForm commentId={COMMENT_ID} onCancel={vi.fn()} report={report} />,
    )

    await seleccionarMotivo(user, 'Spam')
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Vuelve a iniciar sesión/u)
  })

  it('404: muestra que el comentario ya no esta disponible', async () => {
    const user = userEvent.setup()
    const report = vi.fn().mockRejectedValue(new HttpError(404, 'El comentario no existe', null))
    renderWithProviders(
      <CommentReportForm commentId={COMMENT_ID} onCancel={vi.fn()} report={report} />,
    )

    await seleccionarMotivo(user, 'Spam')
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ya no está disponible')
  })

  it('429: muestra el aviso de limite SIN inventar una cifra', async () => {
    const user = userEvent.setup()
    const report = vi
      .fn()
      .mockRejectedValue(new HttpError(429, 'El jugador excedió el límite de reportes', null))
    renderWithProviders(
      <CommentReportForm commentId={COMMENT_ID} onCancel={vi.fn()} report={report} />,
    )

    await seleccionarMotivo(user, 'Spam')
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'Has alcanzado el límite de reportes permitido. Intenta nuevamente más adelante.',
    )
    expect(alert.textContent).not.toMatch(/\d/u)
  })

  it('500: mensaje generico, sin exponer el detalle tecnico', async () => {
    const user = userEvent.setup()
    const report = vi
      .fn()
      .mockRejectedValue(new HttpError(500, 'StackTrace: token secret interno', null))
    const { container } = renderWithProviders(
      <CommentReportForm commentId={COMMENT_ID} onCancel={vi.fn()} report={report} />,
    )

    await seleccionarMotivo(user, 'Spam')
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    await screen.findByRole('alert')
    expect(container.textContent).not.toMatch(/StackTrace|token secret/u)
  })

  it('cancelar cierra el formulario sin enviar nada', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const report = vi.fn()
    renderWithProviders(
      <CommentReportForm commentId={COMMENT_ID} onCancel={onCancel} report={report} />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(report).not.toHaveBeenCalled()
  })

  it('es operable por teclado: Tab alcanza el motivo, la descripcion y los botones', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <CommentReportForm commentId={COMMENT_ID} onCancel={vi.fn()} report={vi.fn()} />,
    )

    await user.tab()
    expect(screen.getByRole('combobox', { name: 'Motivo del reporte' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Descripción adicional (opcional)' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Enviar reporte' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })

  it('muestra el estado de envio y deshabilita el boton mientras esta pendiente', async () => {
    const user = userEvent.setup()
    let resolveReport: (value: CommentReport) => void = () => undefined
    const report = vi.fn(
      () =>
        new Promise<CommentReport>((resolve) => {
          resolveReport = resolve
        }),
    )
    renderWithProviders(
      <CommentReportForm commentId={COMMENT_ID} onCancel={vi.fn()} report={report} />,
    )

    await seleccionarMotivo(user, 'Spam')
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(screen.getByRole('status')).toHaveTextContent('Enviando…')
    expect(screen.getByRole('button', { name: 'Procesando...' })).toBeDisabled()

    resolveReport(REPORT)
    expect(await screen.findByText('Tu reporte fue enviado para revisión.')).toBeInTheDocument()
  })
})
