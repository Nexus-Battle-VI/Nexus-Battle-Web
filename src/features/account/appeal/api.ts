import { appealHttpClient } from '@/shared/appealSession'
import type { AppealResponse } from '@/features/admin/sanctions/api'

export interface AuthenticateForAppealInput {
  readonly identifier: string
  readonly password: string
}

export interface AppealAccessTokenResponse {
  readonly appealToken: string
  readonly expiresIn: number
}

/**
 * Identidad restringida (HU-42, §6): la misma contrasena que el login
 * normal, verificada por el mismo proveedor, pero SIN exigir que la cuenta
 * pueda autenticar -es decir, funciona precisamente cuando esta suspendida o
 * baneada-. Deliberadamente NO usa `httpClient`: esta llamada nunca debe
 * llevar (ni depender de) el testimonio de la sesion normal.
 */
export const authenticateForAppeal = (
  input: AuthenticateForAppealInput,
): Promise<AppealAccessTokenResponse> => appealHttpClient.post('/accounts/appeals/auth', input)

export interface SubmitAppealInput {
  readonly sanctionId: string
  readonly statement: string
}

export const submitAppeal = (input: SubmitAppealInput): Promise<AppealResponse> =>
  appealHttpClient.post('/accounts/me/appeals', input)

export const fetchMyAppeals = (signal?: AbortSignal): Promise<readonly AppealResponse[]> =>
  appealHttpClient.get('/accounts/me/appeals', signal)
