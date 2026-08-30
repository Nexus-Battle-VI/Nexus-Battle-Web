import { Outlet } from 'react-router'

import { PrimaryNav } from './PrimaryNav'
import { SessionControl } from './SessionControl'

export const AppLayout = (): React.JSX.Element => (
  <div className="min-h-dvh">
    <header className="border-b border-border bg-surface-raised">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4">
        <p className="text-base font-semibold text-ink">Nexus Battles VI</p>
        <PrimaryNav />
        <SessionControl />
      </div>
    </header>

    <main className="mx-auto max-w-5xl px-4 py-8">
      <Outlet />
    </main>
  </div>
)
