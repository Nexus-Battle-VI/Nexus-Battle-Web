import { useId, useRef, type ComponentType, type KeyboardEvent, type ReactNode } from 'react'
import clsx from 'clsx'

type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

export interface MetricsTab {
  readonly id: string
  readonly label: string
  readonly icon: IconType
  readonly content: ReactNode
}

/**
 * Pestanas de las secciones de metricas: una sola seccion visible a la vez, para no
 * obligar a recorrer cinco bloques seguidos. Al entrar ninguna esta abierta: se ven solo los
 * nombres y el contenido aparece al elegir uno.
 *
 * Patron WAI-ARIA de pestanas con activacion automatica: `tablist` > `tab` +
 * `tabpanel`, `aria-selected`, `tabindex` itinerante (solo la activa entra por Tab) y
 * flechas izquierda/derecha, Inicio y Fin para moverse. Presionar la abierta la cierra. Los cinco nombres siempre se ven, sin
 * desplazamiento: tres arriba y dos abajo en pantallas estrechas, una fila desde `sm`.
 */
export const MetricsTabs = ({
  tabs,
  activeId,
  onChange,
  label,
}: {
  readonly tabs: readonly MetricsTab[]
  /** `null`: ninguna abierta (estado inicial, solo se ven los nombres). */
  readonly activeId: string | null
  readonly onChange: (id: string | null) => void
  readonly label: string
}): React.JSX.Element => {
  const base = useId()
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const active = tabs.find((tab) => tab.id === activeId)

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const last = tabs.length - 1
    const target =
      event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null

    const next = target === null ? undefined : tabs[target]

    if (next === undefined) {
      return
    }

    event.preventDefault()
    onChange(next.id)
    refs.current[next.id]?.focus()
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div
        role="tablist"
        aria-label={label}
        className="am-tabs grid grid-cols-3 gap-1 sm:grid-cols-5"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === active?.id
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              ref={(element) => {
                refs.current[tab.id] = element
              }}
              id={`${base}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={selected || (active === undefined && index === 0) ? 0 : -1}
              onClick={() => {
                // Volver a presionar la abierta la cierra; el teclado solo mueve.
                onChange(selected ? null : tab.id)
              }}
              onKeyDown={(event) => {
                move(event, index)
              }}
              className={clsx(
                'am-tab flex flex-col items-center justify-start gap-1 px-1.5 py-2 text-center text-xs leading-tight font-medium sm:flex-row sm:justify-center sm:gap-2 sm:px-2',
                'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand',
              )}
            >
              <Icon aria-hidden className="h-4 w-4 flex-none" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {active !== undefined && (
        <div
          role="tabpanel"
          id={`${base}-panel-${active.id}`}
          aria-labelledby={`${base}-tab-${active.id}`}
          className="min-w-0"
        >
          {active.content}
        </div>
      )}
    </div>
  )
}
