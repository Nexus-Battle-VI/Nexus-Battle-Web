import { Outlet, useLocation } from 'react-router'

import { ChatWidget } from '@/features/chat/ChatWidget'
import { MissionFinishedNotice } from '@/features/missions/MissionFinishedNotice'
import { ECOMMERCE_PATH } from '@/routes/routes'

import { AppHeader } from './AppHeader'

export const AppLayout = (): React.JSX.Element => {
  const { pathname } = useLocation()
  const commerce = pathname === ECOMMERCE_PATH
  // "Mi Inventario" usa el mismo ancho maximo que la cabecera (7xl): su
  // composicion 2×2 necesita el espacio horizontal que el resto no usa.
  const wide = pathname === '/inventory'
  // "Jugar Online" (remaster visual Sprint 3): mismo criterio que Commerce
  // arriba -- el escenario Pixel Art (lobby/sala/batalla) necesita ocupar
  // todo el ancho disponible, sin el `padding`/`max-w-6xl` que lo encajonaba
  // dentro de un recuadro central. `/play` cubre el lobby y, por prefijo,
  // toda sala/batalla (`/play/rooms/...`).
  const play = pathname === '/play' || pathname.startsWith('/play/')
  // "Mi Cuenta" (remaster visual Sprint 3): mismo criterio que Commerce/Play
  // arriba -- el escenario a sangre completa (Guardian's Lodge / Royal
  // Archive) necesita ocupar todo el ancho disponible. `/account` cubre el
  // shell y, por prefijo, cada seccion hija (`/account/security`, etc.).
  const account = pathname === '/account' || pathname.startsWith('/account/')
  return (
    <div className={commerce ? 'commerce-layout min-h-dvh' : 'min-h-dvh'}>
      <AppHeader />

      <main
        className={
          commerce
            ? 'commerce-main mx-auto w-full px-4 py-3'
            : play
              ? 'br-main mx-auto w-full px-3 py-4 sm:px-4'
              : account
                ? 'account-main mx-auto w-full px-3 py-4 sm:px-4'
                : wide
                  ? 'mx-auto max-w-7xl px-4 py-8'
                  : 'mx-auto max-w-6xl px-4 py-8'
        }
      >
        <Outlet />
      </main>
      <MissionFinishedNotice />
      <ChatWidget />
    </div>
  )
}
