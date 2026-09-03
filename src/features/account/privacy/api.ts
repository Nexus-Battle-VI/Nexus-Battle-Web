import { httpClient } from '@/lib/http'

/**
 * Solicitud de eliminacion de la cuenta propia contra Account
 * (`POST /api/accounts/me/deletion-requests`, HU-43.2).
 *
 * Sin cuerpo: la identidad del titular la resuelve Account desde el
 * testimonio que adjunta `httpClient`, igual que la inscripcion TOTP y el
 * cambio de contrasena. Esta funcion no recibe ni construye ningun
 * identificador de cuenta.
 *
 * La respuesta es idempotente: repetir la peticion mientras ya hay una
 * solicitud activa devuelve la MISMA solicitud (200), no un error.
 */

/** Estados que declara el contrato (`AccountDeletionRequestResponse.status`). */
export type AccountDeletionRequestStatus = 'RECEIVED' | 'IN_PROGRESS' | 'FAILED' | 'CLOSED'

export interface AccountDeletionRequest {
  readonly id: string
  readonly status: AccountDeletionRequestStatus
  readonly receivedAt: string
}

export const requestOwnAccountDeletion = async (): Promise<AccountDeletionRequest> =>
  httpClient.post<AccountDeletionRequest>('/accounts/me/deletion-requests')
