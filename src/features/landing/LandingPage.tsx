import { Link } from 'react-router'

import { NexusBrandHeader } from '@/components/ui/NexusBrandHeader'
import { AppHeader } from '@/app/AppHeader'

const CTA_CLASS =
  'inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

/**
 * Punto de entrada publico: el menu de Nexus Battles VI, no un formulario.
 *
 * El encabezado (`AppHeader variant="public"`) es EL MISMO que usa el shell
 * autenticado: un visitante ya ve los destinos reales del producto y el
 * conmutador de tema global. Pulsar un modulo sin sesion no navega a la
 * funcionalidad privada -eso seguiria siendo responsabilidad de cada servicio si
 * alguien se lo saltara- sino que `RequireSession` muestra ahi mismo el aviso
 * "Para continuar" en lugar del contenido, sin sacar a la persona del menu.
 */
export const LandingPage = (): React.JSX.Element => (
  <div className="flex min-h-dvh flex-col text-ink">
    <AppHeader variant="public" />

    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-10 text-center">
      <NexusBrandHeader />

      <h1 className="mt-8 text-2xl font-semibold text-ink">Bienvenido al universo Nexus</h1>
      <p className="mt-2 max-w-md text-sm text-muted">Selecciona una opción para comenzar.</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/login" className={`${CTA_CLASS} bg-brand text-brand-ink`}>
          Iniciar sesión
        </Link>
        <Link
          to="/register"
          className={`${CTA_CLASS} border border-border bg-surface-raised text-ink`}
        >
          Crear cuenta
        </Link>
      </div>

      <p className="mt-6 text-xs text-muted">Algunos módulos estarán disponibles próximamente.</p>
    </main>
  </div>
)
