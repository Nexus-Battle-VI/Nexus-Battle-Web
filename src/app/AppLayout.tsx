import { NavLink, Outlet } from 'react-router'
import clsx from 'clsx'

import { NAVIGATION } from '@/routes/routes'

export const AppLayout = (): React.JSX.Element => (
  <div className="min-h-dvh">
    <header className="border-b border-border bg-surface-raised">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4">
        <p className="text-base font-semibold text-ink">Nexus Battles VI</p>
        <nav aria-label="Principal">
          <ul className="flex flex-wrap gap-1">
            {NAVIGATION.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    clsx(
                      'rounded-md px-3 py-1.5 text-sm transition-colors',
                      isActive ? 'bg-brand text-brand-ink' : 'text-muted hover:text-ink',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>

    <main className="mx-auto max-w-5xl px-4 py-8">
      <Outlet />
    </main>
  </div>
)
