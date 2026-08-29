import { HERO_IDS } from './hero-ids'
import { Hero3D } from './Hero3D'

/**
 * Harness de verificacion tecnica/humana para EN-026.3 (Task #270).
 *
 * NO es una pantalla del producto: no implementa HU-07 (seleccion de heroe),
 * no tiene logica de seleccion funcional, no persiste nada y no aparece en
 * `NAVIGATION`. Su unico proposito es permitir inspeccionar juntos los 8/8
 * heroes con el mismo `Hero3D` reutilizable antes del commit. Solo se monta
 * en desarrollo (`import.meta.env.DEV`), ver `src/routes/routes.tsx`.
 */
export const HeroesDevPreview = (): React.JSX.Element => (
  <div className="min-h-dvh bg-surface p-8 text-ink">
    <p className="mb-1 text-xs font-medium tracking-wide text-muted uppercase">
      EN-026.3 · Herramienta de verificación técnica, no una pantalla del producto
    </p>
    <h1 className="mb-6 text-xl font-semibold">Vista previa de héroes 3D ({HERO_IDS.length}/8)</h1>
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {HERO_IDS.map((heroId) => (
        <li key={heroId} className="rounded-md border border-border bg-surface-raised p-3">
          <Hero3D heroId={heroId} />
        </li>
      ))}
    </ul>
  </div>
)
