import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { HttpError, type HttpDownload } from '@/lib/http'
import { primaryRole, roleLabel } from '@/shared/rbac'
import {
  downloadOwnPersonalData,
  saveOwnPersonalDataDownload,
  type OwnPersonalData,
  type PrivacyExportFormat,
} from './api'
import { useOwnPersonalData } from './useOwnAccount'

interface SummaryRow {
  readonly label: string
  readonly value: string
}

interface ExportOption {
  readonly format: PrivacyExportFormat
  readonly icon: string
  readonly description: string
}

type ExportFeedback =
  | { readonly format: PrivacyExportFormat; readonly kind: 'success'; readonly message: string }
  | { readonly format: PrivacyExportFormat; readonly kind: 'error'; readonly message: string }

export type PrivacyExportTransport = (format: PrivacyExportFormat) => Promise<HttpDownload>

export interface PrivacySectionProps {
  readonly exportPersonalData?: PrivacyExportTransport
  readonly saveExport?: (file: HttpDownload, format: PrivacyExportFormat) => void
}

const PRIVACY_LOAD_FAILED = 'No se pudo cargar tu información personal. Intenta de nuevo más tarde.'

const EXPORT_OPTIONS: readonly ExportOption[] = [
  { format: 'json', icon: '{ }', description: 'Formato estructurado para uso técnico.' },
  { format: 'xml', icon: '</>', description: 'Formato estructurado estándar.' },
  { format: 'pdf', icon: 'PDF', description: 'Documento legible para imprimir o archivar.' },
]

const SummaryRow = ({ label, value }: SummaryRow): React.JSX.Element => (
  <div className="flex flex-col gap-1 border-b border-border/70 py-2 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
    <dt className="text-sm text-muted">{label}</dt>
    <dd className="min-w-0 max-w-full break-all text-sm font-semibold text-ink sm:max-w-[60%] sm:text-right">
      {value}
    </dd>
  </div>
)

const rowsFrom = (personalData: OwnPersonalData): readonly SummaryRow[] => {
  const currentRole = primaryRole(personalData.roles)
  const readableRole = currentRole === null ? 'No disponible' : roleLabel(currentRole)

  return [
    { label: 'Nombre de usuario', value: personalData.displayName },
    { label: 'Correo electrónico', value: personalData.email },
    { label: 'Nombre', value: personalData.firstNames },
    { label: 'Apellidos', value: personalData.lastNames },
    { label: 'Rol', value: readableRole },
    { label: 'Aceptación de términos', value: personalData.termsAccepted ? 'Sí' : 'No' },
  ]
}

const exportErrorMessage = (error: unknown, format: PrivacyExportFormat): string => {
  if (error instanceof HttpError && error.isUnauthorized) {
    return 'Tu sesión ha caducado. Vuelve a iniciar sesión para exportar tus datos.'
  }

  if (format === 'pdf' && error instanceof HttpError && error.status === 503) {
    return 'El reporte PDF aún no puede prepararse. Intenta nuevamente más tarde.'
  }

  return `No se pudo descargar la exportación ${format.toUpperCase()}. Intenta nuevamente.`
}

const ExportOptions = ({
  exportPersonalData,
  saveExport,
}: Required<PrivacySectionProps>): React.JSX.Element => {
  const [feedback, setFeedback] = useState<ExportFeedback | null>(null)
  const exportMutation = useMutation({ mutationFn: exportPersonalData })

  const requestExport = (format: PrivacyExportFormat): void => {
    setFeedback(null)
    exportMutation.mutate(format, {
      onSuccess: (file) => {
        try {
          saveExport(file, format)
          setFeedback({
            format,
            kind: 'success',
            message: `La exportación ${format.toUpperCase()} se descargó correctamente.`,
          })
        } catch {
          setFeedback({
            format,
            kind: 'error',
            message: `No se pudo guardar la exportación ${format.toUpperCase()}. Intenta nuevamente.`,
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
          Solicitar exportación
        </h3>
        <p className="mt-2 text-xs text-muted">
          Elige el formato en el que deseas recibir tus datos.
        </p>
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
              className="flex min-w-0 flex-col items-center gap-2 rounded-lg border border-border bg-surface p-4 text-center"
              aria-label={`Exportación ${label}`}
            >
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-md border border-brand bg-brand/15 text-xs font-semibold text-brand"
              >
                {option.icon}
              </span>
              <h4 className="text-sm font-semibold text-ink">{label}</h4>
              <p className="min-h-8 min-w-0 max-w-full break-words text-xs text-muted">
                {option.description}
              </p>
              <Button
                type="button"
                variant="secondary"
                loading={isPending}
                disabled={exportMutation.isPending}
                onClick={() => {
                  requestExport(option.format)
                }}
                aria-label={`Solicitar exportación ${label}`}
                aria-describedby={descriptionId}
                className="mt-1 w-full"
              >
                Solicitar
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
                  ? `Preparando la exportación ${label}...`
                  : (optionFeedback?.message ?? `Descarga tus datos en formato ${label}.`)}
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
}: PrivacySectionProps = {}): React.JSX.Element => {
  const query = useOwnPersonalData()
  const sessionExpired = query.error instanceof HttpError && query.error.isUnauthorized

  return (
    <section className="min-w-0 space-y-5">
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Mis datos personales</h2>
          <p className="mt-2 text-sm text-muted">
            Consulta tu información y solicita una copia en el formato que prefieras.
          </p>
        </div>

        {query.isSuccess && (
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand/70 bg-brand/10 px-2 py-1 text-xs font-semibold text-ink">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <span className="min-w-0 truncate">
              Cuenta: {query.data.displayName} (titular autenticado)
            </span>
          </span>
        )}
      </div>

      {query.isLoading && (
        <p role="status" className="text-sm text-muted">
          Cargando tus datos personales...
        </p>
      )}

      {query.isError && (
        <Card>
          <p role="alert" className="text-sm text-danger">
            {sessionExpired
              ? 'Tu sesión ha caducado. Vuelve a iniciar sesión para consultar tus datos personales.'
              : PRIVACY_LOAD_FAILED}
          </p>
        </Card>
      )}

      {query.isSuccess && (
        <section aria-label="Resumen de tu información" className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Resumen de tu información</h3>
            <p className="mt-2 text-xs text-muted">
              Estos son los datos personales expuestos por el contrato de privacidad.
            </p>
          </div>

          <dl className="rounded-lg border border-border bg-surface p-4">
            {rowsFrom(query.data).map((row) => (
              <SummaryRow key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
        </section>
      )}

      <ExportOptions exportPersonalData={exportPersonalData} saveExport={saveExport} />
    </section>
  )
}
