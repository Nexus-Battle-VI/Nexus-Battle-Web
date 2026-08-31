import { Outlet } from 'react-router'

import { AppHeader } from './AppHeader'

export const AppLayout = (): React.JSX.Element => (
  <div className="min-h-dvh">
    <AppHeader variant="authenticated" />

    <main className="mx-auto max-w-6xl px-4 py-8">
      <Outlet />
    </main>
  </div>
)
