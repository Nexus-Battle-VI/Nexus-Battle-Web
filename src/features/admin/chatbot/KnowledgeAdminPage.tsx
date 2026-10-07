import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'
import { SelectField } from '@/components/ui/form/SelectField'
import { TextField } from '@/components/ui/form/TextField'
import { TextareaField } from '@/components/ui/form/TextareaField'
import { describeFailure } from '@/shared/i18n/errors'
import { useLanguage } from '@/shared/i18n/language'

import type { KnowledgeDocument, KnowledgeEntry } from './api'
import { exportKnowledge, importKnowledge } from './api'
import { useDeleteKnowledge, useKnowledgeEntries, useSaveKnowledge } from './useKnowledge'

import './chatbot-admin.css'

interface FormState {
  readonly intent: string
  readonly language: string
  readonly priority: string
  readonly answer: string
  readonly variations: string
  readonly view: string
}

const EMPTY: FormState = {
  intent: '',
  language: 'es',
  priority: '1',
  answer: '',
  variations: '',
  view: '',
}

const lines = (value: string): readonly string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

export const KnowledgeAdminPage = (): React.JSX.Element => {
  const { t } = useTranslation()
  const language = useLanguage((state) => state.language)
  const { entries, isLoading, error, reload } = useKnowledgeEntries()
  const save = useSaveKnowledge()
  const remove = useDeleteKnowledge()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [invalid, setInvalid] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const patch = (changes: Partial<FormState>): void => {
    setForm((current) => ({ ...current, ...changes }))
  }

  const edit = (entry: KnowledgeEntry): void => {
    setEditingId(entry.id)
    setInvalid(false)
    setForm({
      intent: entry.intent,
      language: entry.language,
      priority: String(entry.priority),
      answer: entry.answer,
      variations: entry.variations.join('\n'),
      view: entry.view ?? '',
    })
  }

  const reset = (): void => {
    setEditingId(null)
    setInvalid(false)
    setForm(EMPTY)
  }

  const submit = (event: React.SyntheticEvent): void => {
    event.preventDefault()
    const variations = lines(form.variations)
    const priority = Number(form.priority)
    if (form.intent.trim() === '' || form.answer.trim() === '' || variations.length === 0) {
      setInvalid(true)
      return
    }
    if (!Number.isInteger(priority)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    save.mutate(
      {
        id: editingId,
        draft: {
          intent: form.intent.trim(),
          language: form.language,
          priority,
          answer: form.answer.trim(),
          variations,
          view: form.view.trim() === '' ? null : form.view.trim(),
        },
      },
      { onSuccess: reset },
    )
  }

  return (
    <section className="cb-page flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('chatbotAdmin:dictionaryTitle')}</h1>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className="cb-btn"
          onClick={() => {
            void exportKnowledge()
              .then((document) => {
                const blob = new Blob([JSON.stringify(document, null, 2)], {
                  type: 'application/json',
                })
                const url = URL.createObjectURL(blob)
                const anchor = globalThis.document.createElement('a')
                anchor.href = url
                anchor.download = 'diccionario.json'
                anchor.click()
                URL.revokeObjectURL(url)
              })
              .catch(() => {
                setNotice(t('chatbotAdmin:fileFailed'))
              })
          }}
        >
          {t('chatbotAdmin:exportFile')}
        </Button>
        <Button
          variant="secondary"
          className="cb-btn"
          onClick={() => {
            fileRef.current?.click()
          }}
        >
          {t('chatbotAdmin:importFile')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          aria-label={t('chatbotAdmin:importFile')}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file === undefined) {
              return
            }
            void file
              .text()
              .then((text) => importKnowledge(JSON.parse(text) as KnowledgeDocument))
              .then((result) => {
                setNotice(
                  t('chatbotAdmin:imported', {
                    created: String(result.created),
                    skipped: String(result.skipped),
                    reinforced: String(result.reinforced ?? 0),
                  }),
                )
                reload()
              })
              .catch(() => {
                setNotice(t('chatbotAdmin:fileFailed'))
              })
          }}
        />
      </div>
      {notice !== null ? <p role="status">{notice}</p> : null}
      <Card title={editingId === null ? t('chatbotAdmin:newEntry') : t('chatbotAdmin:edit')}>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <TextField
            label={t('chatbotAdmin:intent')}
            value={form.intent}
            onChange={(event) => {
              patch({ intent: event.target.value })
            }}
          />
          <SelectField
            label={t('chatbotAdmin:language')}
            value={form.language}
            options={[
              { value: 'es', label: t('chatbotAdmin:spanish') },
              { value: 'en', label: t('chatbotAdmin:english') },
            ]}
            onChange={(event) => {
              patch({ language: event.target.value })
            }}
          />
          <TextField
            label={t('chatbotAdmin:priority')}
            type="number"
            value={form.priority}
            onChange={(event) => {
              patch({ priority: event.target.value })
            }}
          />
          <TextareaField
            label={t('chatbotAdmin:answer')}
            value={form.answer}
            rows={3}
            onChange={(event) => {
              patch({ answer: event.target.value })
            }}
          />
          <TextareaField
            label={t('chatbotAdmin:variations')}
            hint={t('chatbotAdmin:variationsHint')}
            value={form.variations}
            onChange={(event) => {
              patch({ variations: event.target.value })
            }}
          />
          <TextField
            label={t('chatbotAdmin:view')}
            value={form.view}
            onChange={(event) => {
              patch({ view: event.target.value })
            }}
          />
          {invalid ? <p role="alert">{t('chatbotAdmin:requiredEntry')}</p> : null}
          {save.error !== null ? (
            <p role="alert">{describeFailure(save.error, t, language)}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="cb-btn cb-btn-primary" loading={save.isPending}>
              {editingId === null ? t('chatbotAdmin:createEntry') : t('chatbotAdmin:saveEntry')}
            </Button>
            {editingId !== null ? (
              <Button variant="secondary" className="cb-btn" onClick={reset}>
                {t('chatbotAdmin:newEntry')}
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={entries.length === 0}
        emptyMessage={t('chatbotAdmin:emptyDictionary')}
      >
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Card title={`${entry.language}: ${entry.intent}`}>
                <p className="text-sm">{entry.answer}</p>
                <p className="mt-2 text-sm text-muted">
                  {t('chatbotAdmin:priority')} {String(entry.priority)}
                </p>
                {entry.view !== null ? (
                  <p className="text-sm text-muted">
                    {t('chatbotAdmin:view')} {entry.view}
                  </p>
                ) : null}
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {entry.variations.map((variation) => (
                    <li key={variation}>{variation}</li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    className="cb-btn"
                    onClick={() => {
                      edit(entry)
                    }}
                  >
                    {t('chatbotAdmin:edit')}
                  </Button>
                  <Button
                    variant="danger"
                    loading={remove.isPending}
                    onClick={() => {
                      remove.mutate(entry.id)
                    }}
                  >
                    {t('chatbotAdmin:remove')}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </QueryState>
    </section>
  )
}
