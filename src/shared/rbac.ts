/**
 * Roles reconocidos por HU-02 y su representacion textual.
 *
 * Los cuatro tokens (`PLAYER`, `MODERATOR`, `ADMINISTRATOR`,
 * `SUPER_ADMINISTRATOR`) son los que la propia Historia de Usuario define para
 * el modelo RBAC. El formato exacto con el que el futuro contrato de login los
 * transportara todavia no esta definido: este modulo asume que llegan tal
 * cual, y debera revisarse cuando ese contrato exista.
 *
 * Esta matriz es de **presentacion unicamente**. Mostrar el rol en la cabecera
 * no es un control de seguridad: la autorizacion real ocurre en cada
 * servicio, que valida el rol del testimonio antes de ejecutar la operacion
 * protegida.
 */
const ROLE_LABELS: Readonly<Record<string, string>> = {
  PLAYER: 'Jugador',
  MODERATOR: 'Moderador',
  ADMINISTRATOR: 'Administrador',
  SUPER_ADMINISTRATOR: 'Super Administrador',
}

/** Etiqueta legible de un rol. Devuelve el valor original si no se reconoce. */
export const roleLabel = (role: string): string => ROLE_LABELS[role] ?? role

/**
 * El primer rol de la lista recibida, para mostrarlo en la interfaz.
 *
 * HU-02 no define que una cuenta tenga mas de un rol simultaneo; si el
 * contrato futuro lo permite, esta funcion seguira mostrando uno solo, que es
 * lo unico que la cabecera necesita representar hoy.
 */
export const primaryRole = (roles: readonly string[]): string | null => roles[0] ?? null
