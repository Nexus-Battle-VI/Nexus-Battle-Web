import { Link, matchPath, useLocation } from 'react-router'

import { PrimaryNav } from './PrimaryNav'
import { SessionControl } from './SessionControl'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { ACCOUNT_PATH, ECOMMERCE_PATH } from '@/routes/routes'

/**
 * Encabezado global (HU-05.4).
 *
 * Consolida la cabecera que antes vivia duplicada en `AppLayout` y en
 * `LandingPage`. Una sola implementacion para escritorio y movil: la
 * adaptacion es puramente CSS (flex-wrap + scroll horizontal interno de la
 * navegacion), sin un segundo arbol de componentes.
 *
 * - `authenticated`: marca + navegacion + control de sesion + conmutador de tema.
 * - `public` (menu de bienvenida): marca + navegacion + conmutador de tema.
 *
 * La marca es el logotipo existente (`public/assets/logo.png`) a tamano
 * reducido, con nombre accesible y foco visible; en el shell autenticado enlaza
 * a `/ecommerce`.
 *
 * El conmutador de tema se OCULTA dentro del area "Mi cuenta" (`/account` y
 * cualquier descendiente): alli el control vivira en "Preferencias" y mostrar
 * los dos seria redundante. Se oculta solo el control; el sistema de tema
 * (`@/shared/theme`) sigue montado y la preferencia aplicada.
 */

const LOGO_SRC = '/assets/logo.png'

export interface AppHeaderProps {
  readonly variant: 'authenticated' | 'public'
}

export const AppHeader = ({ variant }: AppHeaderProps): React.JSX.Element => {
  const { pathname } = useLocation()
  const brandTarget = variant === 'authenticated' ? ECOMMERCE_PATH : '/'

  // `end: false` hace que coincida `/account` y `/account/<lo-que-sea>` sin
  // enumerar cada hijo futuro.
  const inAccountArea = matchPath({ path: ACCOUNT_PATH, end: false }, pathname) !== null

  return (
    <header className="border-b border-border bg-surface-raised/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          to={brandTarget}
          className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <img
            src={LOGO_SRC}
            alt="Nexus Battles VI"
            width={1600}
            height={600}
            className="h-8 w-auto"
          />
        </Link>

        <PrimaryNav className="order-3 w-full min-w-0 sm:order-none sm:w-auto sm:flex-1" />

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {variant === 'authenticated' && <SessionControl />}
          {!inAccountArea && <ThemeToggle />}
        </div>
      </div>
    </header>
  )
}
