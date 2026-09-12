import { useEffect, useRef, useState } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router'

import { refreshSession } from '@/features/auth/login/api'
import { useSession } from '@/shared/session'
import { routes } from '@/routes/routes'
import { SessionQueryProvider } from './SessionQueryProvider'

const router = createBrowserRouter(routes)

export const App = (): React.JSX.Element => {
  const subject = useSession((state) => state.subject)
  const authenticationAvailable = useSession((state) => state.authenticationAvailable)
  const establishSession = useSession((state) => state.establishSession)
  const [bootstrapping, setBootstrapping] = useState(authenticationAvailable)
  /**
   * Sin esta guarda, el doble montaje de React StrictMode en desarrollo
   * dispararia dos `POST /sessions/refresh` -inofensivo, pero ruidoso- y
   * podria dejar la cookie renovandose dos veces en paralelo.
   */
  const attempted = useRef(false)

  useEffect(() => {
    // Sin proveedor configurado no hay sesion posible (vease
    // `authenticationAvailable` en `shared/session.ts`): pedir la renovacion
    // igual seria una peticion de red que nunca puede tener exito.
    if (!authenticationAvailable || attempted.current) {
      return
    }

    attempted.current = true

    void refreshSession()
      .then((session) => {
        if (session !== null) {
          establishSession(session)
        }
      })
      .finally(() => {
        setBootstrapping(false)
      })
  }, [authenticationAvailable, establishSession])

  // Mientras se intenta restablecer la sesion, no se monta el enrutador: sin
  // esta espera, `RequireSession` vería "sin sesion" durante ese instante y
  // mandaria a `/login` a alguien que en realidad seguia autenticado.
  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p role="status" className="text-sm text-muted">
          Cargando...
        </p>
      </div>
    )
  }

  return (
    <SessionQueryProvider key={subject ?? 'signed-out'}>
      <RouterProvider router={router} />
    </SessionQueryProvider>
  )
}
