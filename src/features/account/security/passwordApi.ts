import { httpClient } from '@/lib/http'

/**
 * Cambio de contrasena de la cuenta propia (HU-05.4).
 *
 * Endpoint REAL: `POST /api/accounts/me/password` (Account, `password.controller.ts`).
 * Responde 204 sin cuerpo al cambiarla; 400 si la actual no es correcta o la
 * nueva no cumple la politica del proveedor; 401 sin testimonio; 503 si el
 * proveedor de identidad no responde.
 *
 * La contrasena NO pertenece a Account: la ruta actua sobre el testimonio de
 * acceso, igual que la inscripcion TOTP. No se persiste, no se registra y no se
 * devuelve; aqui tampoco se guarda en ningun estado -los campos se limpian tras
 * el exito en la pantalla-.
 */

export interface ChangePasswordInput {
  readonly currentPassword: string
  readonly newPassword: string
}

export const changeOwnPassword = async (input: ChangePasswordInput): Promise<void> => {
  await httpClient.post('/accounts/me/password', {
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
  })
}
