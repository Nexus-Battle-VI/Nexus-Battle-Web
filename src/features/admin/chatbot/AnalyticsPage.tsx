import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { describeFailure } from '@/shared/i18n/errors'
import { useLanguage } from '@/shared/i18n/language'

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
  const language = useLanguage((state) => state.language)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const { report, isLoading, error } = useAnalytics(from, to)

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">{t('chatbotAdmin:analyticsTitle')}</h1>
      <p className="text-sm text-muted">{t('chatbotAdmin:utc')}</p>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          {t('chatbotAdmin:from')}
          <input
            type="date"
            value={from}
            className="ml-2 rounded border border-border bg-transparent px-2 py-1"
            onChange={(event) => {
              setFrom(event.target.value)
            }}
          />
        </label>
        <label className="text-sm">
          {t('chatbotAdmin:to')}
          <input
            type="date"
            value={to}
            className="ml-2 rounded border border-border bg-transparent px-2 py-1"
            onChange={(event) => {
              setTo(event.target.value)
            }}
          />
        </label>
      </div>
      {isLoading ? <p role="status">{t('chatbotAdmin:loading')}</p> : null}
      {error !== null ? <p role="alert">{describeFailure(error, t, language)}</p> : null}
      {report !== null ? <ReportView report={report} /> : null}
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
      <p>
        {t('chatbotAdmin:conversations')} {String(report.conversationsStarted)}
      </p>
      <section>
        <h2 className="font-semibold">{t('chatbotAdmin:questions')}</h2>
        <CountList
          rows={report.frequentQuestions}
          label={(row) => row.text}
          empty={t('chatbotAdmin:emptyPeriod')}
        />
      </section>
      <section>
        <h2 className="font-semibold">{t('chatbotAdmin:topics')}</h2>
        <CountList
          rows={report.topics}
          label={(row) => row.intent ?? t('chatbotAdmin:noTopic')}
          empty={t('chatbotAdmin:emptyPeriod')}
        />
      </section>
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
      <section>
        <h2 className="font-semibold">{t('chatbotAdmin:keywords')}</h2>
        <CountList
          rows={report.keywords}
          label={(row) => row.text}
          empty={t('chatbotAdmin:emptyPeriod')}
        />
      </section>
      <section>
        <h2 className="font-semibold">{t('chatbotAdmin:trend')}</h2>
        <ul>
          {report.trend.map((point) => (
            <li key={point.date}>
              {point.date} {String(point.queries)} / {String(point.resolved)}
            </li>
          ))}
        </ul>
      </section>
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
