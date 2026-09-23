import { HttpError, httpClient } from '@/lib/http'

/**
 * Cache de avatares descargados, compartida por todos los `<Avatar>`.
 *
 * El lobby y la batalla pintan el mismo jugador en varios sitios a la vez
 * (columna del equipo, tarjeta del combatiente, orden de turnos) y en un 3v3
 * son seis jugadores: sin esta cache cada `<Avatar>` descargaba su propia
 * copia. Aqui se comparte UNA descarga por ruta, en vuelo o resuelta.
 *
 * - Guarda el `Blob`, no la Object URL: cada `<Avatar>` crea y libera la suya,
 *   asi que desmontar uno no invalida la imagen de los demas.
 * - Un 404 (sin avatar, o binario perdido) y un recurso que no es imagen se
 *   recuerdan como `null`: son respuestas legitimas y no merece la pena
 *   repetirlas en cada render.
 * - Cualquier otro fallo (red, 401, 5xx) NO se recuerda: el siguiente montaje
 *   vuelve a intentarlo.
 */
const cache = new Map<string, Promise<Blob | null>>()

export const loadAvatar = (path: string): Promise<Blob | null> => {
  const cached = cache.get(path)

  if (cached !== undefined) {
    return cached
  }

  const pending = httpClient.download(path).then(
    ({ content, mediaType }) => (mediaType.startsWith('image/') ? content : null),
    (error: unknown) => {
      if (error instanceof HttpError && error.isNotFound) {
        return null
      }

      cache.delete(path)
      throw error
    },
  )

  cache.set(path, pending)

  return pending
}

/** Vacia la cache (al cerrar sesion, y entre pruebas). */
export const clearAvatarCache = (): void => {
  cache.clear()
}
