import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import './battle-rooms.css'
import { BattlePixelIcon } from './BattlePixelIcon'
import { ChatPanel, type ChatPanelProps } from './ChatPanel'

export type FloatingChatPanelProps = ChatPanelProps

/**
 * Chat como burbuja flotante (remaster visual Sprint 3, 3a pasada, secciones
 * 11-15 del brief): mismo patron que un chat de videojuego -- una burbuja
 * compacta en la esquina, un panel superpuesto que NO empuja el layout ni
 * obliga a hacer scroll de pagina para llegar a el.
 *
 * Reutiliza `ChatPanel` TAL CUAL por dentro (mismo protocolo, mismo estado,
 * mismo `useChat`) -- este componente solo decide DONDE y CUANDO se ve, no
 * duplica logica de chat. Pensado para Lobby y Sala de espera; la Batalla
 * activa NO lo usa (ver `BattleWithChat`).
 *
 * `open`/`closed` es estado de UI PURO (`useState` local): no hay backend
 * involucrado en abrir o cerrar el panel.
 */
export const FloatingChatPanel = (props: FloatingChatPanelProps): React.JSX.Element => {
  const [open, setOpen] = useState(false)
  const bubbleRef = useRef<HTMLButtonElement>(null)
  const { t } = useTranslation()

  return (
    <div className="br-floating-chat">
      {open && (
        <div role="dialog" aria-label={props.title} className="br-floating-chat-panel">
          <button
            type="button"
            aria-label={t('battle:chat.close')}
            className="br-floating-chat-close"
            onClick={() => {
              setOpen(false)
              bubbleRef.current?.focus()
            }}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
          <ChatPanel {...props} className="br-floating-chat-inner" />
        </div>
      )}
      <button
        ref={bubbleRef}
        type="button"
        aria-expanded={open}
        aria-label={props.title}
        className="br-floating-chat-bubble"
        onClick={() => {
          setOpen((current) => !current)
        }}
      >
        <BattlePixelIcon icon="chat" size="md" />
      </button>
    </div>
  )
}
