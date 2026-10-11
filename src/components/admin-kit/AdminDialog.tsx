import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialogo modal de la consola (EN-031) para confirmaciones.
 *
 * Al abrir, el foco entra en el dialogo; queda atrapado (Tab y Shift+Tab dan
 * la vuelta); Escape o el velo cierran; al cerrar, el foco vuelve a donde
 * estaba. Se monta con un portal en `<body>` para no quedar encerrado en un
 * contenedor con `overflow` o `backdrop-filter`.
 *
 * Solo para pantallas que ya pedian una confirmacion: no sustituye un
 * `window.confirm` (eso cambiaria el comportamiento y sus pruebas).
 */
export const AdminDialog = ({
  open,
  title,
  onClose,
  children,
}: {
  readonly open: boolean
  readonly title: string
  readonly onClose: () => void
  readonly children: ReactNode
}): React.JSX.Element | null => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? dialogRef.current)?.focus()
    return () => {
      previous?.focus()
    }
  }, [open])

  if (!open) return null

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab' || dialogRef.current === null) return
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (first === undefined || last === undefined) {
      event.preventDefault()
      return
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className="ak-dialog-scrim"
      data-testid="admin-dialog-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="ak-dialog"
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className="ak-panel-title mb-3">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  )
}
