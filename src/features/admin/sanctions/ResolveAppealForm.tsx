import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { describeFailure } from '@/shared/i18n/errors'
import { useLanguage } from '@/shared/i18n/language'
import {
  resolveAppeal as resolveAppealDefault,
  type AppealDecision,
  type AppealResponse,
} from './api'

export type ResolveAppealTransport = typeof resolveAppealDefault

export interface ResolveAppealFormProps {
  readonly appealId: string
  readonly onResolved: (appeal: AppealResponse) => void
  readonly onCancel: () => void
  readonly resolve?: ResolveAppealTransport
}

/**
 * Decision final de una apelacion (HU-42, §7.3.2). La autoridad real -si
 * quien decide puede resolver ESTA sancion- la comprueba `ResolveAppeal` en
 * Account (reutiliza `SanctionPolicy`); un Moderador que intente revertir un
 * baneo recibe 403 aqui mismo, traducido igual que cualquier otro rechazo.
 */
export const ResolveAppealForm = ({
  appealId,
  onResolved,
  onCancel,
  resolve = resolveAppealDefault,
}: ResolveAppealFormProps): React.JSX.Element => {
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)
  const [decision, setDecision] = useState<AppealDecision | ''>('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (input: { decision: AppealDecision; notes: string }) => resolve(appealId, input),
  })

  const submit = (event: React.SyntheticEvent): void => {
    event.preventDefault()

    if (decision === '') {
      setFormError(t('admin:appeals.form.decisionRequired'))
      return
    }

    if (notes.trim().length === 0) {
      setFormError(t('admin:appeals.form.notesRequired'))
      return
    }

    setFormError(null)
    mutation.mutate(
      { decision, notes: notes.trim() },
      {
        onSuccess: (appeal) => {
          onResolved(appeal)
        },
      },
    )
  }

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink">
          {t('admin:appeals.form.decision')}
        </legend>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            name={`decision-${appealId}`}
            value="UPHELD"
            checked={decision === 'UPHELD'}
            onChange={() => {
              setDecision('UPHELD')
            }}
          />
          {t('admin:appeals.decisions.UPHELD')}
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            name={`decision-${appealId}`}
            value="OVERTURNED"
            checked={decision === 'OVERTURNED'}
            onChange={() => {
              setDecision('OVERTURNED')
            }}
          />
          {t('admin:appeals.decisions.OVERTURNED')}
        </label>
      </fieldset>

      <TextareaField
        label={t('admin:appeals.form.notes')}
        hint={t('admin:appeals.form.notesHint')}
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value)
        }}
        required
      />

      {formError !== null && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}

      {mutation.isError && (
        <p role="alert" className="text-sm text-danger">
          {describeFailure(mutation.error, t, language)}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="admin-primary" loading={mutation.isPending}>
          {t('admin:appeals.form.submit')}
        </Button>
        <Button type="button" variant="admin-ghost" onClick={onCancel}>
          {t('admin:appeals.form.cancel')}
        </Button>
      </div>
    </form>
  )
}
