import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { formatDateTime } from '@/lib/format'
import { countLabel } from '@/shared/i18n/format'
import { i18n } from '@/shared/i18n/i18n'
import { queryKeys } from '@/shared/query-keys'
import { fetchMySanctionStatus, type MySanctionStatusResponse } from './api'

export type FetchMySanctionStatusTransport = typeof fetchMySanctionStatus

export interface MySanctionStatusProps {
  readonly fetchStatus?: FetchMySanctionStatusTransport
}

const TYPE_TRANSLATION_KEY: Readonly<Record<string, string>> = {
  TEMPORARY_SUSPENSION: 'account:mySanction.types.TEMPORARY_SUSPENSION',
  PERMANENT_BAN: 'account:mySanction.types.PERMANENT_BAN',
}

/**
 * Banner del propio estado de sancion (HU-42, §7.3.2: "contador visible del
 * tiempo restante de suspension"). Solo se muestra cuando hay una suspension
 * o un baneo vigente -una advertencia nunca llega aqui: no restringe acceso,
 * y `GET /accounts/me/sanctions/active` no la incluye por diseño del backend-.
 *
 * Funciona incluso si el testimonio de sesion sigue vigente (la ventana de
 * hasta 15 minutos documentada en ADR-004/ADR-025 de Infrastructure): este
 * componente vive en "Mi Cuenta", que sigue siendo alcanzable mientras el
 * testimonio no haya vencido.
 */
export const MySanctionStatus = ({
  fetchStatus = fetchMySanctionStatus,
}: MySanctionStatusProps = {}): React.JSX.Element | null => {
  const { t } = useTranslation()

  const query = useQuery<MySanctionStatusResponse>({
    queryKey: queryKeys.account.mySanctionStatus,
    queryFn: ({ signal }) => fetchStatus(signal),
  })

  if (!query.isSuccess || !query.data.hasActiveSanctions) {
    return null
  }

  const sanction = query.data.sanctions[0]

  return (
    <div
      role="alert"
      className="account-panel space-y-2 rounded-lg border border-danger bg-danger/10 p-4"
    >
      <p className="text-sm font-semibold text-danger">
        {t(
          sanction === undefined
            ? 'account:mySanction.types.PERMANENT_BAN'
            : (TYPE_TRANSLATION_KEY[sanction.type] ?? 'account:mySanction.types.PERMANENT_BAN'),
        )}
      </p>

      {sanction !== undefined && (
        <>
          <p className="text-sm text-ink">{sanction.reason}</p>

          {query.data.remainingSeconds !== null && (
            <p className="text-sm text-ink">
              {countLabel(
                i18n.t.bind(i18n),
                'account:mySanction.remainingMinutes',
                Math.ceil(query.data.remainingSeconds / 60),
              )}
            </p>
          )}

          <p className="text-xs text-muted">
            {t('account:mySanction.appealDeadline', {
              date: formatDateTime(sanction.appealDeadline),
            })}
          </p>
          <p className="text-xs text-muted">
            {t('account:mySanction.reference', { id: sanction.id })}
          </p>
        </>
      )}

      <Link
        to="/appeal"
        className="account-link inline-block text-sm font-semibold underline underline-offset-2"
      >
        {t('account:mySanction.appealLink')}
      </Link>
    </div>
  )
}
