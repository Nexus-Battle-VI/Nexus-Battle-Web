/**
 * Capa de transporte del login de credenciales (HU-02).
 *
 * **El contrato no existe todavia.** Se verifico el estado real de
 * `Nexus-Battle-Account` antes de escribir este modulo: su rama
 * `feature/HU-02-login-rbac` es identica a `main` (`gh api
 * repos/Nexus-Battle-VI/Nexus-Battle-Account/compare/main...feature/HU-02-login-rbac`
 * -> `status: identical`, `total_commits: 0`). No hay operacion de
 * autenticacion, ni de segundo factor, ni forma de respuesta definida.
 *
 * Inventar aqui una ruta, un metodo o una forma de payload produciria una
 * pantalla que parece terminada y que fallaria el dia que el contrato real
 * exista con una forma distinta. Por eso esta capa declara el LIMITE en lugar
 * de simularlo: la pantalla esta completa y probada mediante inyeccion de
 * dependencias (ver `LoginPage`), y lo unico pendiente es sustituir estas dos
 * funciones por la peticion real cuando `TASK HU-02.1` la publique.
 */

export type Role = string

export interface AuthenticatedSession {
  readonly subject: string
  readonly email: string | null
  readonly displayName: string | null
  readonly roles: readonly Role[]
  readonly accessToken: string
  readonly expiresAt: number
}

/**
 * Reto de segundo factor devuelto para una cuenta Administrador/Super
 * Administrador cuyas credenciales fueron correctas.
 *
 * Solo transporta lo indispensable para poder verificar el codigo despues:
 * ningun dato del reto (vigencia, longitud del codigo, intentos restantes) se
 * modela aqui porque HU-02 no lo ha definido formalmente todavia (ver
 * `TASK HU-02.2`, seccion 3).
 */
export interface MfaChallenge {
  readonly challengeId: string
}

/**
 * Resultado de intentar autenticar o de verificar el segundo factor.
 *
 * Modela conceptualmente los tres estados que describe HU-02
 * (`AUTHENTICATED`, `MFA_REQUIRED`, `INVALID_CREDENTIALS`) sin comprometerse
 * con los nombres literales que el contrato real vaya a usar: son los nombres
 * que emplea esta HU para describir el flujo, no un valor recibido de ningun
 * servicio todavia.
 */
export type LoginOutcome =
  | { readonly status: 'AUTHENTICATED'; readonly session: AuthenticatedSession }
  | { readonly status: 'MFA_REQUIRED'; readonly challenge: MfaChallenge }
  | { readonly status: 'INVALID_CREDENTIALS' }

export interface LoginCredentials {
  readonly identifier: string
  readonly password: string
}

/** Error de una operacion cuyo contrato de servicio todavia no existe. */
export class MissingContractError extends Error {
  readonly operation: string

  constructor(operation: string, detail: string) {
    super(detail)
    this.name = 'MissingContractError'
    this.operation = operation
  }
}

const PENDING_LOGIN_CONTRACT =
  'El inicio de sesión no está disponible todavía: el servicio de cuenta aún no publica el contrato de autenticación de HU-02. No se enviaron credenciales a ningún servicio.'

const PENDING_MFA_CONTRACT =
  'La verificación del segundo factor no está disponible todavía: el servicio de cuenta aún no publica ese contrato.'

/**
 * Autentica con correo/apodo y contrasena.
 *
 * Cuando el contrato exista, esta funcion sera la que traduzca su respuesta a
 * `LoginOutcome`; distinguir aqui "credenciales invalidas" de "servicio
 * caido" tambien correspondera a esa traduccion (por ejemplo, un `HttpError`
 * 401 frente a un fallo de red u otro estado 5xx), no a esta version.
 */
export const login = (credentials: LoginCredentials): Promise<LoginOutcome> => {
  // Se acepta el parametro para que la firma ya coincida con la que se usara
  // cuando el contrato exista; no se envia a ningun sitio todavia.
  void credentials

  return Promise.reject(new MissingContractError('inicio de sesion', PENDING_LOGIN_CONTRACT))
}

/** Verifica el codigo de segundo factor de un reto ya emitido. */
export const verifyMfaCode = (challengeId: string, code: string): Promise<LoginOutcome> => {
  void challengeId
  void code

  return Promise.reject(
    new MissingContractError('verificacion de segundo factor', PENDING_MFA_CONTRACT),
  )
}
