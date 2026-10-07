import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { describeFailure } from '@/shared/i18n/errors'
import { useLanguage } from '@/shared/i18n/language'

import type { ModelVersionRow, TrainingResult } from './api'
import { useModelVersions, useStartModelTraining } from './useModelAdmin'

import './chatbot-admin.css'

const percent = (value: number | null): string => {
  if (value === null) {
    return '—'
  }
  return `${String(Math.round(value * 1000) / 10)}%`
}

const outcomeKey = (result: TrainingResult): string => {
  if (!result.started) {
    return 'chatbotAdmin:busy'
  }
  if (result.versionId === null) {
    return 'chatbotAdmin:empty'
  }
  return result.promoted ? 'chatbotAdmin:promoted' : 'chatbotAdmin:rejected'
}

export const ModelAdminPage = (): React.JSX.Element => {
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)
  const { versions, isLoading, error } = useModelVersions()
  const training = useStartModelTraining()
  const inExperiment = versions.some((version) => version.inExperiment)

  return (
    <section className="cb-page flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('chatbotAdmin:title')}</h1>
      <p className="text-sm text-muted">
        {inExperiment ? t('chatbotAdmin:experimentOn') : t('chatbotAdmin:experimentOff')}
      </p>
      <Button
        type="button"
        className="cb-btn cb-btn-primary"
        loading={training.isPending}
        onClick={() => {
          training.mutate()
        }}
      >
        {t('chatbotAdmin:train')}
      </Button>
      {training.data !== undefined ? (
        <p role="status">
          {t(outcomeKey(training.data))}
          {training.data.singleExampleLabels.length > 0
            ? ` ${t('chatbotAdmin:singleExamples', {
                labels: training.data.singleExampleLabels.join(', '),
              })}`
            : ''}
        </p>
      ) : null}
      {training.error !== null ? (
        <p role="alert">{describeFailure(training.error, t, language)}</p>
      ) : null}
      {isLoading ? <p role="status">{t('chatbotAdmin:loading')}</p> : null}
      {error !== null ? <p role="alert">{describeFailure(error, t, language)}</p> : null}
      <ul className="flex flex-col gap-3">
        {versions.map((version) => (
          <li key={version.versionId}>
            <VersionCard version={version} />
          </li>
        ))}
      </ul>
    </section>
  )
}

const VersionCard = ({ version }: { readonly version: ModelVersionRow }): React.JSX.Element => {
  const { t } = useTranslation()
  const stateKey = version.state === 'ACTIVE' ? 'chatbotAdmin:active' : 'chatbotAdmin:candidate'

  return (
    <Card title={t(stateKey)}>
      <p className="text-sm">
        {t('chatbotAdmin:accuracy')} {percent(version.accuracy)}
      </p>
      <p className="text-sm">
        {t('chatbotAdmin:macro')} {percent(version.macroF1)}
      </p>
      <p className="text-sm">
        {t('chatbotAdmin:precision')} {percent(version.precision)}
      </p>
      <p className="text-sm">
        {t('chatbotAdmin:ratings', {
          useful: String(version.useful),
          notUseful: String(version.notUseful),
        })}
      </p>
      {version.perIntentF1.length > 0 ? (
        <>
          <p className="mt-3 text-sm font-medium">{t('chatbotAdmin:perIntent')}</p>
          <ul className="text-sm">
            {version.perIntentF1.map((score) => (
              <li key={score.label}>
                {score.label} {percent(score.score)}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <ConfusionList version={version} />
    </Card>
  )
}

const ConfusionList = ({
  version,
}: {
  readonly version: ModelVersionRow
}): React.JSX.Element | null => {
  const { t } = useTranslation()
  if (version.perIntentF1.length === 0) {
    return null
  }
  const mismatches = version.confusion.filter((cell) => cell.actual !== cell.predicted)
  if (mismatches.length === 0) {
    return <p className="mt-2 text-sm">{t('chatbotAdmin:noConfusion')}</p>
  }
  return (
    <ul className="mt-2 text-sm">
      {mismatches.map((cell) => (
        <li key={`${cell.actual}:${cell.predicted}`}>
          {t('chatbotAdmin:confused', {
            actual: cell.actual,
            predicted: cell.predicted,
            count: String(cell.count),
          })}
        </li>
      ))}
    </ul>
  )
}
