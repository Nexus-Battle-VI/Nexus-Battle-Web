import type { LocaleBundle } from '../../bundle'
import { collectNamespaces } from '../../bundle'

/**
 * Todos los namespaces de este idioma. `import.meta.glob` los descubre solos:
 * añadir un JSON nuevo no exige tocar este archivo (ni crear conflictos entre
 * PRs que añaden namespaces distintos).
 */
const bundle: LocaleBundle = collectNamespaces(
  import.meta.glob<Record<string, unknown>>('./*.json', { eager: true, import: 'default' }),
)

export default bundle
