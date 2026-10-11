import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AdminPageHeader, AdminPanel } from '@/components/admin-kit'
import { QueryState } from '@/components/ui/QueryState'
import { TextField } from '@/components/ui/form/TextField'

import type { UsageReport } from './api'
import { useAnalytics } from './useModelAdmin'

const today = (): string => new Date().toISOString().slice(0, 10)

const percent = (value: number | null): string => {
  if (value === null) {
    return '—'
  }
  return `${String(Math.round(value * 1000) / 10)}%`
}

export const AnalyticsPage = (): React.JSX.Element => {
  const { t } = useTranslation()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const { report, isLoading, error } = useAnalytics(from, to)

  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader icon="chatbot-analytics" title={t('chatbotAdmin:analyticsTitle')} />
      <p className="text-sm text-muted">{t('chatbotAdmin:utc')}</p>
      <div className="flex flex-wrap gap-3">
        <TextField
          label={t('chatbotAdmin:from')}
          type="date"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value)
          }}
        />
        <TextField
          label={t('chatbotAdmin:to')}
          type="date"
          value={to}
          onChange={(event) => {
            setTo(event.target.value)
          }}
        />
      </div>
      <QueryState isLoading={isLoading} error={error}>
        {report !== null ? <ReportView report={report} /> : null}
      </QueryState>
    </section>
  )
}

const ReportView = ({ report }: { readonly report: UsageReport }): React.JSX.Element => {
  const { t } = useTranslation()
  const time =
    report.averageResponseMs === null
      ? '—'
      : t('chatbotAdmin:milliseconds', { value: String(Math.round(report.averageResponseMs)) })

  return (
    <div className="flex flex-col gap-4 text-sm">
      <AdminPanel title={t('chatbotAdmin:conversations')}>
        <p>{String(report.conversationsStarted)}</p>
        <p>
          {t('chatbotAdmin:resolution')} {percent(report.resolutionRate)}
        </p>
        <p>
          {t('chatbotAdmin:responseTime')} {time}
        </p>
        <p>
          {t('chatbotAdmin:satisfaction')} {percent(report.satisfaction)}
        </p>
        <p>
          {t('chatbotAdmin:escalations')} {String(report.escalations)}
        </p>
      </AdminPanel>
      <AdminPanel title={t('chatbotAdmin:questions')}>
        <CountList
          rows={report.frequentQuestions}
          label={(row) => row.text}
          empty={t('chatbotAdmin:emptyPeriod')}
        />
      </AdminPanel>
      <AdminPanel title={t('chatbotAdmin:topics')}>
        <CountList
          rows={report.topics}
          label={(row) => row.intent ?? t('chatbotAdmin:noTopic')}
          empty={t('chatbotAdmin:emptyPeriod')}
        />
      </AdminPanel>
      <AdminPanel title={t('chatbotAdmin:keywords')}>
        <CountList
          rows={report.keywords}
          label={(row) => row.text}
          empty={t('chatbotAdmin:emptyPeriod')}
        />
      </AdminPanel>
      <AdminPanel title={t('chatbotAdmin:trend')}>
        <ul>
          {report.trend.map((point) => (
            <li key={point.date}>
              {point.date} {String(point.queries)} / {String(point.resolved)}
            </li>
          ))}
        </ul>
      </AdminPanel>
    </div>
  )
}

const CountList = <T extends { readonly count: number }>({
  rows,
  label,
  empty,
}: {
  readonly rows: readonly T[]
  readonly label: (row: T) => string
  readonly empty: string
}): React.JSX.Element => {
  if (rows.length === 0) {
    return <p>{empty}</p>
  }
  return (
    <ul>
      {rows.map((row) => (
        <li key={label(row)}>
          {label(row)} {String(row.count)}
        </li>
      ))}
    </ul>
  )
}
