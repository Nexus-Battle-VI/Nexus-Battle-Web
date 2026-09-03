import clsx from 'clsx'

export interface StepDefinition {
  readonly id: string
  readonly label: string
}

export interface StepperProps {
  readonly steps: readonly StepDefinition[]
  /** Indice del paso visible, base 0. */
  readonly current: number
  /**
   * Ultimo paso alcanzado. Los anteriores son navegables hacia atras; los
   * posteriores no, porque el formulario aun no sabe si son validos.
   */
  readonly reached: number
  readonly onSelect: (index: number) => void
  readonly label: string
}

/**
 * Indicador de progreso de un formulario por pasos.
 *
 * ES NAVEGACION, NO DECORACION. Cada paso ya visitado es un boton real: quien
 * llega al resumen y ve un dato mal puede volver con un clic en lugar de
 * retroceder de uno en uno. Los pasos que aun no se han alcanzado se
 * deshabilitan, porque saltar a ellos permitiria enviar el formulario sin
 * pasar por validaciones que todavia no se han ejecutado.
 *
 * `aria-current="step"` marca el paso vigente. Sin el, la unica senal de donde
 * se esta seria la barra de color, que no existe para quien no la ve.
 */
export const Stepper = ({
  steps,
  current,
  reached,
  onSelect,
  label,
}: StepperProps): React.JSX.Element => (
  <nav aria-label={label} className="border-b border-border px-2 pt-2">
    <ol className="flex flex-wrap">
      {steps.map((step, index) => {
        const isCurrent = index === current
        const isNavigable = index <= reached

        return (
          <li key={step.id} className="min-w-[8rem] flex-1">
            <button
              type="button"
              disabled={!isNavigable}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => {
                onSelect(index)
              }}
              className={clsx(
                'w-full px-3 pb-2 pt-1.5 text-center text-xs font-semibold transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                isCurrent ? 'text-ink' : 'text-muted',
                isNavigable ? 'hover:text-ink' : 'cursor-not-allowed opacity-60',
              )}
            >
              <span className="block truncate">
                {index + 1}. {step.label}
              </span>
              <span
                aria-hidden="true"
                className={clsx(
                  'mt-2 block h-0.5 rounded-full',
                  isCurrent ? 'bg-brand' : 'bg-transparent',
                )}
              />
            </button>
          </li>
        )
      })}
    </ol>
  </nav>
)
