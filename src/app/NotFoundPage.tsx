import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/Card'

export const NotFoundPage = (): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <Card title={t('app:notFound.title')}>
      <p className="text-sm text-muted">{t('app:notFound.body')}</p>
      <Link to="/catalog" className="mt-4 inline-block text-sm font-medium text-brand underline">
        {t('app:notFound.back')}
      </Link>
    </Card>
  )
}
