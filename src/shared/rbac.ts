import { i18n } from '@/shared/i18n/i18n'
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
const KNOWN_ROLES = new Set([
  'PLAYER',
  'MODERATOR',
  'ADMINISTRATOR',
  'SUPER_ADMINISTRATOR',
  'GAME_MASTER',
])

/**
 * Etiqueta legible de un rol en el idioma activo. Devuelve el valor original si
 * no se reconoce (el token del rol nunca se traduce: solo su etiqueta).
 */
export const roleLabel = (role: string): string =>
  KNOWN_ROLES.has(role) ? i18n.t(`common:roles.${role}`) : role

const ROLE_PRECEDENCE = [
  'SUPER_ADMINISTRATOR',
  'ADMINISTRATOR',
  'MODERATOR',
  'GAME_MASTER',
  'PLAYER',
] as const

export const ADMIN_USER_PRIMARY_ROLES = ['ADMINISTRATOR', 'SUPER_ADMINISTRATOR'] as const

/** HU-41: Community exige Moderador o Administrador para moderar comentarios. */
export const COMMENT_MODERATION_PRIMARY_ROLES = [
  'MODERATOR',
  'ADMINISTRATOR',
  'SUPER_ADMINISTRATOR',
] as const

/** Rol vigente hacia fuera: el de mayor precedencia del conjunto acumulado. */
export const primaryRole = (roles: readonly string[]): string | null => {
  for (const role of ROLE_PRECEDENCE) {
    if (roles.includes(role)) {
      return role
    }
  }

  return roles[0] ?? null
}

/** Presentacion de HU-44; Account sigue siendo la autoridad y valida el testimonio. */
export const canViewAdminUsers = (roles: readonly string[]): boolean => {
  const role = primaryRole(roles)

  return ADMIN_USER_PRIMARY_ROLES.some((allowedRole) => allowedRole === role)
}

/** Presentacion de HU-41; Community sigue siendo la autoridad y valida el testimonio. */
export const canModerateComments = (roles: readonly string[]): boolean => {
  const role = primaryRole(roles)

  return COMMENT_MODERATION_PRIMARY_ROLES.some((allowedRole) => allowedRole === role)
}

/**
 * Presentacion de HU-66; Auction sigue siendo la autoridad (rol MAS subject
 * configurado, HU-66.1) y valida el testimonio.
 *
 * A diferencia de `canViewAdminUsers`/`canModerateComments`, comprueba
 * pertenencia directa y no `primaryRole`: GAME_MASTER no participa de la
 * jerarquia administrativa (ADMINISTRATOR/SUPER_ADMINISTRATOR no lo heredan,
 * ni el lo hereda a ellos).
 */
export const canPublishOfficialAuctions = (roles: readonly string[]): boolean =>
  roles.includes('GAME_MASTER')
