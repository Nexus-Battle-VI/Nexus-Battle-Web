import type { SelectHTMLAttributes } from 'react'

import { FIELD_CLASS } from './fieldStyles'
import { FieldShell } from './FieldShell'

export interface SelectOption {
  readonly value: string
  readonly label: string
}

export interface SelectFieldProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id' | 'aria-describedby' | 'aria-invalid' | 'children'
> {
  readonly label: string
  readonly hint?: string
  readonly error?: string | undefined
  readonly options: readonly SelectOption[]
  /** Opcion vacia inicial. Ausente = el campo empieza con la primera opcion. */
  readonly placeholder?: string
}

/**
 * Desplegable nativo.
 *
 * Es un `<select>` de verdad y no una lista propia: el nativo ya trae teclado,
 * lector de pantalla y el selector a pantalla completa del movil. Reimplementarlo
 * cuesta accesibilidad y no aporta nada que este formulario necesite.
 */
export const SelectField = ({
  label,
  hint,
  error,
  options,
  placeholder,
  required,
  className,
  ...rest
}: SelectFieldProps): React.JSX.Element => (
  <FieldShell
    label={label}
    {...(hint === undefined ? {} : { hint })}
    error={error}
    required={required === true}
  >
    {({ id, describedBy, invalid }) => (
      <select
        id={id}
        className={className ?? FIELD_CLASS}
        aria-invalid={invalid}
        {...(describedBy === undefined ? {} : { 'aria-describedby': describedBy })}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )}
  </FieldShell>
)
