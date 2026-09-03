import { httpClient, type HttpDownload } from '@/lib/http'

/**
 * Transporte de la cuenta propia contra Account (HU-05.4).
 *
 * Endpoints REALES (Nexus-Battle-Account, `accounts.controller.ts`):
 * - `GET   /api/accounts/me`  -> la cuenta asociada al testimonio.
 * - `GET   /api/accounts/me/privacy` -> proyeccion de datos personales HU-45.
 * - `PATCH /api/accounts/me`  -> actualiza la informacion personal editable.
 *
 * El testimonio viaja solo: `httpClient` lo adjunta como Bearer. Estas funciones
 * no reciben ni conocen el token -operan sobre la sesion vigente, no sobre un
 * dato del formulario-, igual que la inscripcion TOTP y el cambio de contrasena.
 */

/** Estados que declara el contrato (`AccountResponse.status`). */
export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED'

/**
 * Forma exacta de `AccountResponse`. Solo `displayName` es editable por
 * `PATCH /accounts/me`; el resto es de solo lectura self-service (el correo, los
 * nombres y el estado cambian por otras vias; los roles, por gestion de roles).
 */
export interface OwnAccount {
  readonly id: string
  readonly email: string
  readonly displayName: string
  readonly firstNames: string
  readonly lastNames: string
  /** Uno de los tres estados del contrato; se muestra siempre via `statusLabel`. */
  readonly status: AccountStatus
  readonly roles: readonly string[]
}

export const fetchOwnAccount = async (signal?: AbortSignal): Promise<OwnAccount> =>
  httpClient.get<OwnAccount>('/accounts/me', signal)

/**
 * Proyeccion autorizada para el portal de privacidad (HU-45.4).
 *
 * No es `AccountResponse`: excluye identificadores tecnicos, estado, avatar y
 * cualquier dato de autenticacion. La identidad del titular la resuelve Account
 * desde el testimonio que adjunta `httpClient`.
 */
export interface OwnPersonalData {
  readonly email: string
  readonly displayName: string
  readonly firstNames: string
  readonly lastNames: string
  readonly roles: readonly string[]
  readonly termsAccepted: boolean
}

export const fetchOwnPersonalData = async (signal?: AbortSignal): Promise<OwnPersonalData> =>
  httpClient.get<OwnPersonalData>('/accounts/me/privacy', signal)

export type PrivacyExportFormat = 'json' | 'xml' | 'pdf'

const PRIVACY_EXPORT_FALLBACKS: Readonly<Record<PrivacyExportFormat, string>> = {
  json: 'nexus-battles-personal-data.json',
  xml: 'nexus-battles-personal-data.xml',
  pdf: 'nexus-battles-privacy-report.pdf',
}

/**
 * Descarga la exportacion producida por Account. El titular procede
 * exclusivamente del testimonio que adjunta `httpClient`; la Web solo elige
 * el formato y nunca construye el contenido en el navegador.
 */
export const downloadOwnPersonalData = (
  format: PrivacyExportFormat,
  signal?: AbortSignal,
): Promise<HttpDownload> =>
  httpClient.download(`/accounts/me/privacy/export?format=${format}`, signal)

/** Guarda temporalmente el Blob y libera siempre la Object URL al terminar. */
export const saveOwnPersonalDataDownload = (
  file: HttpDownload,
  format: PrivacyExportFormat,
): void => {
  const url = URL.createObjectURL(file.content)
  const anchor = document.createElement('a')

  try {
    anchor.href = url
    anchor.download = file.filename ?? PRIVACY_EXPORT_FALLBACKS[format]
    anchor.hidden = true
    document.body.append(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    URL.revokeObjectURL(url)
  }
}

/**
 * Campos editables por el contrato `UpdateOwnAccountRequest`. Hoy es solo el
 * apodo (`displayName`); cualquier otro campo hace que Account responda 400
 * (`forbidNonWhitelisted`). Se declara como interfaz -y no como `string` suelto-
 * para que ampliar el contrato del backend sea un cambio localizado aqui.
 */
export interface OwnAccountEdit {
  readonly displayName: string
}

export const updateOwnAccount = async (edit: OwnAccountEdit): Promise<OwnAccount> =>
  httpClient.patch<OwnAccount>('/accounts/me', { displayName: edit.displayName })

/**
 * Validacion de FORMA del apodo, para dar respuesta inmediata sin ida y vuelta.
 * Reproduce la del value object `DisplayName` de Account (entre 3 y 32, sin
 * delimitadores en los extremos), pero la AUTORIDAD sigue siendo el servicio:
 * un apodo reservado u ofensivo solo lo sabe su lista negra, y llega como 400.
 */
export const DISPLAY_NAME_MIN_LENGTH = 3
export const DISPLAY_NAME_MAX_LENGTH = 32

const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N} _.-]*[\p{L}\p{N}])?$/u

export const validateDisplayName = (raw: string): string | null => {
  const normalized = raw.trim().replace(/\s+/gu, ' ')

  if (normalized.length < DISPLAY_NAME_MIN_LENGTH || normalized.length > DISPLAY_NAME_MAX_LENGTH) {
    return `El apodo debe tener entre ${String(DISPLAY_NAME_MIN_LENGTH)} y ${String(
      DISPLAY_NAME_MAX_LENGTH,
    )} caracteres.`
  }

  if (!DISPLAY_NAME_PATTERN.test(normalized)) {
    return 'El apodo no admite simbolos ni espacios al principio o al final.'
  }

  return null
}
