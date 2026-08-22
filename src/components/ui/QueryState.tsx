import type { ReactNode } from 'react'

import { HttpError } from '@/lib/http'

export interface QueryStateProps {
  readonly isLoading: boolean
  readonly error: unknown
  readonly isEmpty?: boolean
  readonly emptyMessage?: string
  readonly children: ReactNode
}

const describe = (error: unknown): string => {
  if (error instanceof HttpError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Ocurrio un error inesperado al consultar el servicio.'
}

/**
 * Estados de una consulta: cargando, error, vacio o contenido.
 *
 * Centralizarlos evita que cada pantalla invente su propia manera de mostrar un
 * fallo, y garantiza que **el estado vacio nunca se confunda con un error**:
 * son situaciones distintas y quien usa la aplicacion necesita distinguirlas.
 */
export const QueryState = ({
  isLoading,
  error,
  isEmpty = false,
  emptyMessage = 'No hay elementos para mostrar.',
  children,
}: QueryStateProps): React.JSX.Element => {
  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted">
        Cargando...
      </p>
    )
  }

  if (error !== null && error !== undefined) {
    return (
      <p role="alert" className="text-sm text-danger">
        {describe(error)}
      </p>
    )
  }

  if (isEmpty) {
    return <p className="text-sm text-muted">{emptyMessage}</p>
  }

  return <>{children}</>
}
