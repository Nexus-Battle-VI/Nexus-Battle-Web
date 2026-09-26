import { useTranslation } from 'react-i18next'

import { Swords } from '@/components/ui/icons'
import { ChatPanel } from './ChatPanel'
import { LOBBY_CHANNEL } from './chatProtocol'

import { ActiveRoomBanner } from './ActiveRoomBanner'
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
 *
 * Arriba de los paneles, "Partida en curso" (`ActiveRoomBanner`): la sala o
 * batalla del jugador que aun no termino, leida del servidor.
 */
export const BattleRoomsPage = (): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <section aria-label={t('battle:page.title')} className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="hidden shrink-0 items-center justify-center rounded-lg bg-brand/10 p-2 text-brand sm:flex"
        >
          <Swords className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t('battle:page.title')}</h1>
          <p className="text-sm text-muted">{t('battle:page.subtitle')}</p>
        </div>
      </header>

      <ActiveRoomBanner />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <CreateBattleRoomPanel />
        <AvailableBattleRoomsPanel />
      </div>

      <ChatPanel
        channel={LOBBY_CHANNEL}
        title={t('battle:page.lobbyChat')}
        description={t('battle:page.lobbyChatDescription')}
      />
    </section>
  )
}
