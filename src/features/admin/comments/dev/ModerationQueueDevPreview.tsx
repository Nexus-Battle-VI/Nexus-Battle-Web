import { useEffect } from 'react'

import { ModerationQueuePage } from '../ModerationQueuePage'
import { handleModerationRequest } from './moderationQueueSimulation'

/**
 * Vista previa de desarrollo de la cola de moderación (HU-41.4).
 *
 * Existe por la misma razón que `CreateProductDevPreview`: la pantalla real
 * vive tras `RequireModerator` y necesita Community respondiendo de verdad, y
 * el entorno local no levanta ese servicio. Sin esto, revisar el diseño
 * obligaría a desplegar el stack completo.
 *
 * NO ES UNA PUERTA TRASERA. Solo existe con `import.meta.env.DEV` -- Vite
 * elimina la rama entera en producción -- y NO monta la ruta productiva.
 * A diferencia de `CreateProductDevPreview` (que resuelve el envío sin tocar
 * la red), aquí se intercepta `fetch` para las rutas de `/api/comments/*`
 * mientras el preview está montado: es la forma de ver el flujo REAL
 * -incluida la actualización de la insignia tras una acción, y el borrado
 * físico tras eliminar (HU-41.9)- sin depender de `ModerationQueuePage`
 * aceptando transportes inyectables que la pantalla productiva no necesita.
 */
export const ModerationQueueDevPreview = (): React.JSX.Element => {
  useEffect(() => {
    const original = globalThis.fetch

    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

      if (url.includes('/api/comments/')) {
        return Promise.resolve(handleModerationRequest(url, init))
      }

      return original(input, init)
    }

    return () => {
      globalThis.fetch = original
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl p-6">
      <p className="mb-4 rounded-md border border-border bg-surface/40 px-4 py-2 text-xs text-muted">
        Vista previa de desarrollo. La cola y las acciones de moderación están simuladas: no llegan
        a Community.
      </p>
      <ModerationQueuePage />
    </div>
  )
}
