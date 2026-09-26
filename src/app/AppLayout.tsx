import { Outlet, useLocation } from 'react-router'

import { MissionFinishedNotice } from '@/features/missions/MissionFinishedNotice'
import { ECOMMERCE_PATH } from '@/routes/routes'

import { AppHeader } from './AppHeader'

export const AppLayout = (): React.JSX.Element => {
  const { pathname } = useLocation()
  const commerce = pathname === ECOMMERCE_PATH
  // "Mi Inventario" usa el mismo ancho maximo que la cabecera (7xl): su
  // composicion 2×2 necesita el espacio horizontal que el resto no usa.
  const wide = pathname === '/inventory'
  return (
    <div className={commerce ? 'commerce-layout min-h-dvh' : 'min-h-dvh'}>
      <AppHeader />

      <main
        className={
          commerce
            ? 'commerce-main mx-auto w-full px-4 py-3'
            : wide
              ? 'mx-auto max-w-7xl px-4 py-8'
              : 'mx-auto max-w-6xl px-4 py-8'
        }
      >
        <Outlet />
      </main>
      <MissionFinishedNotice />
    </div>
  )
}
