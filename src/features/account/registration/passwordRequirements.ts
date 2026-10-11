import type { TFunction } from 'i18next'

import type { PasswordRequirement } from '@/components/auth/PasswordRequirements'

import { PASSWORD_RULES } from './validation'

/**
 * Cada regla de `PASSWORD_RULES` evaluada sobre lo escrito, lista para el
 * medidor en vivo (Registro y Recuperacion). Solo devuelve si se cumple cada
 * regla: la contrasena no sale de aqui.
 */
export const passwordRequirements = (value: string, t: TFunction): PasswordRequirement[] =>
  PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: t(`auth:password.rules.${rule.id}`),
    met: rule.test(value),
  }))
