import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/Card'

/**
 * Pantalla del bounded context Community.
 *
 * Es un marcador de posicion **declarado como tal**. La estructura de la
 * feature existe y la ruta esta conectada, pero la funcionalidad se
 * implementara en su Historia de Usuario correspondiente.
 *
 * No se simula contenido: una pantalla con datos inventados es indistinguible
 * de una implementada, y esa confusion es peor que una pantalla vacia honesta.
 */
export const CommunityPage = (): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <Card title={t('app:community.title')} description={t('app:community.description')}>
      <p className="text-sm text-muted">
        {t('app:community.pendingBefore')}
        <code className="mx-1 rounded bg-surface px-1.5 py-0.5 text-xs">
          Nexus-Battle-Community
        </code>
        {t('app:community.pendingAfter')}
      </p>
    </Card>
  )
}
