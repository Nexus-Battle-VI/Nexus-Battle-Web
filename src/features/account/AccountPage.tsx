import { Link, Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/Card'
import { HttpError } from '@/lib/http'
import { ECOMMERCE_PATH } from '@/routes/routes'
import { useLanguage } from '@/shared/i18n/language'
import { describeFailure } from '@/shared/i18n/errors'
import { useTheme } from '@/shared/theme'
import { accountHero } from './accountRemasterAssets'
import { AccountSummary } from './AccountSummary'
import { AccountSectionNav } from './AccountSectionNav'
import type { AccountOutletContext } from './outletContext'
import { useOwnAccount } from './useOwnAccount'
import './account.css'

/**
 * "Mi cuenta" (HU-05.4).
 *
 * Shell de la seccion: barra superior con el control "Volver", resumen de
 * cuenta + navegacion interna en la columna de contexto, y el contenido de la
 * seccion activa en el panel principal (`<Outlet>`). Resuelve
 * `GET /api/accounts/me` UNA vez y reparte la cuenta a las secciones por
 * contexto de outlet; aqui se gestionan los estados de carga, error y sesion
 * caducada para no repetirlos en cada seccion.
 *
 * No trae un segundo encabezado global ni repite el logo: eso vive en
 * `AppHeader`, que ademas oculta el conmutador de tema global mientras se esta
 * en `/account` (el control de tema vive en "Preferencias"). Desde la ronda 2
 * de pulido visual, tampoco trae un bloque Hero propio (emblema + titulo +
 * subtitulo visibles) -decision de diseño del equipo-; el titulo real de la
 * pagina sigue existiendo como `h1`/`p` `sr-only` para accesibilidad y para
 * los tests existentes.
 *
 * El control "Volver" vive UNA sola vez aqui, en la barra compartida, y por
 * tanto acompana a todas las secciones hijas (Perfil, Seguridad, Preferencias,
 * Estadisticas y logros, Suscripciones, Metodos de pago). Sale de `/account` y
 * regresa a la pantalla principal autenticada (`ECOMMERCE_PATH`), el mismo
 * destino canonico posterior al login. Es un enlace de React Router -no un
 * boton-: navega. No reconstruye `AppHeader` ni toca `PrimaryNav`.
 */
export const AccountPage = (): React.JSX.Element => {
  const query = useOwnAccount()
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)
  const theme = useTheme((state) => state.theme)

  const sessionExpired = query.error instanceof HttpError && query.error.isUnauthorized

  return (
    <div className="account-page space-y-3">
      {/* Ronda 2 (brief seccion 4/5): el bloque Hero (emblema + "MI CUENTA" +
       * subtitulo) se elimino visualmente -decision de diseño del equipo, no
       * un bug a corregir-. Solo sobrevive el control "Volver", ahora con su
       * propia placa tematica en vez de vivir dentro del hero. El `h1`/`p`
       * permanecen en el DOM como `sr-only`: siguen siendo el titulo real de
       * la pagina para lectores de pantalla y para los tests existentes
       * (`getByRole('heading', { level: 1, name: 'Mi cuenta' })`), nunca
       * `display: none` -que un lector de pantalla tambien saltaria-. */}
      <div className="account-topbar">
        <Link
          to={ECOMMERCE_PATH}
          aria-label={t('common:back')}
          title={t('common:back')}
          className="account-back-button focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {/* La placa (`02-Hero-Header/back-plate-*`) YA trae la flecha
           * dibujada -no un marco vacio-, asi que se usa como la imagen del
           * boton en vez de superponer `ChevronLeft` encima (duplicaria la
           * flecha). Solo se fija el ALTO; el ancho es `auto` porque dark
           * (244x286, vertical) y light (253x154, horizontal) tienen
           * proporciones distintas en el kit -estirar ambas al mismo recuadro
           * las deformaria (brief seccion 58). */}
          {/* Ronda 3 (brief seccion 33-36): a la MISMA altura (44px), Dark
           * (244x286, retrato/angosto) rendeiza una tira vertical de ~38px de
           * ancho -muy inferior en presencia visual al pill ancho de Light
           * (253x154, ~72px de ancho a esa altura)-. Se le da a Dark una
           * altura mayor que a Light para que su area ocupada sea comparable,
           * SIN deformar -el ancho sigue siendo `auto`, calculado desde la
           * proporcion real del PNG, nunca forzado-.
           * Ronda 4 (brief seccion 3): Light ya estaba aprobado (sin tocar);
           * Dark se percibia todavia pequeno -sube de 64px a 72px, mismo
           * criterio de alto fijo + ancho automatico. */}
          <img
            src={accountHero.backPlate[theme]}
            alt=""
            aria-hidden
            className={theme === 'dark' ? 'h-[72px] w-auto' : 'h-11 w-auto'}
          />
        </Link>
        <h1 className="sr-only">{t('account:page.title')}</h1>
        <p className="sr-only">{t('account:page.subtitle')}</p>
      </div>

      {query.isLoading && (
        <p role="status" className="text-sm text-muted">
          {t('account:page.loading')}
        </p>
      )}

      {query.isError && (
        <Card className="account-panel">
          <p role="alert" className="text-sm text-danger">
            {sessionExpired
              ? t('account:page.sessionExpired')
              : query.error instanceof Error
                ? describeFailure(query.error, t, language)
                : t('account:page.loadFailed')}
          </p>
        </Card>
      )}

      {query.isSuccess && (
        <div className="account-shell">
          <aside className="min-w-0 space-y-4">
            <Card className="account-panel">
              <AccountSummary account={query.data} />
            </Card>
            <AccountSectionNav roles={query.data.roles} />
          </aside>

          <div className="min-w-0">
            <Outlet context={{ account: query.data } satisfies AccountOutletContext} />
          </div>
        </div>
      )}
    </div>
  )
}
