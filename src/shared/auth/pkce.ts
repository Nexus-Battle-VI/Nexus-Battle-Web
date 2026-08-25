/**
 * PKCE — Proof Key for Code Exchange.
 *
 * Resuelve un problema concreto de las aplicaciones de navegador: el codigo de
 * autorizacion viaja por la barra de direcciones y puede ser interceptado. Con
 * PKCE ese codigo **no sirve de nada por si solo**: canjearlo exige presentar
 * el verificador original, que nunca sale de esta pestana.
 *
 * Es lo que sustituye al secreto de cliente, que en un navegador no puede
 * existir: cualquier cosa embebida en el paquete servido es publica.
 */

const encodeBase64Url = (bytes: Uint8Array): string => {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  // Alfabeto seguro en URL y sin relleno, como exige RFC 7636.
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Cadena aleatoria de alta entropia.
 *
 * Se usa `crypto.getRandomValues` y no `Math.random`: el segundo es predecible
 * y aqui la impredecibilidad es toda la proteccion.
 */
export const randomUrlSafeString = (bytes = 32, source: Crypto = globalThis.crypto): string =>
  encodeBase64Url(source.getRandomValues(new Uint8Array(bytes)))

/** Reto derivado del verificador mediante SHA-256, segun el metodo `S256`. */
export const deriveCodeChallenge = async (
  verifier: string,
  source: Crypto = globalThis.crypto,
): Promise<string> => {
  const digest = await source.subtle.digest('SHA-256', new TextEncoder().encode(verifier))

  return encodeBase64Url(new Uint8Array(digest))
}

/**
 * Almacen del material que debe sobrevivir a la redireccion.
 *
 * Va en `sessionStorage` y no en memoria porque la pagina se descarta al
 * navegar al proveedor. Es aceptable: el verificador **solo sirve una vez**,
 * caduca con la pestana y no vale de nada sin el codigo de autorizacion, que
 * viaja por otro camino. No es un token de acceso ni permite firmar nada.
 */
export interface PendingAuthorization {
  readonly verifier: string
  readonly state: string
  /** Ruta a la que volver una vez completado el inicio de sesion. */
  readonly returnTo: string
}

const STORAGE_KEY = 'nexus.auth.pending'

export const rememberPendingAuthorization = (
  pending: PendingAuthorization,
  storage: Storage = globalThis.sessionStorage,
): void => {
  storage.setItem(STORAGE_KEY, JSON.stringify(pending))
}

/**
 * Recupera y **descarta** el material pendiente.
 *
 * Se borra al leerlo para que un verificador no pueda reutilizarse: un intento
 * de canje repetido no encontrara nada con lo que firmarse.
 */
export const takePendingAuthorization = (
  storage: Storage = globalThis.sessionStorage,
): PendingAuthorization | null => {
  const raw = storage.getItem(STORAGE_KEY)
  storage.removeItem(STORAGE_KEY)

  if (raw === null) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PendingAuthorization>

    if (typeof parsed.verifier !== 'string' || typeof parsed.state !== 'string') {
      return null
    }

    return {
      verifier: parsed.verifier,
      state: parsed.state,
      returnTo: typeof parsed.returnTo === 'string' ? parsed.returnTo : '/',
    }
  } catch {
    return null
  }
}
