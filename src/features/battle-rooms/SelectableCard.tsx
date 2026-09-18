import clsx from 'clsx'

export interface SelectableCardProps {
  readonly selected: boolean
  readonly title: string
  readonly description?: string
  readonly onSelect: () => void
}

/**
 * Tarjeta seleccionable de un `role="radiogroup"` (Modalidad, Formato).
 *
 * Es un `<button role="radio">`, no un `<div>` con `onClick`: el teclado
 * (Tab + Espacio/Enter) y el foco los da gratis el elemento nativo. La
 * selección se comunica por `aria-checked` y por el acento visual, nunca
 * solo por color (el título/descripcion siguen siendo texto real).
 *
 * La transición de "presión" (`active:scale`) respeta
 * `prefers-reduced-motion` vía las variantes `motion-safe:` de Tailwind, sin
 * CSS aparte.
 */
export const SelectableCard = ({
  selected,
  title,
  description,
  onSelect,
}: SelectableCardProps): React.JSX.Element => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    className={clsx(
      'flex flex-1 flex-col gap-1 rounded-lg border p-3 text-left transition-colors motion-safe:duration-150 motion-safe:ease-out',
      'motion-safe:active:scale-[0.98]',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
      selected
        ? 'border-brand bg-brand/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
        : 'border-border bg-surface hover:border-brand/50 hover:bg-surface-raised',
    )}
  >
    <span className={clsx('text-sm font-semibold', selected ? 'text-brand' : 'text-ink')}>
      {title}
    </span>
    {description !== undefined && <span className="text-xs text-muted">{description}</span>}
  </button>
)
