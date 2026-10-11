import { useState } from 'react'

import { RegistrationPage } from '@/features/account/registration/RegistrationPage'
import type { LoginOutcome } from '@/features/auth/login/api'
import { LoginPage } from '@/features/auth/login/LoginPage'
import { RecoveryPage } from '@/features/auth/recovery/RecoveryPage'
import { HttpError } from '@/lib/http'

/**
 * Vista previa de desarrollo del remaster de Autenticacion (EN-031).
 *
 * NO ES UNA PANTALLA DEL PRODUCTO. Monta las paginas REALES (Login, Registro,
 * Recuperacion) con transportes de ejemplo inyectados por sus props, sin red
 * ni cuentas: se pueden recorrer todas las etapas en local.
 *
 * - Login: un identificador con «totp» pide el codigo; con «elegir», la
 *   eleccion de factor; cualquier otro responde credenciales invalidas. El
 *   codigo siempre se rechaza, para ver el error de esa etapa.
 * - Registro: el alta y la confirmacion se aceptan.
 * - Recuperacion: cada paso se acepta, con dos preguntas de ejemplo.
 *
 * Vive en `routes/` y no en una feature porque compone pantallas de dos
 * (`auth` y `account`), y una feature no importa de otra. Solo se alcanza con
 * `import.meta.env.DEV` (ver `./dev-routes.tsx`).
 */
type Screen = 'login' | 'register' | 'recover'

const SCREENS: readonly { readonly id: Screen; readonly label: string }[] = [
  { id: 'login', label: 'Login' },
  { id: 'register', label: 'Registro' },
  { id: 'recover', label: 'Recuperación' },
]

const later = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => {
    window.setTimeout(() => {
      resolve(value)
    }, 500)
  })

const rejectLater = (): Promise<never> =>
  new Promise((_, reject) => {
    window.setTimeout(() => {
      reject(new HttpError(401, 'credenciales de vista previa', null))
    }, 500)
  })

const previewLogin = ({ identifier }: { readonly identifier: string }): Promise<LoginOutcome> => {
  if (identifier.includes('totp')) {
    return later({
      status: 'SECOND_FACTOR_REQUIRED',
      challengeToken: 'reto-vista-previa',
      secondFactorMethod: 'AUTHENTICATOR_APP',
    })
  }
  if (identifier.includes('elegir')) {
    return later({
      status: 'SECOND_FACTOR_SELECTION_REQUIRED',
      challengeToken: 'reto-vista-previa',
      availableSecondFactors: ['AUTHENTICATOR_APP', 'EMAIL'],
    })
  }
  return rejectLater()
}

export const AuthRemasterPreview = (): React.JSX.Element => {
  const [screen, setScreen] = useState<Screen>('login')

  return (
    <>
      <nav className="fixed bottom-2 left-2 z-50 flex gap-2 rounded-full border border-border bg-surface-raised px-3 py-1 text-xs shadow-lg">
        <strong className="text-ink">Vista previa EN-031</strong>
        {SCREENS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={screen === item.id}
            className="text-brand underline aria-pressed:font-bold"
            onClick={() => {
              setScreen(item.id)
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {screen === 'login' && (
        <LoginPage
          key="login"
          loginFn={previewLogin}
          chooseSecondFactorFn={(_identifier, _token, method) =>
            later({
              status: 'SECOND_FACTOR_REQUIRED',
              challengeToken: 'reto-vista-previa',
              secondFactorMethod: method,
            })
          }
          completeSecondFactorFn={rejectLater}
        />
      )}
      {screen === 'register' && (
        <RegistrationPage
          key="register"
          onSubmit={() => later(undefined)}
          onConfirm={() => later(undefined)}
        />
      )}
      {screen === 'recover' && (
        <RecoveryPage
          key="recover"
          startRecoveryFn={() =>
            later({
              challengeToken: 'reto-vista-previa',
              questions: [
                { id: 'first-pet', statement: '¿Cuál era el nombre de tu primera mascota?' },
                { id: 'birth-city', statement: '¿Cuál es el nombre de la ciudad donde naciste?' },
              ],
            })
          }
          verifyAnswersFn={() => later(undefined)}
          verifyCodeFn={() => later(undefined)}
          resetPasswordFn={() => later(undefined)}
        />
      )}
    </>
  )
}
