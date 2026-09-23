/**
 * Ruta del avatar de un JUGADOR a partir de su sujeto de identidad (HU-15).
 *
 * Combat identifica a cada participante por `playerId`, que es el sujeto de
 * identidad; Account sirve su avatar en `GET /accounts/by-subject/:subject/avatar`
 * (JWT, sin rol). Es el UNICO sitio que construye esa ruta: lobby, batalla y
 * cualquier otra vista la piden aqui.
 *
 * El sujeto viaja codificado y NUNCA se pinta: es un identificador opaco.
 * `null` (participante IA o sin sujeto) significa "sin avatar": se muestra la
 * inicial.
 */
export const avatarPathForSubject = (subject: string | null | undefined): string | null => {
  if (subject === null || subject === undefined || subject.trim().length === 0) {
    return null
  }

  return `/accounts/by-subject/${encodeURIComponent(subject)}/avatar`
}
