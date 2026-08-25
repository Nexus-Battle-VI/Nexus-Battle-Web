import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { Card } from '@/components/ui/Card'
import { authConfig } from '@/shared/auth/config'
import { exchangeCodeForTokens, readIdentityClaims } from '@/shared/auth/oidc'
import { takePendingAuthorization } from '@/shared/auth/pkce'
import { useSession } from '@/shared/session'

type CallbackState = 'working' | 'failed'

/**
 * Cierre del flujo de codigo de autorizacion.
 *
 * El proveedor devuelve aqui con un codigo de un solo uso. Esta pantalla lo
 * canjea por tokens presentando el verificador de PKCE, que nunca salio de esta
 * pestana, y despues devuelve a la persona a donde estaba.
 */
export const AuthCallbackPage = (): React.JSX.Element => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const establish = useSession((state) => state.establish)
  const [state, setState] = useState<CallbackState>('working')
  const [detail, setDetail] = useState<string>('')

  // React monta dos veces en modo estricto. Sin esta guarda, el codigo se
  // canjearia dos veces y el segundo intento fallaria: es de un solo uso.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) {
      return
    }

    started.current = true

    const pending = takePendingAuthorization()
    const code = params.get('code')
    const returnedState = params.get('state')
    const providerError = params.get('error')

    const fail = (message: string): void => {
      setDetail(message)
      setState('failed')
    }

    if (providerError !== null) {
      fail('El proveedor de identidad rechazo el inicio de sesion.')

      return
    }

    if (pending === null || code === null) {
      fail('Esta direccion no corresponde a un inicio de sesion en curso.')

      return
    }

    // Sin esta comprobacion, alguien podria inducir a esta pestana a completar
    // un inicio de sesion que no pidio.
    //
    // Va ANTES de comprobar la configuracion a proposito: es una comprobacion de
    // seguridad, y una comprobacion de seguridad no debe depender de que el
    // despliegue este bien configurado.
    if (returnedState !== pending.state) {
      fail('La respuesta no corresponde a la peticion que hizo esta pestana.')

      return
    }

    if (authConfig === null) {
      fail('No hay proveedor de identidad configurado en esta compilacion.')

      return
    }

    void exchangeCodeForTokens(authConfig, code, pending.verifier)
      .then((tokens) => {
        const claims = readIdentityClaims(tokens.idToken)

        if (claims === null) {
          fail('El testimonio recibido no es utilizable.')

          return
        }

        establish(tokens, claims)
        void navigate(pending.returnTo, { replace: true })
      })
      .catch(() => {
        fail('No se pudo completar el inicio de sesion.')
      })
  }, [params, navigate, establish])

  if (state === 'working') {
    return (
      <Card title="Completando el inicio de sesion">
        <p className="text-sm text-muted">Verificando la respuesta del proveedor de identidad.</p>
      </Card>
    )
  }

  return (
    <Card title="No se pudo iniciar sesion">
      <p className="text-sm text-muted">{detail}</p>
    </Card>
  )
}
