import { Swords } from '@/components/ui/icons'
import { ChatPanel } from '@/features/chat/ChatPanel'
import { LOBBY_CHANNEL } from '@/features/chat/protocol'

import { AvailableBattleRoomsPanel } from './AvailableBattleRoomsPanel'
import { CreateBattleRoomPanel } from './CreateBattleRoomPanel'

/**
 * "Jugar Online" (HU-14.4). Reemplaza el `ModuleUnavailable` que ocupaba
 * `/play`. Dos paneles: crear sala (≈40%) y salas disponibles (≈60%), una
 * columna en mobile/tablet con "Crear sala" primero (orden = documento, sin
 * `order-*` que rompa el foco de teclado).
 *
 * `lg:items-start` evita que el grid estire el panel de creacion (mas corto)
 * hasta la altura del listado; cada panel controla su propio alto.
 *
 * HU-13: debajo, el chat del lobby (la "vista general" de Jugar Online, seccion
 * 7.6 del documento oficial), para organizar partidas.
 */
export const BattleRoomsPage = (): React.JSX.Element => (
  <section aria-label="Jugar Online" className="flex flex-col gap-6">
    <header className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="hidden shrink-0 items-center justify-center rounded-lg bg-brand/10 p-2 text-brand sm:flex"
      >
        <Swords className="h-6 w-6" />
      </span>
      <div>
        <h1 className="text-2xl font-semibold text-ink">Jugar Online</h1>
        <p className="text-sm text-muted">
          Lobby de combate: crea una sala o unete a una existente.
        </p>
      </div>
    </header>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
      <CreateBattleRoomPanel />
      <AvailableBattleRoomsPanel />
    </div>

    <ChatPanel
      channel={LOBBY_CHANNEL}
      title="Chat del lobby"
      description="Organiza partidas con otros jugadores."
    />
  </section>
)
