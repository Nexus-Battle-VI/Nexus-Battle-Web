import type { TextareaHTMLAttributes } from 'react'

import { FIELD_CLASS } from './fieldStyles'
import { FieldShell } from './FieldShell'

export interface TextareaFieldProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id' | 'aria-describedby' | 'aria-invalid'
> {
  readonly label: string
  readonly hint?: string
  readonly error?: string | undefined
}

export const TextareaField = ({
  label,
  hint,
  error,
  required,
  className,
  rows = 5,
  ...rest
}: TextareaFieldProps): React.JSX.Element => (
  <FieldShell
    label={label}
    {...(hint === undefined ? {} : { hint })}
    error={error}
    required={required === true}
  >
    {({ id, describedBy, invalid }) => (
      <textarea
        id={id}
        rows={rows}
        className={className ?? FIELD_CLASS}
        aria-invalid={invalid}
        {...(describedBy === undefined ? {} : { 'aria-describedby': describedBy })}
        {...rest}
      />
    )}
  </FieldShell>
)
