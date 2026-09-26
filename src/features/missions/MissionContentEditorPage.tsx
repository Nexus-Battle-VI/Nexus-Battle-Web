import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { QueryState } from '@/components/ui/QueryState'
import { HttpError } from '@/lib/http'
import { useSession } from '@/shared/session'

import { MissionContentForm } from './admin/MissionContentForm'
import {
  CATEGORY_LABELS,
  duplicateMission,
  newMission,
  prepareForSave,
  type MissionContent,
} from './admin/missionContent'
import {
  describeSaveFailure,
  fetchMissionContents,
  saveMissionContent,
} from './admin/missionContentApi'
import {
  errorsBySection,
  fieldOfServerPath,
  pathOfServerMessage,
  SECTIONS,
  sectionOf,
  validateMissionContent,
  type FieldErrors,
  type SectionId,
} from './admin/missionContentValidation'
import { i18n } from '@/shared/i18n/i18n'

interface Draft {
  readonly content: MissionContent
  readonly isNew: boolean
  /** La mision tal como esta guardada (o como se creo): sin cambios mientras coincida. */
  readonly original: string
}

interface SaveProblem {
  readonly message: string
  /** El campo que nombra Missions, si lo nombra y el formulario lo conoce. */
  readonly field: string | null
}

interface SwitchRequest {
  readonly label: string
  readonly run: () => void
}

const draftOf = (content: MissionContent, isNew: boolean): Draft => ({
  content,
  isNew,
  original: JSON.stringify(content),
})

/**
 * Editor de contenido de misiones (`/admin/missions`), solo para
 * administradores. Es un formulario por pestañas sobre la misma definicion que
 * guarda Missions: el administrador ya no escribe JSON (queda como pestaña
 * avanzada). Web valida antes de enviar para decir el problema junto al campo;
 * quien decide sigue siendo Missions, cuyo rechazo tambien se muestra.
 */
export const MissionContentEditorPage = (): React.JSX.Element => {
  const { t } = useTranslation()
  const subject = useSession((state) => state.subject)
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [section, setSection] = useState<SectionId>('general')
  const [showErrors, setShowErrors] = useState(false)
  const [problem, setProblem] = useState<SaveProblem | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [switchRequest, setSwitchRequest] = useState<SwitchRequest | null>(null)

  const missions = useQuery({
    queryKey: ['admin', 'missions', subject],
    queryFn: ({ signal }) => fetchMissionContents(signal),
    enabled: subject !== null,
  })
  const list = missions.data ?? []
  const takenIds = new Set(list.map((mission) => mission.missionId))
  const dirty = draft !== null && JSON.stringify(draft.content) !== draft.original

  const save = useMutation({
    mutationFn: saveMissionContent,
    onSuccess: (saved) => {
      setDraft(draftOf(saved, false))
      setShowErrors(false)
      setProblem(null)
      setNotice(i18n.t('admin:missions.editor.savedNotice', { name: saved.name }))
      void queryClient.invalidateQueries({ queryKey: ['admin', 'missions'] })
      void queryClient.invalidateQueries({ queryKey: ['missions'] })
    },
    onError: (error, sent) => {
      const serverPath =
        error instanceof HttpError && error.status === 400
          ? pathOfServerMessage(error.message)
          : null
      const field = serverPath === null ? null : fieldOfServerPath(serverPath, sent)
      setProblem({ message: describeSaveFailure(error), field })
      if (field !== null) setSection(sectionOf(field))
    },
  })

  const open = (next: Draft): void => {
    setDraft(next)
    setFormKey((key) => key + 1)
    setSection('general')
    setShowErrors(false)
    setProblem(null)
    setNotice(null)
    setSwitchRequest(null)
  }

  /** Cambiar de mision con cambios sin guardar pide confirmacion en la pagina. */
  const openGuarded = (label: string, next: () => Draft): void => {
    if (dirty) {
      setSwitchRequest({
        label,
        run: () => {
          open(next())
        },
      })
      return
    }
    open(next())
  }

  const change = (content: MissionContent): void => {
    setDraft((current) => (current === null ? current : { ...current, content }))
    setNotice(null)
    setProblem((current) => (current === null ? null : { ...current, field: null }))
  }

  const clientErrors: FieldErrors =
    draft === null ? {} : validateMissionContent(draft.content, { isNew: draft.isNew, takenIds })
  const problemField = problem?.field ?? null
  const shownErrors: FieldErrors = {
    ...(showErrors ? clientErrors : {}),
    ...(problem !== null && problemField !== null ? { [problemField]: problem.message } : {}),
  }
  const errorSections = errorsBySection(clientErrors)
  const hasClientErrors = Object.keys(clientErrors).length > 0

  const handleSave = (): void => {
    if (draft === null) return
    setNotice(null)
    setProblem(null)
    setShowErrors(true)
    const first = Object.keys(clientErrors)[0]
    if (first !== undefined) {
      setSection(sectionOf(first))
      return
    }
    save.mutate(prepareForSave(draft.content))
  }

  return (
    <section aria-label={t('admin:missions.editor.label')} className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">{t('admin:missions.editor.title')}</h1>
        <p className="mt-2 text-sm text-muted">{t('admin:missions.editor.subtitle')}</p>
      </header>
      <QueryState isLoading={missions.isPending} error={missions.error}>
        <div className="grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <nav aria-label={t('admin:missions.editor.navLabel')} className="flex flex-col gap-3">
            {list.length === 0 ? (
              <p className="text-sm text-muted">{t('admin:missions.editor.noMissionsYet')}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {list.map((mission) => {
                  const current =
                    draft !== null && !draft.isNew && draft.content.missionId === mission.missionId
                  return (
                    <li key={mission.missionId}>
                      <button
                        type="button"
                        aria-current={current ? 'true' : undefined}
                        onClick={() => {
                          openGuarded(`«${mission.name}»`, () => draftOf(mission, false))
                        }}
                        className={clsx(
                          'w-full rounded-md border px-3 py-2 text-left text-sm',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                          current
                            ? 'border-brand bg-surface-raised text-ink'
                            : 'border-border text-ink hover:bg-surface-raised',
                        )}
                      >
                        <span className="block font-medium">{mission.name}</span>
                        <span className="block text-xs text-muted">
                          {CATEGORY_LABELS[mission.category]} ·{' '}
                          {mission.active
                            ? t('admin:missions.editor.published')
                            : t('admin:missions.editor.unpublished')}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <Button
              onClick={() => {
                openGuarded(t('admin:missions.editor.aNewMission'), () =>
                  draftOf(newMission(takenIds), true),
                )
              }}
            >
              {t('admin:missions.editor.newMission')}
            </Button>
          </nav>

          <div className="flex min-w-0 flex-col gap-4">
            {switchRequest !== null && (
              <div
                role="alertdialog"
                aria-labelledby="cambios-sin-guardar"
                className="rounded-md border border-border bg-surface-raised p-4"
              >
                <p id="cambios-sin-guardar" className="text-sm text-ink">
                  {t('admin:missions.editor.unsavedChangesTitle', { label: switchRequest.label })}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="danger" onClick={switchRequest.run}>
                    {t('admin:missions.editor.discardAndOpen')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSwitchRequest(null)
                    }}
                  >
                    {t('admin:missions.editor.keepEditing')}
                  </Button>
                </div>
              </div>
            )}

            {draft === null ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
                {t('admin:missions.editor.chooseOrCreate')}
              </p>
            ) : (
              <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-ink">
                      {draft.isNew
                        ? t('admin:missions.editor.newMission')
                        : t('admin:missions.editor.editingTitle', { name: draft.content.name })}
                    </h2>
                    <p className="text-xs text-muted">{draft.content.missionId}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted">
                      {dirty
                        ? t('admin:missions.editor.unsavedChanges')
                        : draft.isNew
                          ? t('admin:missions.editor.notSavedYet')
                          : t('admin:missions.editor.noChanges')}
                    </span>
                    <Button
                      variant="secondary"
                      disabled={!dirty}
                      onClick={() => {
                        open({ ...draft, content: JSON.parse(draft.original) as MissionContent })
                      }}
                    >
                      {t('admin:missions.editor.discardChanges')}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        open(draftOf(duplicateMission(draft.content, takenIds), true))
                      }}
                    >
                      {t('admin:missions.editor.duplicate')}
                    </Button>
                    <Button loading={save.isPending} onClick={handleSave}>
                      {t('admin:missions.editor.save')}
                    </Button>
                  </div>
                </div>

                {notice !== null && (
                  <p role="status" className="text-sm text-ink">
                    {notice}
                  </p>
                )}
                {problem !== null && (
                  <div
                    role="alert"
                    className="rounded-md border border-danger p-3 text-sm text-ink"
                  >
                    <p className="font-medium">{t('admin:missions.editor.notSaved')}</p>
                    <p className="mt-1">{problem.message}</p>
                  </div>
                )}
                {showErrors && hasClientErrors && (
                  <div
                    role="alert"
                    className="rounded-md border border-danger p-3 text-sm text-ink"
                  >
                    <p className="font-medium">{t('admin:missions.editor.fieldsToFixTitle')}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {SECTIONS.filter((entry) => errorSections.has(entry.id)).map((entry) => (
                        <Button
                          key={entry.id}
                          variant="secondary"
                          onClick={() => {
                            setSection(entry.id)
                          }}
                        >
                          {t('admin:missions.editor.goTo', { section: entry.label })}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <MissionContentForm
                  key={formKey}
                  content={draft.content}
                  onChange={change}
                  errors={shownErrors}
                  isNew={draft.isNew}
                  otherMissions={list
                    .filter((mission) => mission.missionId !== draft.content.missionId)
                    .map((mission) => ({ missionId: mission.missionId, name: mission.name }))}
                  section={section}
                  onSectionChange={setSection}
                />
              </div>
            )}
          </div>
        </div>
      </QueryState>
    </section>
  )
}
