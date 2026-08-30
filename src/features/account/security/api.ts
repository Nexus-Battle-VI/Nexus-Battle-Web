import { httpClient } from '@/lib/http'

/**
 * Inscripcion del segundo factor TOTP contra Account
 * (`POST /api/accounts/mfa/totp` y `.../verification`).
 *
 * El testimonio de la sesion viaja solo: `httpClient` lo adjunta como Bearer.
 * Por eso estas funciones no reciben ni conocen el token -inscribir el TOTP es
 * una operacion sobre la propia sesion vigente, no sobre un dato del formulario-.
 */

export interface TotpAssociation {
  /** URI `otpauth://` para el QR. Contiene el secreto: es una credencial. */
  readonly otpauthUri: string
  /** Clave base32 para introducir a mano si no se escanea el QR. */
  readonly secret: string
}

export const enrollTotp = async (): Promise<TotpAssociation> =>
  httpClient.post<TotpAssociation>('/accounts/mfa/totp')

export const confirmTotp = async (code: string): Promise<void> => {
  await httpClient.post('/accounts/mfa/totp/verification', { code })
}
