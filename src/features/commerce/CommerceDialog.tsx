import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** La capa nativa mantiene el foco dentro y lo devuelve al control que la abrió. */
export const CommerceDialog = ({
  title,
  onClose,
  children,
  floating = false,
  locked = false,
}: {
  readonly title: string
  readonly onClose: () => void
  readonly children: ReactNode
  readonly floating?: boolean
  readonly locked?: boolean
}): React.JSX.Element => {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => {
      element?.close()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      aria-label={title}
      className={`commerce-dialog${floating ? ' commerce-dialog-cart' : ''}`}
      onCancel={(event) => {
        event.preventDefault()
        if (!locked) onClose()
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <p className="text-xs font-medium text-muted">{title}</p>
        <button
          type="button"
          aria-label={`Cerrar ${title}`}
          disabled={locked}
          onClick={onClose}
          className="rounded-full p-2 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      {children}
    </dialog>
  )
}
