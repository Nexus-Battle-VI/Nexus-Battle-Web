import './battle-rooms.css'
import { BattlePage, type BattlePageProps } from './battle/BattlePage'
import type { ChatPanelProps } from './ChatPanel'

export interface BattleWithChatProps {
  /** Inyectables de la pantalla de batalla, solo para pruebas. */
  readonly battle?: BattlePageProps
  /**
   * Se conserva en la firma SOLO por compatibilidad con quien todavia pase
   * `chat={...}` -- ya no se usa (ver docstring). Eliminar el prop rompería
   * a cualquier llamador existente sin necesidad.
   */
  readonly chat?: Pick<ChatPanelProps, 'socketFactory' | 'ticketProvider' | 'hasSession'>
}

/**
 * La pantalla de batalla de una sala (HU-17).
 *
 * Remaster visual Sprint 3 (3a pasada, seccion 55 del brief): el chat de la
 * sala YA NO se muestra aqui. Combat sigue exponiendo el canal de chat de la
 * sala durante `PREPARING`/`IN_BATTLE` (el protocolo no cambia en absoluto),
 * pero el requisito funcional real es que la persona pueda coordinarse ANTES
 * de que la batalla empiece (Lobby/Sala de espera, donde el chat flotante SI
 * vive -- ver `FloatingChatPanel`); mientras la batalla esta activa, el
 * producto no exige tenerlo a la vista, y visualmente competia con el HUD de
 * combate. Nada del protocolo de chat se elimino: solo se dejo de montar el
 * componente EN ESTA pantalla.
 */
export const BattleWithChat = ({ battle }: BattleWithChatProps): React.JSX.Element => (
  <BattlePage {...battle} />
)
