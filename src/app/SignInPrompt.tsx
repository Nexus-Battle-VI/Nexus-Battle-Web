import { Link } from 'react-router'

export interface SignInPromptProps {
  /** Por que hace falta identificarse en este punto concreto. */
  readonly description: string
  /** Cancelar es una navegacion real (vuelve a una ruta), no cerrar una capa. */
  readonly cancelHref?: string
  /** Cancelar cierra una capa (dialogo) en vez de navegar a otra ruta. */
  readonly onCancel?: () => void
  /**
   * `h1` cuando el aviso ES la pantalla entera (`RequireSession`); `h2` (por
   * defecto) cuando vive dentro de un dialogo que ya tiene su propio titulo
   * de nivel superior (p. ej. el aviso de "anadir al carrito" sin sesion).
   */
  readonly headingTag?: 'h1' | 'h2'
}

const CTA_CLASS =
  'inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

/**
 * Invitación a identificarse: "Iniciar sesión" o "Crear cuenta".
 *
 * Compartida entre `RequireSession` (ruta completa sin sesión) y el aviso de
 * e-commerce al añadir al carrito sin cuenta (Commerce, navegación de
 * invitado): mismo texto, mismos dos caminos, para no mantener dos copias que
 * puedan desalinearse.
 *
 * Ninguno de los dos botones navega con estado de retorno: HU-02 ya redirige
 * a `/ecommerce` tras un login o registro exitoso, que es adonde este aviso
 * siempre aparece. Inventar un "volver a donde estaba" sería una ruta nueva
 * que ningún flujo actual necesita.
 */
export const SignInPrompt = ({
  description,
  cancelHref,
  onCancel,
  headingTag: Heading = 'h2',
}: SignInPromptProps): React.JSX.Element => (
  <div className="w-full max-w-sm text-center">
    <Heading className="text-xl font-semibold text-ink">Para continuar</Heading>
    <p className="mt-2 text-sm text-muted">{description}</p>

    <div className="mt-6 flex flex-col gap-3">
      <Link to="/login" className={`${CTA_CLASS} bg-brand text-brand-ink`}>
        Iniciar sesión
      </Link>
      <Link
        to="/register"
        className={`${CTA_CLASS} border border-border bg-surface-raised text-ink`}
      >
        Crear cuenta
      </Link>
    </div>

    {cancelHref !== undefined && (
      <Link to={cancelHref} className="mt-4 inline-block text-sm text-muted underline">
        Cancelar
      </Link>
    )}
    {onCancel !== undefined && (
      <button
        type="button"
        onClick={onCancel}
        className="mt-4 inline-block text-sm text-muted underline"
      >
        Cancelar
      </button>
    )}
  </div>
)
