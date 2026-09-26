import { useTranslation } from 'react-i18next'

import { Card } from './Card'

export interface ModuleUnavailableProps {
  /** Titulo ya resuelto; alternativa a `titleKey`. */
  readonly title?: string
  /** Clave de traduccion del titulo (se resuelve en el idioma activo). */
  readonly titleKey?: string
}

/**
 * Acceso ya visible en la navegacion para un modulo que todavia no existe.
 *
 * El cliente confirmo que un acceso puede existir en la navegacion aunque el
 * modulo detras todavia no este implementado (Jugar Online, Misiones, Torneo,
 * Subasta). A diferencia de los marcadores de posicion de un bounded context
 * (`AccountPage`, `PlayerInventoryPage`...), estos no nombran un servicio
 * responsable: ese servicio todavia no existe en la organizacion, y
 * atribuirselo a uno inventado seria peor que no nombrarlo.
 */
export const ModuleUnavailable = ({
  title,
  titleKey,
}: ModuleUnavailableProps): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <Card title={titleKey === undefined ? (title ?? '') : t(titleKey)}>
      <p className="text-sm text-muted">
        <span className="font-medium text-ink">{t('common:moduleUnavailable.title')}</span>{' '}
        {t('common:moduleUnavailable.body')}
      </p>
    </Card>
  )
}
