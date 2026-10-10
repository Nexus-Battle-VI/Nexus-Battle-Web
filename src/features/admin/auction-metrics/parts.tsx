import type { ComponentType, ReactNode } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { RefreshCw } from '@/components/ui/icons'

type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

/**
 * Microinteraccion de profundidad de `StatisticsPanel` (HU-06.4): misma superficie y
 * mismo hover para que las cifras de esta pantalla se lean como las del panel de
 * estadisticas. No sugiere que la tarjeta sea un control (sin `cursor-pointer`).
 */
const DEPTH_HOVER =
  'transition-[transform,box-shadow,border-color] duration-150 ease-out ' +
  'hover:translate-y-px hover:scale-[0.995] hover:border-brand/40 hover:shadow-inner ' +
  'motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100'

/** Encabezado de seccion: icono decorativo + titulo. */
export const SectionHeading = ({
  icon: Icon,
  id,
  children,
}: {
  readonly icon: IconType
  readonly id: string
  readonly children: ReactNode
}): React.JSX.Element => (
  <div className="flex items-center gap-2">
    <Icon aria-hidden className="am-heading-icon h-4 w-4" />
    <h2 id={id} className="text-base font-semibold text-ink">
      {children}
    </h2>
  </div>
)

/** Tarjeta de cifra: icono, etiqueta, valor grande tabular y pie opcional. */
export const StatCard = ({
  icon: Icon,
  label,
  value,
  foot,
  children,
}: {
  readonly icon: IconType
  readonly label: string
  readonly value: string
  readonly foot?: ReactNode
  readonly children?: ReactNode
}): React.JSX.Element => (
  <div className={clsx('am-panel am-stat p-5', DEPTH_HOVER)}>
    <div className="flex items-center gap-2">
      <Icon aria-hidden className="am-heading-icon h-4 w-4 flex-none" />
      <h3 className="text-sm font-medium text-ink">{label}</h3>
    </div>
    <p className="am-stat-value mt-3 text-3xl leading-9 font-semibold tabular-nums">{value}</p>
    {children}
    {foot !== undefined && <p className="mt-1 text-xs text-muted">{foot}</p>}
  </div>
)

/** Tarjeta con titulo `h3` de 1rem, insignia opcional a la derecha y cuerpo. */
export const MetricCard = ({
  title,
  badge,
  children,
  className,
}: {
  readonly title: string
  readonly badge?: ReactNode
  readonly children: ReactNode
  readonly className?: string
}): React.JSX.Element => (
  <section className={clsx('am-panel min-w-0 p-5', className)}>
    {badge === undefined ? (
      <h3 className="text-base font-semibold text-ink">{title}</h3>
    ) : (
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {badge}
      </div>
    )}
    <div className="mt-4">{children}</div>
  </section>
)

type BadgeTone = 'ok' | 'neutral'

const BADGE_TONE: Readonly<Record<BadgeTone, string>> = {
  ok: 'am-badge-ok',
  neutral: 'am-badge-neutral',
}

/** Insignia de moneda ("Créditos" / "Dinero real") o de indisponibilidad. */
export const Badge = ({
  tone,
  children,
}: {
  readonly tone: BadgeTone
  readonly children: ReactNode
}): React.JSX.Element => (
  <span
    className={clsx(
      'am-badge inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
      BADGE_TONE[tone],
    )}
  >
    {children}
  </span>
)

/** Pareja etiqueta/valor alineada a la derecha, con cifras tabulares. */
export const KeyValueList = ({ children }: { readonly children: ReactNode }): React.JSX.Element => (
  <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">{children}</dl>
)

export const KeyValue = ({
  label,
  note,
  value,
  strong = false,
}: {
  readonly label: ReactNode
  readonly note?: string
  readonly value: ReactNode
  readonly strong?: boolean
}): React.JSX.Element => (
  <>
    <dt className={strong ? 'font-medium text-ink' : 'text-muted'}>
      {label}
      {note !== undefined && <span className="text-xs"> ({note})</span>}
    </dt>
    <dd className={clsx('m-0 text-right font-medium tabular-nums', strong && 'text-lg')}>
      {value}
    </dd>
  </>
)

/** Metrica que el contrato declara `UNAVAILABLE`: titulo + motivo, nunca un cero inventado. */
export const UnavailableNote = ({
  title,
  reason,
}: {
  readonly title: string
  readonly reason: string
}): React.JSX.Element => (
  <div className="grid gap-0.5">
    <b className="text-sm font-medium text-ink">{title}</b>
    <span className="text-xs text-muted">{reason}</span>
  </div>
)

/** Envoltura de tabla con desplazamiento horizontal para pantallas estrechas. */
export const TableWrap = ({ children }: { readonly children: ReactNode }): React.JSX.Element => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-sm">{children}</table>
  </div>
)

export const Th = ({
  numeric = false,
  children,
}: {
  readonly numeric?: boolean
  readonly children?: ReactNode
}): React.JSX.Element => (
  <th
    scope="col"
    className={clsx(
      'am-th px-2 py-2 text-xs font-medium whitespace-nowrap',
      numeric ? 'text-right' : 'text-left',
    )}
  >
    {children}
  </th>
)

export const Td = ({
  numeric = false,
  strong = false,
  className,
  children,
}: {
  readonly numeric?: boolean
  readonly strong?: boolean
  readonly className?: string
  readonly children?: ReactNode
}): React.JSX.Element => (
  <td
    className={clsx(
      'am-td px-2 py-2.5 align-middle group-last/row:border-b-0',
      numeric && 'text-right tabular-nums',
      strong && 'font-medium text-ink',
      className,
    )}
  >
    {children}
  </td>
)

export const Tr = ({ children }: { readonly children: ReactNode }): React.JSX.Element => (
  <tr className="group/row">{children}</tr>
)

/** Posicion en un ranking: circulo con el numero. */
export const RankBadge = ({ rank }: { readonly rank: number }): React.JSX.Element => (
  <span className="am-rank inline-grid h-6 w-6 place-items-center rounded-full text-xs font-semibold tabular-nums">
    {rank}
  </span>
)

/**
 * Seccion que Auction marco `DEGRADED` (o con la consulta fallida): aviso + "Reintentar".
 * Las demas secciones siguen mostrandose.
 */
export const SectionFailure = ({
  icon,
  title,
  onRetry,
  retrying,
}: {
  readonly icon: IconType
  readonly title: string
  readonly onRetry: () => void
  readonly retrying: boolean
}): React.JSX.Element => {
  const { t } = useTranslation()
  const Icon = icon

  return (
    <section className="am-panel p-5">
      <div className="flex items-center gap-2">
        <Icon aria-hidden className="am-heading-icon h-4 w-4" />
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
      </div>
      <div className="mt-4 grid gap-3">
        <p
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger"
        >
          {t('auctionMetrics:states.sectionFailed')}
        </p>
        <div>
          <Button
            variant="secondary"
            className="am-btn-secondary"
            onClick={onRetry}
            disabled={retrying}
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
            {t('auctionMetrics:states.retry')}
          </Button>
        </div>
      </div>
    </section>
  )
}
