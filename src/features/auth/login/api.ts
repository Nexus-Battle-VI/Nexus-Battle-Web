import { httpClient } from '@/lib/http'

/**
 * Capa de transporte del login de credenciales (HU-02).
 *
 * Contrato REAL, publicado por `Nexus-Battle-Account` en su rama
 * `feat/hu-02-autenticacion-rbac` (`src/adapters/inbound/http/sessions.controller.ts`
 * y `sessions.dto.ts`):
 *
 *   POST /sessions               { identifier, password }
 *   POST /sessions/second-factor { identifier, challengeToken, code }
 *
 * Ambas devuelven `{ status: 'AUTHENTICATED' | 'SECOND_FACTOR_REQUIRED', ... }`.
 * Los nombres de aqui (`AUTHENTICATED`, `SECOND_FACTOR_REQUIRED`,
 * `challengeToken`) son los que usa Account, no una traduccion local: HU-02
 * pidio explicitamente no mantener dos vocabularios en paralelo.
 *
 * Las credenciales invalidas y el segundo factor invalido NO llegan como un
 * valor de `status`: Account los senaliza con `401` (`UnauthorizedException`)
 * y un proveedor caido con `503`. Por eso esta capa no modela un tercer
 * estado "rechazado" en `LoginOutcome`: ambas funciones rechazan la promesa en
 * esos casos, y quien llama (`LoginPage`) distingue por `HttpError.status`.
 */

export type Role = string

/** Canales de segundo factor que Account sabe anunciar. */
export type SecondFactorMethod = 'AUTHENTICATOR_APP' | 'EMAIL' | 'SMS'

export interface AuthenticatedSession {
  readonly subject: string
  readonly email: string
  readonly displayName: string
  readonly roles: readonly Role[]
  readonly accessToken: string
  readonly expiresAt: number
}

export type LoginOutcome =
  | { readonly status: 'AUTHENTICATED'; readonly session: AuthenticatedSession }
  | {
      readonly status: 'SECOND_FACTOR_REQUIRED'
      readonly challengeToken: string
      /**
       * Donde hay que mirar. Lo declara Account; NO se deduce del
       * `challengeToken`, que es opaco a proposito.
       *
       * Opcional porque un Account anterior a este contrato no lo envia. En ese
       * caso la interfaz no inventa un canal: dice lo que sabe y calla lo que
       * no.
       */
      readonly secondFactorMethod?: SecondFactorMethod
    }

export interface LoginCredentials {
  readonly identifier: string
  readonly password: string
}

/**
 * `id` es el UUID interno del bounded context Account. `subject` es el
 * identificador estable del proveedor de identidad (Cognito `sub`). Son dos
 * datos distintos que nunca deben conflate-arse: `id` no sirve como
 * identidad de sesion, `subject` no sirve para llamar de vuelta a Account.
 */
interface AccountSummaryResponse {
  readonly id: string
  readonly subject: string
  readonly email: string
  readonly displayName: string
  readonly roles: readonly string[]
}

/** Forma exacta de `SessionResponse` (`sessions.dto.ts`). */
interface SessionResponse {
  readonly status: 'AUTHENTICATED' | 'SECOND_FACTOR_REQUIRED'
  readonly accessToken?: string
  /** Vigencia del `accessToken`, en segundos, desde Cognito. Solo presente junto a `AUTHENTICATED`. */
  readonly expiresIn?: number
  readonly account?: AccountSummaryResponse
  readonly challengeToken?: string
  readonly secondFactorMethod?: SecondFactorMethod
}

/**
 * Traduce la respuesta HTTP al `LoginOutcome` que consume la pantalla.
 *
 * Los `throw` de aqui son una salvaguarda, no una regla de negocio: si
 * Account respondiera 200 con `status: AUTHENTICATED` pero sin `account`,
 * `accessToken` o `expiresIn` -incumpliendo su propio contrato-, es mejor
 * fallar con un mensaje claro que construir una sesion a medias.
 *
 * El `subject` de la sesion es `account.subject` (el `sub` de Cognito), nunca
 * `account.id` (el UUID interno de Account): son identificadores distintos
 * con proposito distinto, y esta funcion es el unico lugar que traduce entre
 * el contrato HTTP y `AuthenticatedSession`.
 */
const toLoginOutcome = (response: SessionResponse): LoginOutcome => {
  if (response.status === 'AUTHENTICATED') {
    if (
      response.accessToken === undefined ||
      response.account === undefined ||
      response.expiresIn === undefined
    ) {
      throw new Error('La respuesta de autenticación no trae los datos esperados.')
    }

    return {
      status: 'AUTHENTICATED',
      session: {
        subject: response.account.subject,
        email: response.account.email,
        displayName: response.account.displayName,
        roles: response.account.roles,
        accessToken: response.accessToken,
        expiresAt: Date.now() + response.expiresIn * 1000,
      },
    }
  }

  if (response.challengeToken === undefined) {
    throw new Error('La respuesta de segundo factor no trae el challengeToken esperado.')
  }

  return {
    status: 'SECOND_FACTOR_REQUIRED',
    challengeToken: response.challengeToken,
    // Se propaga sin normalizar ni suponer: si Account no lo envia, la pantalla
    // dira que hay un segundo factor sin nombrar un canal. Antes nombraba el
    // correo siempre, y el correo no se enviaba nunca.
    ...(response.secondFactorMethod === undefined
      ? {}
      : { secondFactorMethod: response.secondFactorMethod }),
  }
}

/** Autentica con correo/apodo y contrasena. */
export const login = async (credentials: LoginCredentials): Promise<LoginOutcome> => {
  const response = await httpClient.post<SessionResponse>('/sessions', credentials)

  return toLoginOutcome(response)
}

/** Completa el segundo factor administrativo con el `challengeToken` del login. */
export const completeSecondFactor = async (
  identifier: string,
  challengeToken: string,
  code: string,
): Promise<LoginOutcome> => {
  const response = await httpClient.post<SessionResponse>('/sessions/second-factor', {
    identifier,
    challengeToken,
    code,
  })

  return toLoginOutcome(response)
}
