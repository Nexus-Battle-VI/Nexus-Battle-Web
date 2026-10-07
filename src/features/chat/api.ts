import { httpClient } from '@/lib/http'

export interface ChatReply {
  readonly answered: boolean
  readonly intent: string | null
  readonly language: string | null
  readonly confidence: number
  readonly answer: string | null
  readonly kind: string
  readonly suggestions: readonly string[]
  readonly view: string | null
  readonly sessionId: string | null
  readonly assistedAction?: { readonly name: string; readonly path: string } | null
  readonly ticketId?: string | null
  readonly turnId?: string | null
}

export interface ChatTurn {
  readonly id: string
  readonly question: string
  readonly answer: string | null
  readonly useful: boolean | null
  readonly assistedAction?: { readonly name: string; readonly path: string } | null
}

export interface OpenedTicket {
  readonly id: string
  readonly sessionId: string | null
}

export const askChat = (
  text: string,
  view: string | null,
  sessionId: string | null,
): Promise<ChatReply> =>
  httpClient.post<ChatReply>('/v1/chatbot/messages', {
    text,
    ...(view === null ? {} : { view }),
    ...(sessionId === null ? {} : { sessionId }),
  })

export const openSupportTicket = (
  text: string,
  view: string | null,
  sessionId: string | null,
): Promise<OpenedTicket> =>
  httpClient.post<OpenedTicket>('/v1/chatbot/tickets', {
    text,
    ...(view === null ? {} : { view }),
    ...(sessionId === null ? {} : { sessionId }),
  })

export const chatHistory = (
  sessionId: string | null,
): Promise<{ sessionId: string | null; turns: readonly ChatTurn[] }> => {
  const query = sessionId === null ? '' : `?sessionId=${encodeURIComponent(sessionId)}`
  return httpClient.get(`/v1/chatbot/messages/history${query}`)
}

export const rateChat = (
  turnId: string,
  useful: boolean,
  sessionId: string | null,
): Promise<{ id: string; useful: boolean }> =>
  httpClient.post(`/v1/chatbot/messages/${encodeURIComponent(turnId)}/rating`, {
    useful,
    ...(sessionId === null ? {} : { sessionId }),
  })

export const chatPreferences = (
  sessionId: string | null,
): Promise<{ showTime: boolean; sessionId: string | null }> => {
  const query = sessionId === null ? '' : `?sessionId=${encodeURIComponent(sessionId)}`
  return httpClient.get(`/v1/chatbot/preferences${query}`)
}

export const saveChatPreferences = (
  showTime: boolean,
  sessionId: string | null,
): Promise<{ showTime: boolean }> =>
  httpClient.request('/v1/chatbot/preferences', {
    method: 'PUT',
    body: { showTime, ...(sessionId === null ? {} : { sessionId }) },
  })

export const clearChatHistory = (sessionId: string | null): Promise<null> => {
  const query = sessionId === null ? '' : `?sessionId=${encodeURIComponent(sessionId)}`
  return httpClient.delete(`/v1/chatbot/messages/history${query}`)
}

/** Vista que el contrato de consulta entiende. Desconocida: no se envía. */
export const viewFromPath = (pathname: string): string | null => {
  if (pathname.startsWith('/ecommerce') || pathname.startsWith('/catalog')) {
    return 'catalogo'
  }
  if (pathname.startsWith('/play')) {
    return 'jugar'
  }
  if (pathname.startsWith('/missions')) {
    return 'misiones'
  }
  if (pathname.startsWith('/tournament')) {
    return 'torneo'
  }
  if (pathname.startsWith('/inventory')) {
    return 'inventario'
  }
  if (pathname.startsWith('/auction')) {
    return 'subasta'
  }
  if (pathname.startsWith('/account')) {
    return 'cuenta'
  }
  return null
}
