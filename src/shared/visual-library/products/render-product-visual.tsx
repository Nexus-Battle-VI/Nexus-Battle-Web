import type { ProductCategory } from './product-catalog'
import type { ProductVisualSpec } from './product-visual-definitions'

/**
 * Traduce un `ProductVisualSpec` a geometria SVG. Es el unico punto del
 * modulo que dibuja algo: no existe un componente por producto ni por
 * familia (equivalente 2D de `buildHeroDetail` en EN-026.3). Cada familia
 * tiene una unica forma reutilizada por sus miembros; la unica variacion
 * entre productos de la misma familia es puramente decorativa y
 * deterministica (`spec.seed`), documentada en `product-visual-definitions.ts`.
 *
 * Todas las formas comparten el mismo `viewBox` (`0 0 64 64`, ver
 * `ProductVisual2D.tsx`) para que el tamaño de renderizado sea responsivo sin
 * recalcular geometria.
 */

/** Angulo decorativo estable en el rango [-18, 18] grados, sin significado funcional. */
const seedAngle = (seed: number): number => (seed % 36) - 18

const renderWeaponGlyph = (spec: ProductVisualSpec): React.ReactNode => (
  <g
    stroke={spec.accentColor}
    strokeWidth={4}
    strokeLinecap="round"
    fill="none"
    transform={`rotate(${seedAngle(spec.seed).toString()} 32 32)`}
  >
    <line x1="18" y1="46" x2="42" y2="18" />
    <rect
      x="14"
      y="40"
      width="12"
      height="7"
      rx="1.5"
      fill={spec.accentColor}
      stroke="none"
      transform="rotate(45 20 43.5)"
    />
  </g>
)

const renderArmorGlyph = (spec: ProductVisualSpec): React.ReactNode => (
  <g transform={`rotate(${(seedAngle(spec.seed) / 3).toString()} 32 32)`}>
    <path
      d="M32 12 L48 18 V32 C48 42 41 49 32 52 C23 49 16 42 16 32 V18 Z"
      fill={spec.accentColor}
      opacity="0.9"
    />
    <path d="M32 20 L40 24 V32 C40 38 36.5 42.5 32 44.5 V20 Z" fill={spec.primaryColor} />
  </g>
)

const renderItemGlyph = (spec: ProductVisualSpec): React.ReactNode => (
  <g transform={`rotate(${seedAngle(spec.seed).toString()} 32 32)`}>
    <rect x="18" y="18" width="28" height="28" rx="6" fill={spec.accentColor} />
    <circle cx="32" cy="32" r="5" fill={spec.primaryColor} />
  </g>
)

const renderActionGlyph = (spec: ProductVisualSpec): React.ReactNode => {
  const rays = 5
  const baseAngle = seedAngle(spec.seed)
  return (
    <g stroke={spec.accentColor} strokeWidth={4} strokeLinecap="round">
      <circle cx="32" cy="32" r="9" fill={spec.accentColor} stroke="none" />
      {Array.from({ length: rays }, (_, index) => {
        const angleDeg = baseAngle + (360 / rays) * index
        const angleRad = (angleDeg * Math.PI) / 180
        const x1 = 32 + 14 * Math.cos(angleRad)
        const y1 = 32 + 14 * Math.sin(angleRad)
        const x2 = 32 + 26 * Math.cos(angleRad)
        const y2 = 32 + 26 * Math.sin(angleRad)
        return <line key={angleDeg} x1={x1} y1={y1} x2={x2} y2={y2} />
      })}
    </g>
  )
}

const renderEpicGlyph = (spec: ProductVisualSpec): React.ReactNode => (
  <g>
    <circle
      cx="32"
      cy="32"
      r="29"
      fill="none"
      stroke={spec.primaryColor}
      strokeWidth={2.5}
      strokeDasharray="5 4"
    />
    {renderActionGlyph(spec)}
  </g>
)

const FAMILY_RENDERERS: Readonly<
  Record<ProductCategory, (spec: ProductVisualSpec) => React.ReactNode>
> = {
  weapon: renderWeaponGlyph,
  armor: renderArmorGlyph,
  item: renderItemGlyph,
  action: renderActionGlyph,
  epic: renderEpicGlyph,
}

/** Unico dispatcher de familia -> geometria. Ver documentacion del modulo. */
export const renderProductGlyph = (spec: ProductVisualSpec): React.ReactNode =>
  FAMILY_RENDERERS[spec.category](spec)
