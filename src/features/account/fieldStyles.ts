/**
 * Estilos compartidos de los campos de "Mi cuenta".
 *
 * Un unico lugar para el aspecto de los `<input>` de esta seccion, de modo que
 * el campo editable, el de solo lectura y el de contrasena se vean como una
 * misma familia. Usa los tokens del tema (`--nb-field`, `border`, `ink`,
 * `muted`), asi que sigue al tema Light/Dark sin colores propios.
 */
export const FIELD_CLASS =
  'block w-full rounded-md border border-border bg-[var(--nb-field)] px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger'

/**
 * Dato de solo lectura: NO se dibuja como un campo -sin recuadro ni fondo de
 * input-, para que se lea como informacion y no como algo editable. Solo una
 * linea inferior tenue lo separa de su etiqueta.
 */
export const READONLY_FIELD_CLASS =
  'block w-full border-b border-border/60 px-0 py-1.5 text-sm text-ink'

export const FIELD_LABEL_CLASS = 'block text-sm font-medium text-ink'

export const FIELD_HINT_CLASS = 'mt-1 text-xs text-muted'

export const FIELD_ERROR_CLASS = 'mt-1 text-xs text-danger'
