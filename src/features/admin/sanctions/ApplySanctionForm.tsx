import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Button, type ButtonVariant } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { describeFailure } from '@/shared/i18n/errors'
import { useLanguage } from '@/shared/i18n/language'
import { canApplyPermanentBan } from '@/shared/rbac'
import {
  applySanction as applySanctionDefault,
  SANCTION_REASON_CODES,
  type ApplySanctionInput,
  type SanctionReasonCode,
  type SanctionResponse,
  type SanctionType,
} from './api'

export type ApplySanctionTransport = typeof applySanctionDefault

export interface ApplySanctionFormProps {
  readonly targetAccountId: string
  /** Nombre visible del objetivo, cuando se conoce (busqueda administrativa). */
  readonly targetLabel?: string
  readonly actorRoles: readonly string[]
  /** Paleta de botones del contexto donde se monta (admin-kit vs Mi Cuenta). */
  readonly buttonVariants?: {
    readonly primary: ButtonVariant
    readonly secondary: ButtonVariant
    readonly danger: ButtonVariant
  }
  readonly onApplied: (sanction: SanctionResponse) => void
  readonly onCancel?: () => void
  readonly apply?: ApplySanctionTransport
}

type Step = 'form' | 'review'

const DEFAULT_VARIANTS = {
  primary: 'admin-primary',
  secondary: 'admin-ghost',
  danger: 'admin-danger',
} as const

const REASON_CODE_TRANSLATION_KEY: Readonly<Record<SanctionReasonCode, string>> = {
  OFFENSIVE_LANGUAGE: 'admin:sanctions.reasonCodes.OFFENSIVE_LANGUAGE',
  HARASSMENT: 'admin:sanctions.reasonCodes.HARASSMENT',
  FRAUD_OR_MANIPULATION: 'admin:sanctions.reasonCodes.FRAUD_OR_MANIPULATION',
  UNAUTHORIZED_SOFTWARE_OR_CHEATING: 'admin:sanctions.reasonCodes.UNAUTHORIZED_SOFTWARE_OR_CHEATING',
  IDENTITY_IMPERSONATION: 'admin:sanctions.reasonCodes.IDENTITY_IMPERSONATION',
  PRIVACY_POLICY_VIOLATION: 'admin:sanctions.reasonCodes.PRIVACY_POLICY_VIOLATION',
  TERMS_OF_SERVICE_VIOLATION: 'admin:sanctions.reasonCodes.TERMS_OF_SERVICE_VIOLATION',
  LEGAL_RELATIONSHIP_TERMINATION: 'admin:sanctions.reasonCodes.LEGAL_RELATIONSHIP_TERMINATION',
  AUCTION_TERMS_VIOLATION: 'admin:sanctions.reasonCodes.AUCTION_TERMS_VIOLATION',
  OTHER: 'admin:sanctions.reasonCodes.OTHER',
}

const TYPE_TRANSLATION_KEY: Readonly<Record<SanctionType, string>> = {
  WARNING: 'admin:sanctions.types.WARNING',
  TEMPORARY_SUSPENSION: 'admin:sanctions.types.TEMPORARY_SUSPENSION',
  PERMANENT_BAN: 'admin:sanctions.types.PERMANENT_BAN',
}

/**
 * Aplica una sancion sobre una cuenta (HU-42, §7.3.2 y §7.3.4): causal, tipo,
 * duracion/motivo, revision y -solo para un baneo definitivo- confirmacion
 * adicional explicita, antes de ejecutar.
 *
 * Reutilizable: lo monta tanto `AdminUsersSection` (busqueda administrativa,
 * Administrador/Super Administrador) como `SanctionsModerationPage`
 * (Moderador, superficie limitada). El backend (`SanctionPolicy`) es la
 * autoridad real sobre que tipo puede aplicar cada rol; aqui solo se OCULTA
 * el baneo para quien no lo tiene, nunca se asume que ocultarlo basta.
 */
export const ApplySanctionForm = ({
  targetAccountId,
  targetLabel,
  actorRoles,
  buttonVariants = DEFAULT_VARIANTS,
  onApplied,
  onCancel,
  apply = applySanctionDefault,
}: ApplySanctionFormProps): React.JSX.Element => {
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)
  const canBan = canApplyPermanentBan(actorRoles)

  const [step, setStep] = useState<Step>('form')
  const [reasonCode, setReasonCode] = useState<SanctionReasonCode | ''>('')
  const [type, setType] = useState<SanctionType | ''>('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [reason, setReason] = useState('')
  const [banConfirmed, setBanConfirmed] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (input: ApplySanctionInput) => apply(targetAccountId, input),
  })

  const availableTypes: readonly SanctionType[] = canBan
    ? ['WARNING', 'TEMPORARY_SUSPENSION', 'PERMANENT_BAN']
    : ['WARNING', 'TEMPORARY_SUSPENSION']

  const resetReview = (): void => {
    setStep('form')
    setBanConfirmed(false)
    mutation.reset()
  }

  const goToReview = (event: React.SyntheticEvent): void => {
    event.preventDefault()

    if (reasonCode === '' || type === '') {
      setFormError(t('admin:sanctions.form.selectRequired'))
      return
    }

    if (reason.trim().length === 0) {
      setFormError(t('admin:sanctions.form.reasonRequired'))
      return
    }

    if (type === 'TEMPORARY_SUSPENSION') {
      const minutes = Number(durationMinutes)
      if (!Number.isInteger(minutes) || minutes <= 0) {
        setFormError(t('admin:sanctions.form.durationRequired'))
        return
      }
    }

    setFormError(null)
    setStep('review')
  }

  const confirmAndApply = (): void => {
    if (reasonCode === '' || type === '') return

    const input: ApplySanctionInput = {
      type,
      reasonCode,
      reason: reason.trim(),
      ...(type === 'TEMPORARY_SUSPENSION' ? { suspensionDurationMinutes: Number(durationMinutes) } : {}),
    }

    mutation.mutate(input, {
      onSuccess: (sanction) => {
        onApplied(sanction)
      },
    })
  }

  if (step === 'review' && reasonCode !== '' && type !== '') {
    const canSubmit = type !== 'PERMANENT_BAN' || banConfirmed

    return (
      <div className="space-y-4">
        <dl className="grid gap-2 text-sm">
          {targetLabel !== undefined && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted">{t('admin:sanctions.review.target')}</dt>
              <dd className="font-semibold text-ink">{targetLabel}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <dt className="text-muted">{t('admin:sanctions.review.type')}</dt>
            <dd className="font-semibold text-ink">{t(TYPE_TRANSLATION_KEY[type])}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">{t('admin:sanctions.review.reasonCode')}</dt>
            <dd className="font-semibold text-ink">{t(REASON_CODE_TRANSLATION_KEY[reasonCode])}</dd>
          </div>
          {type === 'TEMPORARY_SUSPENSION' && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted">{t('admin:sanctions.review.duration')}</dt>
              <dd className="font-semibold text-ink">
                {t('admin:sanctions.review.durationMinutes', { minutes: durationMinutes })}
              </dd>
            </div>
          )}
        </dl>
        <p className="text-sm text-ink">{reason.trim()}</p>

        {type === 'PERMANENT_BAN' && (
          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={banConfirmed}
              onChange={(event) => {
                setBanConfirmed(event.target.checked)
              }}
            />
            {t('admin:sanctions.review.banConfirm')}
          </label>
        )}

        {mutation.isError && (
          <p role="alert" className="text-sm text-danger">
            {describeFailure(mutation.error, t, language)}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={buttonVariants.primary}
            loading={mutation.isPending}
            disabled={!canSubmit}
            onClick={confirmAndApply}
          >
            {t('admin:sanctions.review.confirm')}
          </Button>
          <Button type="button" variant={buttonVariants.secondary} onClick={resetReview}>
            {t('admin:sanctions.review.back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={goToReview} noValidate>
      <SelectField
        label={t('admin:sanctions.form.reasonCode')}
        value={reasonCode}
        placeholder={t('admin:sanctions.form.selectPlaceholder')}
        options={SANCTION_REASON_CODES.map((code) => ({
          value: code,
          label: t(REASON_CODE_TRANSLATION_KEY[code]),
        }))}
        onChange={(event) => {
          setReasonCode(event.target.value as SanctionReasonCode)
        }}
        required
      />

      <SelectField
        label={t('admin:sanctions.form.type')}
        value={type}
        placeholder={t('admin:sanctions.form.selectPlaceholder')}
        options={availableTypes.map((value) => ({ value, label: t(TYPE_TRANSLATION_KEY[value]) }))}
        onChange={(event) => {
          setType(event.target.value as SanctionType)
        }}
        required
      />

      {type === 'TEMPORARY_SUSPENSION' && (
        <TextField
          type="number"
          min={1}
          label={t('admin:sanctions.form.duration')}
          hint={t('admin:sanctions.form.durationHint')}
          value={durationMinutes}
          onChange={(event) => {
            setDurationMinutes(event.target.value)
          }}
          required
        />
      )}

      <TextareaField
        label={t('admin:sanctions.form.reason')}
        hint={t('admin:sanctions.form.reasonHint')}
        value={reason}
        onChange={(event) => {
          setReason(event.target.value)
        }}
        required
      />

      {formError !== null && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant={buttonVariants.primary}>
          {t('admin:sanctions.form.continue')}
        </Button>
        {onCancel !== undefined && (
          <Button type="button" variant={buttonVariants.secondary} onClick={onCancel}>
            {t('admin:sanctions.form.cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}
