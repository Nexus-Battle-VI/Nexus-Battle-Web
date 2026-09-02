import { Link } from 'react-router'

export interface Crumb {
  readonly label: string
  /** Ausente = es la posicion actual y no se enlaza. */
  readonly to?: string
}

/**
 * Migas de pan.
 *
 * La ultima NO es un enlace: enlazar a la pagina en la que ya se esta no lleva
 * a ningun sitio y anade una parada mas al recorrido por teclado. Se marca con
 * `aria-current="page"`, que es lo que la identifica sin depender del color.
 */
export const Breadcrumb = ({ items }: { readonly items: readonly Crumb[] }): React.JSX.Element => (
  <nav aria-label="Ruta de navegacion">
    <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
      {items.map((item, index) => (
        <li key={item.label} className="flex items-center gap-1.5">
          {index > 0 && (
            <span aria-hidden="true" className="text-muted/60">
              ›
            </span>
          )}
          {item.to === undefined ? (
            <span aria-current="page" className="text-ink">
              {item.label}
            </span>
          ) : (
            <Link
              to={item.to}
              className="text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {item.label}
            </Link>
          )}
        </li>
      ))}
    </ol>
  </nav>
)
