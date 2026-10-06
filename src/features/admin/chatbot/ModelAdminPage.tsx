import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { describeFailure } from '@/shared/i18n/errors'
import { useLanguage } from '@/shared/i18n/language'

import type { ModelVersionRow, TrainingResult } from './api'
import { useModelVersions, useStartModelTraining } from './useModelAdmin'

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
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">{t('chatbotAdmin:title')}</h1>
      <p className="text-sm text-muted">
        {inExperiment ? t('chatbotAdmin:experimentOn') : t('chatbotAdmin:experimentOff')}
      </p>
      <Button
        type="button"
        variant="primary"
        loading={training.isPending}
        onClick={() => {
          training.mutate()
        }}
      >
        {t('chatbotAdmin:train')}
      </Button>
      {training.data !== undefined ? <p role="status">{t(outcomeKey(training.data))}</p> : null}
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
    </Card>
  )
}
