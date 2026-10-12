import { create } from 'zustand'

import { HttpClient } from '@/lib/http'

/**
 * Sesion de "identidad restringida" para apelar una sancion (HU-42, §6).
 *
 * DELIBERADAMENTE SEPARADA de `shared/session.ts`. El token que emite
 * `POST /accounts/appeals/auth` NO es el testimonio de Cognito -Account lo
 * firma con su propio secreto (ver `AppealAccessTokenPort` del backend) y
 * ningun otro endpoint de este ni de otro servicio lo reconoce-. Mezclarlo
 * con `useSession` (aunque fuera solo en memoria, como ese store) arriesgaria
 * que algun componente lo tratara como una sesion normal y mostrara
 * inventario, comercio o combate a una cuenta suspendida o baneada. Mantener
 * el store y el cliente HTTP separados hace esa confusion imposible por
 * construccion, no solo por disciplina.
 *
 * En memoria unicamente, igual que `useSession`: recargar la pagina obliga a
 * autenticar de nuevo con la misma identidad restringida.
 */
export interface AppealSessionState {
  readonly appealToken: string | null
  readonly expiresAt: number | null
  establish: (appealToken: string, expiresInSeconds: number) => void
  clear: () => void
}

export const useAppealSession = create<AppealSessionState>((set) => ({
  appealToken: null,
  expiresAt: null,

  establish: (appealToken, expiresInSeconds) => {
    set({ appealToken, expiresAt: Date.now() + expiresInSeconds * 1000 })
  },

  clear: () => {
    set({ appealToken: null, expiresAt: null })
  },
}))

/** Mismo criterio que `currentAccessToken`: un token vencido nunca se envia. */
export const currentAppealAccessToken = (now: number = Date.now()): string | null => {
  const { appealToken, expiresAt } = useAppealSession.getState()

  if (appealToken === null) {
    return null
  }

  return expiresAt !== null && expiresAt <= now ? null : appealToken
}

/**
 * Cliente HTTP propio para la identidad restringida. Nunca el `httpClient`
 * compartido: ese resuelve el token de `useSession`, y aqui el token correcto
 * es el de apelacion.
 */
export const appealHttpClient = new HttpClient({
  tokenProvider: () => currentAppealAccessToken(),
})
