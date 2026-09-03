/**
 * Aspecto compartido de los campos de formulario.
 *
 * Vivia en `features/account`. Se sube a `components/ui` porque ya no lo usa
 * una sola seccion: el alta de producto (HU-33) necesita exactamente la misma
 * familia visual, y duplicar las cadenas garantizaria que un dia las dos
 * copias dejaran de parecerse.
 *
 * Usa los tokens del tema (`--nb-field`, `border`, `ink`, `muted`, `danger`),
 * nunca un color propio, asi que sigue a Light/Dark sin ramas.
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
