import { useId, useRef, useState, type ReactNode } from 'react'

export interface AdminTab {
  readonly id: string
  readonly label: string
  readonly content: ReactNode
}

/**
 * Pestanas de la consola (EN-031), con el patron de teclado de WAI-ARIA:
 * flechas izquierda/derecha y Home/End mueven el foco Y activan la pestana;
 * solo la activa entra en el orden de tabulacion (roving tabindex).
 *
 * Controladas o no: con `selected` + `onSelect` las gobierna quien las usa
 * (por ejemplo, para recordar la pestana en la URL).
 */
export const AdminTabs = ({
  label,
  tabs,
  selected,
  onSelect,
}: {
  readonly label: string
  readonly tabs: readonly AdminTab[]
  readonly selected?: string | undefined
  readonly onSelect?: ((id: string) => void) | undefined
}): React.JSX.Element => {
  const [own, setOwn] = useState(tabs[0]?.id ?? '')
  const active = selected ?? own
  const baseId = useId()
  const refs = useRef(new Map<string, HTMLButtonElement>())

  const select = (id: string, focus: boolean): void => {
    setOwn(id)
    onSelect?.(id)
    if (focus) refs.current.get(id)?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const index = tabs.findIndex((tab) => tab.id === active)
    const last = tabs.length - 1
    const target =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (target === null) return
    event.preventDefault()
    const tab = tabs[target]
    if (tab !== undefined) select(tab.id, true)
  }

  const current = tabs.find((tab) => tab.id === active)

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label={label} className="ak-tabs" onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              ref={(element) => {
                if (element === null) refs.current.delete(tab.id)
                else refs.current.set(tab.id, element)
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className="ak-tab focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              onClick={() => {
                select(tab.id, false)
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {current !== undefined && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${current.id}`}
          aria-labelledby={`${baseId}-tab-${current.id}`}
          tabIndex={0}
        >
          {current.content}
        </div>
      )}
    </div>
  )
}
