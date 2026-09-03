import type { InputHTMLAttributes } from 'react'

import { FIELD_CLASS } from './fieldStyles'
import { FieldShell } from './FieldShell'

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'aria-describedby' | 'aria-invalid'
> {
  readonly label: string
  readonly hint?: string
  readonly error?: string | undefined
}

export const TextField = ({
  label,
  hint,
  error,
  required,
  className,
  ...rest
}: TextFieldProps): React.JSX.Element => (
  <FieldShell
    label={label}
    {...(hint === undefined ? {} : { hint })}
    error={error}
    required={required === true}
  >
    {({ id, describedBy, invalid }) => (
      <input
        id={id}
        className={className ?? FIELD_CLASS}
        aria-invalid={invalid}
        {...(describedBy === undefined ? {} : { 'aria-describedby': describedBy })}
        {...rest}
      />
    )}
  </FieldShell>
)
