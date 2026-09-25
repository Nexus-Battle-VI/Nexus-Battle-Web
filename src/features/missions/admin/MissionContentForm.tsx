import { useId, type KeyboardEvent } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import type { MissionContent } from './missionContent'
import {
  errorsBySection,
  SECTIONS,
  type FieldErrors,
  type SectionId,
} from './missionContentValidation'
import { BossSection, EncountersSection, MasterSection } from './sectionsCombat'
import {
  GeneralSection,
  JsonSection,
  ObjectivesSection,
  RewardsSection,
  RulesSection,
} from './sectionsContent'

export interface MissionContentFormProps {
  readonly content: MissionContent
  readonly onChange: (content: MissionContent) => void
  readonly errors: FieldErrors
  readonly isNew: boolean
  readonly otherMissions: readonly { readonly missionId: string; readonly name: string }[]
  readonly section: SectionId
  readonly onSectionChange: (section: SectionId) => void
}

/**
 * El formulario de una mision, por pestañas. Cada pestaña marca cuantos campos
 * tiene por corregir para que ningun error quede escondido en otra.
 */
export const MissionContentForm = ({
  content,
  onChange,
  errors,
  isNew,
  otherMissions,
  section,
  onSectionChange,
}: MissionContentFormProps): React.JSX.Element => {
  const { t } = useTranslation()
  const prefix = useId()
  const tabId = (id: SectionId): string => `${prefix}-tab-${id}`
  const panelId = `${prefix}-panel`
  const counts = errorsBySection(errors)

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const steps: Readonly<Record<string, number>> = { ArrowRight: 1, ArrowLeft: -1 }
    const step = steps[event.key]
    const position = SECTIONS.findIndex((entry) => entry.id === section)
    const target =
      event.key === 'Home'
        ? SECTIONS[0]
        : event.key === 'End'
          ? SECTIONS[SECTIONS.length - 1]
          : step === undefined
            ? undefined
            : SECTIONS[(position + step + SECTIONS.length) % SECTIONS.length]
    if (target === undefined) return
    event.preventDefault()
    onSectionChange(target.id)
    document.getElementById(tabId(target.id))?.focus()
  }

  const props = { content, onChange, errors }
  const panels: Readonly<Record<SectionId, React.JSX.Element>> = {
    general: <GeneralSection {...props} isNew={isNew} otherMissions={otherMissions} />,
    objetivos: <ObjectivesSection {...props} />,
    encuentros: <EncountersSection {...props} />,
    jefe: <BossSection {...props} />,
    master: <MasterSection {...props} />,
    recompensas: <RewardsSection {...props} />,
    reglas: <RulesSection {...props} />,
    json: <JsonSection content={content} onChange={onChange} isNew={isNew} />,
  }

  return (
    <div className="flex flex-col">
      <div
        role="tablist"
        aria-label={t('admin:missions.form.tabsLabel')}
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {SECTIONS.map((entry) => {
          const selected = entry.id === section
          const count = counts.get(entry.id) ?? 0
          return (
            <button
              key={entry.id}
              id={tabId(entry.id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onKeyDown={onKeyDown}
              onClick={() => {
                onSectionChange(entry.id)
              }}
              className={clsx(
                '-mb-px inline-flex items-center gap-1.5 rounded-t-md border px-3 py-2 text-sm',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                selected
                  ? 'border-border border-b-surface-raised bg-surface-raised font-medium text-ink'
                  : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {entry.label}
              {count > 0 && (
                <>
                  <span
                    aria-hidden="true"
                    className="rounded-full bg-danger px-1.5 text-xs font-semibold text-white"
                  >
                    {count}
                  </span>
                  <span className="sr-only">
                    {t(
                      count === 1
                        ? 'admin:missions.form.fieldsToFix_one'
                        : 'admin:missions.form.fieldsToFix_other',
                      { count },
                    )}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(section)}
        tabIndex={0}
        className="pt-5 focus-visible:outline-none"
      >
        {panels[section]}
      </div>
    </div>
  )
}
