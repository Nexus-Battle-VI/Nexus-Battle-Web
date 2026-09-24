import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { describeFailure } from '@/shared/i18n/errors'
import { useLanguage } from '@/shared/i18n/language'

export interface QueryStateProps {
  readonly isLoading: boolean
  readonly error: unknown
  readonly isEmpty?: boolean
  readonly emptyMessage?: string
  readonly children: ReactNode
}

/**
 * Estados de una consulta: cargando, error, vacio o contenido.
 *
 * Centralizarlos evita que cada pantalla invente su propia manera de mostrar un
 * fallo, y garantiza que **el estado vacio nunca se confunda con un error**:
 * son situaciones distintas y quien usa la aplicacion necesita distinguirlas.
 */
export const QueryState = ({
  isLoading,
  error,
  isEmpty = false,
  emptyMessage,
  children,
}: QueryStateProps): React.JSX.Element => {
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted">
        {t('common:loading')}
      </p>
    )
  }

  if (error !== null && error !== undefined) {
    // En español, el mensaje del servicio tal cual (como siempre); en otro
    // idioma, una descripcion localizada por codigo o estado HTTP.
    return (
      <p role="alert" className="text-sm text-danger">
        {describeFailure(error, t, language)}
      </p>
    )
  }

  if (isEmpty) {
    return <p className="text-sm text-muted">{emptyMessage ?? t('common:empty')}</p>
  }

  return <>{children}</>
}
