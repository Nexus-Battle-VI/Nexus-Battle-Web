import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import * as chatApi from '@/features/chat/api'

import { ChatWidget } from './ChatWidget'

const reply = {
  answered: true,
  intent: 'reglas_turno',
  language: 'es',
  confidence: 0.9,
  answer: 'El turno dura 30 segundos.',
  kind: 'direct',
  suggestions: ['¿Cuánto dura la batalla?'],
  view: 'misiones',
  sessionId: 'session-1',
}

describe('ChatWidget', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('está en cualquier vista y envía la pregunta con la vista actual', async () => {
    let finish: (value: typeof reply) => void = () => undefined
    let calls = 0
    const ask = vi.spyOn(chatApi, 'askChat').mockImplementation(() => {
      calls += 1
      if (calls > 1) {
        return Promise.resolve({ ...reply, suggestions: [] })
      }
      return new Promise((resolve) => {
        finish = resolve
      })
    })
    const user = userEvent.setup()
    renderWithProviders(<ChatWidget />, { route: '/missions' })

    await user.click(screen.getByRole('button', { name: 'Abrir ayuda' }))
    await user.type(screen.getByLabelText('Escribe tu pregunta'), 'cuanto dura el turno')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(screen.getByRole('status')).toHaveTextContent('Escribiendo…')
    finish(reply)
    expect(await screen.findByText('El turno dura 30 segundos.')).toBeInTheDocument()
    expect(screen.getByText('cuanto dura el turno')).toBeInTheDocument()
    expect(ask).toHaveBeenCalledWith('cuanto dura el turno', 'misiones', null)
    await user.click(screen.getByRole('button', { name: '¿Cuánto dura la batalla?' }))
    expect(ask).toHaveBeenLastCalledWith('¿Cuánto dura la batalla?', 'misiones', 'session-1')
  })

  it('limpia el historial, adjunta una captura y abre la transferencia', async () => {
    vi.spyOn(chatApi, 'askChat').mockResolvedValue(reply)
    const openTicket = vi.spyOn(chatApi, 'openSupportTicket').mockResolvedValue({
      id: 'ticket-9',
      sessionId: 'session-1',
    })
    const clear = vi.spyOn(chatApi, 'clearChatHistory').mockResolvedValue(null)
    const user = userEvent.setup()
    renderWithProviders(<ChatWidget />, { route: '/ecommerce' })

    await user.click(screen.getByRole('button', { name: 'Abrir ayuda' }))
    await user.type(screen.getByLabelText('Escribe tu pregunta'), 'hola')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('El turno dura 30 segundos.')).toBeInTheDocument()

    const file = new File(['png'], 'fallo.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Adjuntar captura'), file)
    expect(screen.getByText('Captura adjunta: fallo.png')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Transferir a soporte' }))
    expect(openTicket).toHaveBeenCalledWith('hola', 'catalogo', 'session-1')
    expect(await screen.findByText('Consulta registrada: ticket-9')).toBeInTheDocument()
    expect(screen.getByText(/Listo para pasar a soporte/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpiar historial' }))
    expect(clear).toHaveBeenCalledWith('session-1')
    expect(screen.queryByText('El turno dura 30 segundos.')).not.toBeInTheDocument()
  })

  it('se minimiza y recuerda ocultar la hora', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChatWidget />, { route: '/account' })
    await user.click(screen.getByRole('button', { name: 'Abrir ayuda' }))
    await user.click(screen.getByRole('button', { name: 'Preferencias' }))
    await user.click(screen.getByRole('checkbox', { name: 'Mostrar la hora' }))
    expect(sessionStorage.getItem('chat-show-time')).toBe('0')
    await user.click(screen.getByRole('button', { name: 'Cerrar ayuda' }))
    expect(screen.getByRole('button', { name: 'Abrir ayuda' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('muestra el camino cuando la respuesta trae una acción asistida', async () => {
    vi.spyOn(chatApi, 'askChat').mockResolvedValue({
      ...reply,
      suggestions: [],
      assistedAction: { name: 'configuracion_cuenta', path: '/account' },
    })
    const user = userEvent.setup()
    renderWithProviders(<ChatWidget />, { route: '/ecommerce' })
    await user.click(screen.getByRole('button', { name: 'Abrir ayuda' }))
    await user.type(screen.getByLabelText('Escribe tu pregunta'), 'mi cuenta')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    const link = await screen.findByRole('link', { name: 'Abrir esta sección' })
    expect(link).toHaveAttribute('href', '/account')
  })

  it('muestra el número cuando la consulta no se resolvió', async () => {
    vi.spyOn(chatApi, 'askChat').mockResolvedValue({
      ...reply,
      answered: false,
      answer: null,
      suggestions: [],
      ticketId: 'ticket-1',
    })
    const user = userEvent.setup()
    renderWithProviders(<ChatWidget />, { route: '/ecommerce' })
    await user.click(screen.getByRole('button', { name: 'Abrir ayuda' }))
    await user.type(screen.getByLabelText('Escribe tu pregunta'), 'no se')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('Consulta registrada: ticket-1')).toBeInTheDocument()
  })
})

describe('viewFromPath', () => {
  it('traduce las rutas del producto a la vista del contrato', () => {
    expect(chatApi.viewFromPath('/catalog/heroes')).toBe('catalogo')
    expect(chatApi.viewFromPath('/play/rooms/1')).toBe('jugar')
    expect(chatApi.viewFromPath('/login')).toBeNull()
  })
})
