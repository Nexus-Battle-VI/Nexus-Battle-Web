import { Link, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'

/**
 * EN-031: limite de error de la ruta de batalla. Un fallo al pintar ya no deja la pantalla en
 * blanco hasta pulsar Ctrl+F5: «Reconectar» vuelve a la MISMA ruta (React Router reinicia el
 * limite al navegar), lo que monta la batalla de nuevo y pide la instantanea completa a Combat.
 */
export const BattleRouteError = (): React.JSX.Element => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <section aria-label={t('battle:battle.label')} className="flex flex-col items-start gap-3">
      <p role="alert" className="text-sm text-danger">
        {t('battle:battle.crashed')}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="battle-primary"
          className="min-h-11"
          onClick={() => {
            void navigate(location.pathname, { replace: true })
          }}
        >
          {t('battle:battle.reconnect')}
        </Button>
        <Link
          to="/play"
          className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline"
        >
          {t('battle:backToPlay')}
        </Link>
      </div>
    </section>
  )
}
