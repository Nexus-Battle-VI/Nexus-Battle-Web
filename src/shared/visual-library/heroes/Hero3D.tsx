import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'

import { registerHeroVisualResources } from './register-hero-visual-resources'
import { HERO_VISUAL_SPECS_BY_ID } from './hero-definitions'
import { visualResourceRegistry } from '../registry'
import { resolveVisualResource } from '../resolve-visual-resource'
import type { VisualResourceId } from '../visual-resource'
import type { HeroViewHandle } from './mount-hero-view'

// Efecto de modulo: registra los ocho heroes como READY la primera vez que
// algo importa `Hero3D` (directamente o via `./index`), sin depender de que
// el consumidor tambien haya importado `heroes/index.ts`. No depende de
// Three.js: es solo un registro de datos (ver `register-hero-visual-resources.ts`).
registerHeroVisualResources(visualResourceRegistry)

export interface Hero3DProps {
  /** Identificador estable (EN-026.1), p.ej. `guerrero-tanque`. */
  readonly heroId: VisualResourceId
  readonly className?: string
}

/**
 * Resultado del intento asincrono de montar la vista 3D. `'pending'` es el
 * unico valor inicial y no se establece de nuevo sincronamente dentro del
 * efecto: la elegibilidad (¿hay un recurso `READY` con especificacion?) se
 * deriva directamente en el render, sin `useState`, porque no depende de
 * ningun sistema externo.
 */
type MountOutcome = 'pending' | 'ready' | 'error'

/**
 * Representacion 3D reutilizable de un heroe. Unica implementacion para los
 * ocho heroes: no existe un componente por heroe (ver
 * `docs/visual-library/heroes-3d.md`).
 *
 * Resuelve `heroId` mediante la biblioteca visual de EN-026.2
 * (`resolveVisualResource`), nunca construye una ruta de asset a mano. Carga
 * Three.js mediante `import()` dinamico solo cuando hay un recurso `READY`
 * que mostrar, para no incluirlo en el bundle inicial. Si el recurso no esta
 * listo, el id es desconocido, o falla la inicializacion de WebGL, muestra un
 * fallback seguro sin lanzar.
 */
export const Hero3D = ({ heroId, className }: Hero3DProps): React.JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mountOutcome, setMountOutcome] = useState<MountOutcome>('pending')

  const resolution = useMemo(
    () => resolveVisualResource(visualResourceRegistry, heroId, 'hero'),
    [heroId],
  )
  const spec = HERO_VISUAL_SPECS_BY_ID.get(heroId)
  const displayName = spec?.displayName ?? heroId
  const eligible = resolution.descriptor.status === 'READY' && spec !== undefined

  useEffect(() => {
    if (!eligible) {
      return
    }

    let disposed = false
    let handle: HeroViewHandle | undefined

    const setup = async (): Promise<void> => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) {
        return
      }

      try {
        const { mountHeroView } = await import('./mount-hero-view')
        if (disposed) {
          return
        }
        handle = mountHeroView(canvas, container, spec)
        setMountOutcome('ready')
      } catch {
        // Fallo al inicializar WebGL (o al cargar el modulo): fallback
        // seguro, sin excepcion sin manejar.
        if (!disposed) {
          setMountOutcome('error')
        }
      }
    }

    void setup()

    return () => {
      disposed = true
      handle?.dispose()
    }
  }, [eligible, spec])

  const showCanvas = eligible && mountOutcome === 'ready'
  const fallbackMessage = !eligible
    ? resolution.isFallback
      ? `Vista previa no disponible para "${heroId}".`
      : 'Vista previa 3D no disponible en este entorno.'
    : mountOutcome === 'error'
      ? 'Vista previa 3D no disponible en este entorno.'
      : 'Cargando vista previa…'

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div
        ref={containerRef}
        className="relative aspect-square w-full overflow-hidden rounded-md bg-surface"
        role="img"
        aria-label={displayName}
      >
        <canvas ref={canvasRef} className="h-full w-full" hidden={!showCanvas} />
        {!showCanvas && (
          <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-muted">
            {fallbackMessage}
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-ink">{displayName}</p>
    </div>
  )
}
