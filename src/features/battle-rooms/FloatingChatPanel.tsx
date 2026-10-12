import { useRef, useState } from 'react'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import './battle-rooms.css'
import { BattlePixelIcon } from './BattlePixelIcon'
import { ChatPanel, type ChatPanelProps } from './ChatPanel'

export interface FloatingChatPanelProps extends ChatPanelProps {
  /**
   * EN-031: `corner` (lobby y sala de espera, abajo a la derecha) o `battle` (a la
   * izquierda del escenario, a media altura: ni el HUD, ni el registro, ni las acciones).
   */
  readonly placement?: 'corner' | 'battle'
}

/**
 * Chat como burbuja flotante (remaster visual Sprint 3, 3a pasada, secciones
 * 11-15 del brief): mismo patron que un chat de videojuego -- una burbuja
 * compacta en la esquina, un panel superpuesto que NO empuja el layout ni
 * obliga a hacer scroll de pagina para llegar a el.
 *
 * Reutiliza `ChatPanel` TAL CUAL por dentro (mismo protocolo, mismo estado,
 * mismo `useChat`) -- este componente solo decide DONDE y CUANDO se ve, no
 * duplica logica de chat. Lobby y Sala de espera lo llevan en la esquina; la
 * batalla activa, a la izquierda del escenario (EN-031, `placement="battle"`).
 *
 * `open`/`closed` es estado de UI PURO (`useState` local): no hay backend
 * involucrado en abrir o cerrar el panel.
 */
export const FloatingChatPanel = ({
  placement = 'corner',
  ...props
}: FloatingChatPanelProps): React.JSX.Element => {
  const [open, setOpen] = useState(false)
  const bubbleRef = useRef<HTMLButtonElement>(null)
  const { t } = useTranslation()

  return (
    <div className={clsx('br-floating-chat', placement === 'battle' && 'br-floating-chat--battle')}>
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
