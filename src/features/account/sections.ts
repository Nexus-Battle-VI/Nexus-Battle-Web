import { ADMIN_USER_PRIMARY_ROLES, primaryRole } from '@/shared/rbac'
import type { AccountSectionIconName } from './accountRemasterAssets'

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
  /** Clave de traduccion de la etiqueta. */
  readonly labelKey: string
  readonly end: boolean
  readonly requiredPrimaryRoles?: readonly string[]
  /** Icono del remaster visual Sprint 3 (las 7 secciones de jugador + `admin`). */
  readonly icon?: AccountSectionIconName
}

export const ACCOUNT_SECTIONS: readonly AccountSection[] = [
  { to: '.', labelKey: 'account:sections.profile', end: true, icon: 'profile' },
  { to: 'security', labelKey: 'account:sections.security', end: false, icon: 'security' },
  { to: 'preferences', labelKey: 'account:sections.preferences', end: false, icon: 'preferences' },
  { to: 'statistics', labelKey: 'account:sections.statistics', end: false, icon: 'statistics' },
  {
    to: 'subscriptions',
    labelKey: 'account:sections.subscriptions',
    end: false,
    icon: 'subscriptions',
  },
  {
    to: 'payment-methods',
    labelKey: 'account:sections.paymentMethods',
    end: false,
    icon: 'paymentMethods',
  },
  {
    to: 'privacy',
    labelKey: 'account:sections.privacy',
    end: false,
    requiredPrimaryRoles: ['PLAYER'],
    icon: 'privacy',
  },
  {
    to: 'admin-users',
    labelKey: 'account:sections.adminUsers',
    end: false,
    requiredPrimaryRoles: ADMIN_USER_PRIMARY_ROLES,
    icon: 'admin',
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
