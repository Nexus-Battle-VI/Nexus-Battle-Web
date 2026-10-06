import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { HttpError, type HttpDownload } from '@/lib/http'
import { primaryRole, roleLabel } from '@/shared/rbac'
import { useTheme } from '@/shared/theme'
import { AccountPixelIcon } from './AccountPixelIcon'
import { accountPrivacy } from './accountRemasterAssets'
import {
  downloadOwnPersonalData,
  saveOwnPersonalDataDownload,
  type OwnPersonalData,
  type PrivacyExportFormat,
} from './api'
import {
  AccountDeletionRequest,
  type AccountDeletionRequestProps,
} from './privacy/AccountDeletionRequest'
import { useOwnPersonalData } from './useOwnAccount'
import { countryName } from './countries'

interface SummaryRow {
  readonly label: string
  readonly value: string
}

interface ExportOption {
  readonly format: PrivacyExportFormat
  readonly descriptionKey: string
}

type ExportFeedback =
  | { readonly format: PrivacyExportFormat; readonly kind: 'success'; readonly message: string }
  | { readonly format: PrivacyExportFormat; readonly kind: 'error'; readonly message: string }

export type PrivacyExportTransport = (format: PrivacyExportFormat) => Promise<HttpDownload>

export interface PrivacySectionProps {
  readonly exportPersonalData?: PrivacyExportTransport
  readonly saveExport?: (file: HttpDownload, format: PrivacyExportFormat) => void
  /** Reenviado a `AccountDeletionRequest` (vease su prop `requestDeletion`). */
  readonly requestDeletion?: AccountDeletionRequestProps['requestDeletion']
}

const EXPORT_OPTIONS: readonly ExportOption[] = [
  { format: 'json', descriptionKey: 'account:privacy.export.json' },
  { format: 'xml', descriptionKey: 'account:privacy.export.xml' },
  { format: 'pdf', descriptionKey: 'account:privacy.export.pdf' },
]

const SummaryRow = ({ label, value }: SummaryRow): React.JSX.Element => (
  <div className="flex flex-col gap-1 border-b border-border/70 py-2 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
    <dt className="text-sm text-muted">{label}</dt>
    <dd className="min-w-0 max-w-full break-all text-sm font-semibold text-ink sm:max-w-[60%] sm:text-right">
      {value}
    </dd>
  </div>
)

const rowsFrom = (personalData: OwnPersonalData, t: TFunction): readonly SummaryRow[] => {
  const currentRole = primaryRole(personalData.roles)
  const readableRole = currentRole === null ? t('common:notAvailable') : roleLabel(currentRole)

  return [
    { label: t('account:privacy.rows.displayName'), value: personalData.displayName },
    { label: t('account:privacy.rows.email'), value: personalData.email },
    { label: t('account:privacy.rows.firstNames'), value: personalData.firstNames },
    { label: t('account:privacy.rows.lastNames'), value: personalData.lastNames },
    ...(personalData.countryCode == null
      ? []
      : [
          {
            label: t('account:privacy.rows.country'),
            value: countryName(personalData.countryCode),
          },
        ]),
    { label: t('account:privacy.rows.role'), value: readableRole },
    {
      label: t('account:privacy.rows.terms'),
      value: personalData.termsAccepted ? t('common:yes') : t('common:no'),
    },
  ]
}

/** Clave y variables del aviso de fallo; se traduce al pintar. */
const exportErrorMessage = (error: unknown, format: PrivacyExportFormat): string => {
  if (error instanceof HttpError && error.isUnauthorized) {
    return 'account:privacy.export.sessionExpired'
  }

  if (format === 'pdf' && error instanceof HttpError && error.status === 503) {
    return 'account:privacy.export.pdfUnavailable'
  }

  return 'account:privacy.export.failed'
}

const ExportOptions = ({
  exportPersonalData,
  saveExport,
}: Required<Pick<PrivacySectionProps, 'exportPersonalData' | 'saveExport'>>): React.JSX.Element => {
  // `message` guarda la CLAVE del aviso; se traduce al pintar (cambia con el idioma).
  const [feedback, setFeedback] = useState<ExportFeedback | null>(null)
  const exportMutation = useMutation({ mutationFn: exportPersonalData })
  const { t } = useTranslation()
  const theme = useTheme((state) => state.theme)

  const requestExport = (format: PrivacyExportFormat): void => {
    setFeedback(null)
    exportMutation.mutate(format, {
      onSuccess: (file) => {
        try {
          saveExport(file, format)
          setFeedback({
            format,
            kind: 'success',
            message: 'account:privacy.export.done',
          })
        } catch {
          setFeedback({
            format,
            kind: 'error',
            message: 'account:privacy.export.saveFailed',
          })
        }
      },
      onError: (error) => {
        setFeedback({ format, kind: 'error', message: exportErrorMessage(error, format) })
      },
    })
  }

  return (
    <section className="space-y-3" aria-labelledby="privacy-export-title">
      <div>
        <h3 id="privacy-export-title" className="text-sm font-semibold text-ink">
          {t('account:privacy.export.title')}
        </h3>
        <p className="mt-2 text-xs text-muted">{t('account:privacy.export.subtitle')}</p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
        {EXPORT_OPTIONS.map((option) => {
          const label = option.format.toUpperCase()
          const descriptionId = `privacy-export-${option.format}-status`
          const isPending = exportMutation.isPending && exportMutation.variables === option.format
          const optionFeedback = feedback?.format === option.format ? feedback : null

          return (
            <article
              key={option.format}
              className="account-stat-card flex min-w-0 flex-col items-center gap-2 rounded-lg p-4 text-center"
              aria-label={t('account:privacy.export.card', { format: label })}
            >
              <img
                aria-hidden
                alt=""
                className="account-export-icon"
                src={accountPrivacy.exportIcon[option.format][theme]}
              />
              <h4 className="text-sm font-semibold text-ink">{label}</h4>
              <p className="min-h-8 min-w-0 max-w-full break-words text-xs text-muted">
                {t(option.descriptionKey)}
              </p>
              <Button
                type="button"
                variant="account-secondary"
                loading={isPending}
                disabled={exportMutation.isPending}
                onClick={() => {
                  requestExport(option.format)
                }}
                aria-label={t('account:privacy.export.requestLabel', { format: label })}
                aria-describedby={descriptionId}
                className="mt-1 w-full"
              >
                {t('account:privacy.export.request')}
              </Button>
              <p
                id={descriptionId}
                role={optionFeedback?.kind === 'error' ? 'alert' : 'status'}
                aria-live="polite"
                className={`min-w-0 max-w-full break-words text-xs ${
                  optionFeedback?.kind === 'error'
                    ? 'text-danger'
                    : optionFeedback?.kind === 'success'
                      ? 'text-success'
                      : 'text-muted'
                }`}
              >
                {isPending
                  ? t('account:privacy.export.preparing', { format: label })
                  : optionFeedback === null
                    ? t('account:privacy.export.idle', { format: label })
                    : t(optionFeedback.message, { format: label })}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

/**
 * Portal de privacidad del titular autenticado (HU-45.4).
 *
 * Los datos personales salen de `GET /api/accounts/me/privacy`, no del
 * `AccountResponse` general que el shell usa para resumen y navegación. La Web
 * no elige titular ni manda identificadores: Account resuelve la identidad con
 * el testimonio de la sesión.
 */
export const PrivacySection = ({
  exportPersonalData = downloadOwnPersonalData,
  saveExport = saveOwnPersonalDataDownload,
  requestDeletion,
}: PrivacySectionProps = {}): React.JSX.Element => {
  const query = useOwnPersonalData()
  const { t } = useTranslation()
  const sessionExpired = query.error instanceof HttpError && query.error.isUnauthorized

  const theme = useTheme((state) => state.theme)

  return (
    <section className="account-panel min-w-0 space-y-5 p-5 sm:p-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AccountPixelIcon icon="privacy" size="md" />
          <div>
            <h2 className="account-title text-xl font-semibold">{t('account:privacy.title')}</h2>
            <p className="mt-2 text-sm text-muted">{t('account:privacy.subtitle')}</p>
          </div>
        </div>

        {query.isSuccess && (
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand/70 bg-brand/10 px-2 py-1 text-xs font-semibold text-ink">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <span className="min-w-0 truncate">
              {t('account:privacy.owner', { name: query.data.displayName })}
            </span>
          </span>
        )}
      </div>

      {query.isLoading && (
        <p role="status" className="text-sm text-muted">
          {t('account:privacy.loading')}
        </p>
      )}

      {query.isError && (
        <Card className="account-danger-zone">
          <p role="alert" className="text-sm font-medium text-danger">
            {sessionExpired ? t('account:privacy.sessionExpired') : t('account:privacy.loadFailed')}
          </p>
        </Card>
      )}

      {query.isSuccess && (
        <section aria-label={t('account:privacy.summary')} className="space-y-3">
          <div className="flex items-center gap-2">
            <img
              aria-hidden
              alt=""
              className="h-8 w-auto"
              src={accountPrivacy.personalDataBadge[theme]}
            />
            <div>
              <h3 className="text-sm font-semibold text-ink">{t('account:privacy.summary')}</h3>
              <p className="mt-2 text-xs text-muted">{t('account:privacy.summaryHint')}</p>
            </div>
          </div>

          <dl className="account-subpanel p-4">
            {rowsFrom(query.data, t).map((row) => (
              <SummaryRow key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
        </section>
      )}

      <ExportOptions exportPersonalData={exportPersonalData} saveExport={saveExport} />

      <AccountDeletionRequest {...(requestDeletion === undefined ? {} : { requestDeletion })} />
    </section>
  )
}
