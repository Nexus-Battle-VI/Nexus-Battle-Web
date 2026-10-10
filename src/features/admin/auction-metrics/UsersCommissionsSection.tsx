import { useTranslation } from 'react-i18next'

import { User } from '@/components/ui/icons'

import { formatCount, formatCredits } from './metricsFormat'
import {
  Badge,
  KeyValue,
  KeyValueList,
  MetricCard,
  RankBadge,
  SectionHeading,
  TableWrap,
  Td,
  Th,
  Tr,
} from './parts'
import { reasonText, type ReasonScope } from './reasons'
import type { UnavailableMetric, UsersAndCommissions } from './types'

const UserTotal = ({
  label,
  value,
}: {
  readonly label: string
  readonly value: number
}): React.JSX.Element => (
  <div className="am-subpanel p-3">
    <p className="text-xs text-muted">{label}</p>
    <p className="am-big mt-0.5 text-2xl leading-8 font-semibold tabular-nums">
      {formatCount(value)}
    </p>
  </div>
)

/** Comision que el contrato declara `UNAVAILABLE`: insignia + motivo, nunca un 0 inventado. */
const UnavailableCommission = ({
  label,
  scope,
  metric,
}: {
  readonly label: string
  readonly scope: ReasonScope
  readonly metric: UnavailableMetric
}): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <span className="text-sm">{label}</span>
        <Badge tone="neutral">{t('auctionMetrics:badges.unavailable')}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted">{reasonText(t, scope, metric.reason)}</p>
    </div>
  )
}

/** CA-04: usuarios activos y comision de publicacion (contrato §4.4). */
export const UsersCommissionsSection = ({
  data,
}: {
  readonly data: UsersAndCommissions
}): React.JSX.Element => {
  const { t } = useTranslation()
  const { activeUsers, commissions } = data

  return (
    <section aria-labelledby="auction-metrics-users" className="grid min-w-0 gap-4">
      <SectionHeading icon={User} id="auction-metrics-users">
        {t('auctionMetrics:users.title')}
      </SectionHeading>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
        <MetricCard title={t('auctionMetrics:users.activeTitle')}>
          <div className="grid gap-4">
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(7.5rem,1fr))]">
              <UserTotal
                label={t('auctionMetrics:users.total')}
                value={activeUsers.totalActiveUsers}
              />
              <UserTotal
                label={t('auctionMetrics:users.sellers')}
                value={activeUsers.byRole.sellers}
              />
              <UserTotal
                label={t('auctionMetrics:users.bidders')}
                value={activeUsers.byRole.bidders}
              />
              <UserTotal
                label={t('auctionMetrics:users.buyers')}
                value={activeUsers.byRole.buyers}
              />
            </div>
            {activeUsers.top.length > 0 && (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>{t('auctionMetrics:users.player')}</Th>
                    <Th numeric>{t('auctionMetrics:users.auctions')}</Th>
                    <Th numeric>{t('auctionMetrics:users.asSeller')}</Th>
                    <Th numeric>{t('auctionMetrics:users.asBidder')}</Th>
                    <Th numeric>{t('auctionMetrics:users.asBuyer')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {activeUsers.top.map((user) => (
                    <Tr key={user.playerId}>
                      <Td>
                        <RankBadge rank={user.rank} />
                      </Td>
                      {/* ID opaco (`sub`): nunca se cruza con nombre ni correo (decision D-2). */}
                      <Td className="font-mono text-[0.8125rem]">{user.playerId}</Td>
                      <Td numeric strong>
                        {formatCount(user.activeAuctions)}
                      </Td>
                      <Td numeric>{formatCount(user.asSeller)}</Td>
                      <Td numeric>{formatCount(user.asBidder)}</Td>
                      <Td numeric>{formatCount(user.asBuyer)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </div>
        </MetricCard>

        <MetricCard
          title={t('auctionMetrics:users.commissionTitle')}
          badge={<Badge tone="ok">{t('auctionMetrics:badges.credits')}</Badge>}
        >
          <div className="grid gap-4">
            <KeyValueList>
              <KeyValue
                label={t('auctionMetrics:users.gross')}
                value={formatCredits(commissions.gross)}
              />
              <KeyValue
                label={t('auctionMetrics:users.refunded')}
                value={formatCredits(commissions.refunded)}
              />
              <KeyValue
                strong
                label={t('auctionMetrics:users.net')}
                value={formatCredits(commissions.net)}
              />
              <KeyValue
                label={t('auctionMetrics:users.pendingRefunds', {
                  value: formatCount(commissions.pendingRefunds.count),
                })}
                value={formatCredits(commissions.pendingRefunds.amount)}
              />
            </KeyValueList>

            <TableWrap>
              <thead>
                <tr>
                  <Th>{t('auctionMetrics:users.duration')}</Th>
                  <Th numeric>{t('auctionMetrics:users.auctions')}</Th>
                  <Th numeric>{t('auctionMetrics:users.fee')}</Th>
                  <Th numeric>{t('auctionMetrics:users.grossColumn')}</Th>
                </tr>
              </thead>
              <tbody>
                {commissions.byDuration.map((row) => (
                  <Tr key={row.durationHours}>
                    <Td>{t('auctionMetrics:users.hours', { value: row.durationHours })}</Td>
                    <Td numeric>{formatCount(row.auctions)}</Td>
                    <Td numeric>{formatCredits(row.feePerAuction)}</Td>
                    <Td numeric>{formatCredits(row.gross)}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrap>

            <div className="am-subpanel grid gap-2.5 p-3">
              <UnavailableCommission
                label={t('auctionMetrics:users.salesCommission')}
                scope="salesCommission"
                metric={commissions.salesCommission}
              />
              <UnavailableCommission
                label={t('auctionMetrics:users.realMoneyCommission')}
                scope="realMoneyCommission"
                metric={commissions.realMoneyCommission}
              />
              <UnavailableCommission
                label={t('auctionMetrics:users.walletReconciliation')}
                scope="walletReconciliation"
                metric={commissions.walletReconciliation}
              />
            </div>
          </div>
        </MetricCard>
      </div>
    </section>
  )
}
