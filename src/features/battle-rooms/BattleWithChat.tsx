import { useParams } from 'react-router'

import { BattlePage, type BattlePageProps } from './battle/BattlePage'

import { ChatPanel, type ChatPanelProps } from './ChatPanel'

export interface BattleWithChatProps {
  /** Inyectables de la pantalla de batalla, solo para pruebas. */
  readonly battle?: BattlePageProps
  /** Inyectables del chat, solo para pruebas. */
  readonly chat?: Pick<ChatPanelProps, 'socketFactory' | 'ticketProvider' | 'hasSession'>
}

/**
 * La pantalla de batalla de una sala (HU-17) con el chat de esa sala debajo (HU-13).
 *
 * Existe porque el lobby de la sala redirige a la batalla en cuanto la sala se llena
 * (`PREPARING`), y Combat mantiene el chat de la sala abierto en `PREPARING` e
 * `IN_BATTLE`: sin esto el chat desapareceria justo cuando los jugadores se
 * coordinan. Se compone AQUI, a nivel de ruta, y no dentro de `BattlePage`, para no
 * tocar esa pantalla (que es de HU-17) ni sus pruebas.
 *
 * El chat lo abre cada persona con su propia conexion: Combat decide quien es
 * participante y el panel explica el resto (sala cancelada, no participante...).
 */
export const BattleWithChat = ({ battle, chat }: BattleWithChatProps): React.JSX.Element => {
  const { roomId = null } = useParams<{ roomId: string }>()

  return (
    <div className="flex flex-col gap-6">
      <BattlePage {...battle} />
      {roomId !== null && (
        <ChatPanel
          channel={{ kind: 'room', roomId }}
          title="Chat de la sala"
          description="Solo lo ven los participantes de esta sala."
          {...chat}
        />
      )}
    </div>
  )
}
