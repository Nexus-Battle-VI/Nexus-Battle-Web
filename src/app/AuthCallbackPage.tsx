import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'

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
  // Clave de traduccion del motivo, no el texto: asi cambia con el idioma.
  const [detail, setDetail] = useState<string>('')
  const { t } = useTranslation()

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
      fail('app:callback.providerRejected')

      return
    }

    if (pending === null || code === null) {
      fail('app:callback.notInProgress')

      return
    }

    // Sin esta comprobacion, alguien podria inducir a esta pestana a completar
    // un inicio de sesion que no pidio.
    //
    // Va ANTES de comprobar la configuracion a proposito: es una comprobacion de
    // seguridad, y una comprobacion de seguridad no debe depender de que el
    // despliegue este bien configurado.
    if (returnedState !== pending.state) {
      fail('app:callback.stateMismatch')

      return
    }

    if (authConfig === null) {
      fail('app:callback.notConfigured')

      return
    }

    void exchangeCodeForTokens(authConfig, code, pending.verifier)
      .then((tokens) => {
        const claims = readIdentityClaims(tokens.idToken)

        if (claims === null) {
          fail('app:callback.unusableToken')

          return
        }

        establish(tokens, claims)
        void navigate(pending.returnTo, { replace: true })
      })
      .catch(() => {
        fail('app:callback.failed')
      })
  }, [params, navigate, establish])

  if (state === 'working') {
    return (
      <Card title={t('app:callback.working')}>
        <p className="text-sm text-muted">{t('app:callback.verifying')}</p>
      </Card>
    )
  }

  return (
    <Card title={t('app:callback.failedTitle')}>
      <p className="text-sm text-muted">{t(detail)}</p>
    </Card>
  )
}
