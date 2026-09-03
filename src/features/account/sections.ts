import { ADMIN_USER_PRIMARY_ROLES, primaryRole } from '@/shared/rbac'

/**
 * Secciones de "Mi cuenta" (HU-05.4).
 *
 * Una sola lista, consumida por la navegacion interna y por el arbol de rutas
 * (`routes.tsx` monta un hijo por cada segmento). El orden es el de la Task:
 * identidad primero, seguridad, preferencias y, al final, las capacidades
 * todavia no disponibles en el backend.
 *
 * Los `to` son RELATIVOS a la ruta padre ("Mi cuenta"), no absolutos: asi la
 * misma navegacion sirve montada en `/account` y en su vista previa de
 * desarrollo sin depender del prefijo. `.` es la seccion indice ("Perfil"); el
 * resto coincide con el segmento de su ruta hija en `routes.tsx`.
 */
export interface AccountSection {
  /** Ruta relativa a "Mi cuenta". `end` distingue la seccion indice (`.`). */
  readonly to: string
  readonly label: string
  readonly end: boolean
  readonly requiredPrimaryRoles?: readonly string[]
}

export const ACCOUNT_SECTIONS: readonly AccountSection[] = [
  { to: '.', label: 'Perfil', end: true },
  { to: 'security', label: 'Seguridad', end: false },
  { to: 'preferences', label: 'Preferencias', end: false },
  { to: 'statistics', label: 'Estadísticas y logros', end: false },
  { to: 'subscriptions', label: 'Suscripciones', end: false },
  { to: 'payment-methods', label: 'Metodos de pago', end: false },
  {
    to: 'privacy',
    label: 'Datos personales y exportación',
    end: false,
    requiredPrimaryRoles: ['PLAYER'],
  },
  {
    to: 'admin-users',
    label: 'Panel administrativo',
    end: false,
    requiredPrimaryRoles: ADMIN_USER_PRIMARY_ROLES,
  },
]

export const accountSectionsForRoles = (roles: readonly string[]): readonly AccountSection[] => {
  const role = primaryRole(roles)

  return ACCOUNT_SECTIONS.filter(
    (section) =>
      section.requiredPrimaryRoles === undefined ||
      section.requiredPrimaryRoles.some((requiredRole) => requiredRole === role),
  )
}
