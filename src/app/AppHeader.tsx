import { Link, matchPath, useLocation } from 'react-router'

import { CreditsBadge } from './CreditsBadge'
import { NotificationBell } from './NotificationBell'
import { MobileNavDrawer } from './MobileNavDrawer'
import { PendingClaimsBadge } from './PendingClaimsBadge'
import { PrimaryNav } from './PrimaryNav'
import { SessionControl } from './SessionControl'
import { SoundToggle } from '@/components/shell/SoundToggle'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import './shell.css'
import { ACCOUNT_PATH, ECOMMERCE_PATH } from '@/routes/routes'

/**
 * Encabezado global (HU-05.4).
 *
 * Unica implementacion, con o sin sesion: marca + navegacion + control de
 * sesion + campana de notificaciones y creditos (solo con sesion,
 * `NotificationBell` y `CreditsBadge`) + conmutador de tema. E-commerce es el punto de entrada tanto para
 * quien visita sin cuenta como para quien ya inicio sesion (ver `routes.tsx`
 * y `AppLayout`), asi que ya no hace falta una variante "publica" distinta;
 * `SessionControl` decide por su cuenta que mostrar segun haya o no sesion.
 *
 * La marca es el logotipo existente (`public/assets/logo.png`) a tamano
 * reducido, con nombre accesible y foco visible, y enlaza a `/ecommerce`.
 *
 * El conmutador de tema se OCULTA dentro del area "Mi cuenta" (`/account` y
 * cualquier descendiente): alli el control vivira en "Preferencias" y mostrar
 * los dos seria redundante. Se oculta solo el control; el sistema de tema
 * (`@/shared/theme`) sigue montado y la preferencia aplicada.
 */

const LOGO_SRC = '/assets/logo.png'

export const AppHeader = (): React.JSX.Element => {
  const { pathname } = useLocation()

  // `end: false` hace que coincida `/account` y `/account/<lo-que-sea>` sin
  // enumerar cada hijo futuro.
  const inAccountArea = matchPath({ path: ACCOUNT_PATH, end: false }, pathname) !== null

  return (
    // `relative z-50`: `backdrop-blur` crea su propio contexto de apilamiento
    // en el <header>. Sin un z-index explicito aqui, ese contexto entero -el
    // menu desplegable de "Mi cuenta" incluido, aunque el menu declare su
    // propio z-50- pinta segun el orden del DOM frente a <main>, que llega
    // despues y por tanto queda ENCIMA. En la vitrina de e-commerce (grid de
    // tarjetas) eso tapaba visualmente el menu abierto.
    <header className="nb-banner relative z-50 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <MobileNavDrawer />

        <Link
          to={ECOMMERCE_PATH}
          className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <img
            src={LOGO_SRC}
            alt="Nexus Battles VI"
            width={1600}
            height={600}
            className="nb-logo-glow h-8 w-auto"
          />
        </Link>

        {/* EN-031: por debajo de `sm` la navegacion vive en `MobileNavDrawer`. */}
        <PrimaryNav className="min-w-0 max-sm:hidden sm:flex-1" />

        <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
          <SessionControl />
          <NotificationBell />
          <PendingClaimsBadge />
          <CreditsBadge />
          {!inAccountArea && <ThemeToggle />}
          {!inAccountArea && <SoundToggle />}
        </div>
      </div>
    </header>
  )
}
