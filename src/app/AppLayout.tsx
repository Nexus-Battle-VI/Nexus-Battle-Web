import { Outlet, useLocation } from 'react-router'

import { ECOMMERCE_PATH } from '@/routes/routes'

import { AppHeader } from './AppHeader'

export const AppLayout = (): React.JSX.Element => {
  const commerce = useLocation().pathname === ECOMMERCE_PATH
  return (
    <div className={commerce ? 'commerce-layout min-h-dvh' : 'min-h-dvh'}>
      <AppHeader variant="authenticated" />

      <main
        className={
          commerce ? 'commerce-main mx-auto w-full px-4 py-3' : 'mx-auto max-w-6xl px-4 py-8'
        }
      >
        <Outlet />
      </main>
    </div>
  )
}
