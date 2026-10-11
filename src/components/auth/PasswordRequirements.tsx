import { useTranslation } from 'react-i18next'

export interface PasswordRequirement {
  readonly id: string
  readonly label: string
  readonly met: boolean
}

/**
 * Requisitos de la contrasena, marcados en vivo mientras se escribe (remaster
 * EN-031). No decide nada: recibe cada regla ya evaluada por la MISMA politica
 * que valida el formulario (`PASSWORD_RULES` de Registro), asi la ayuda y la
 * validacion no pueden contradecirse. La contrasena nunca llega aqui.
 *
 * Cada regla dice su estado tambien con texto (oculto a la vista), no solo con
 * el color o la marca.
 */
export const PasswordRequirements = ({
  id,
  requirements,
}: {
  readonly id: string
  readonly requirements: readonly PasswordRequirement[]
}): React.JSX.Element => {
  const { t } = useTranslation()
  return (
    <ul id={id} className="auth-requirements" aria-label={t('auth:password.requirementsTitle')}>
      {requirements.map((requirement) => (
        <li key={requirement.id} className="auth-requirement" data-met={requirement.met}>
          <span aria-hidden="true" className="auth-requirement-mark">
            {requirement.met ? '✓' : '·'}
          </span>
          <span>{requirement.label}</span>
          <span className="sr-only">
            {requirement.met ? t('auth:password.met') : t('auth:password.pending')}
          </span>
        </li>
      ))}
    </ul>
  )
}
