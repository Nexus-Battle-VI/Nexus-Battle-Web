import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * `routes.tsx` espera a `dev-routes.tsx` con `await` de nivel superior (solo en
 * desarrollo). Si algo que `dev-routes.tsx` carga antes de terminar -sus
 * importaciones estaticas o las que espera con `await Promise.all`- vuelve a
 * importar `routes.tsx`, el navegador queda esperando un modulo que espera por
 * el y `npm run dev` muestra la pagina en blanco. Vitest no lo reproduce: su
 * cargador tolera el ciclo. Por eso esta prueba recorre el grafo en el codigo.
 */
const SRC = path.resolve(__dirname, '..')
const ROUTES = path.join(SRC, 'routes', 'routes.tsx')
const DEV_ROUTES = path.join(SRC, 'routes', 'dev-routes.tsx')
const EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']

const resolveSpecifier = (from: string, specifier: string): string | null => {
  const base = specifier.startsWith('@/')
    ? path.join(SRC, specifier.slice(2))
    : specifier.startsWith('.')
      ? path.join(path.dirname(from), specifier)
      : null
  if (base === null) return null
  for (const extension of EXTENSIONS) {
    const candidate = base + extension
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

/** Importaciones que se evaluan al cargar el modulo (no las de solo tipos). */
const staticImportsOf = (file: string): readonly string[] => {
  const code = readFileSync(file, 'utf8')
  const pattern = /^\s*(?:import|export)\s+(?!type\s)(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/gmu
  return [...code.matchAll(pattern)]
    .map((match) => resolveSpecifier(file, match[1] ?? ''))
    .filter((resolved): resolved is string => resolved !== null)
}

/** Los modulos que `dev-routes.tsx` espera con `await Promise.all([...])`. */
const awaitedImportsOf = (file: string): readonly string[] => {
  const code = readFileSync(file, 'utf8')
  const block = /await Promise\.all\(\[([\s\S]*?)\]\)/u.exec(code)?.[1] ?? ''
  return [...block.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/gu)]
    .map((match) => resolveSpecifier(file, match[1] ?? ''))
    .filter((resolved): resolved is string => resolved !== null)
}

/** Camino desde alguna raiz hasta `target`, o `null` si no existe. */
const pathTo = (roots: readonly string[], target: string): readonly string[] | null => {
  const previous = new Map<string, string | null>(roots.map((root) => [root, null]))
  const queue = [...roots]
  for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
    if (current === target) {
      const chain: string[] = []
      for (let node: string | null = current; node !== null; node = previous.get(node) ?? null) {
        chain.unshift(path.relative(SRC, node))
      }
      return chain
    }
    for (const next of staticImportsOf(current)) {
      if (!previous.has(next)) {
        previous.set(next, current)
        queue.push(next)
      }
    }
  }
  return null
}

describe('dev-routes no cierra un ciclo con routes.tsx', () => {
  it('reconoce las importaciones que dev-routes espera en el nivel superior', () => {
    expect(awaitedImportsOf(DEV_ROUTES).length).toBeGreaterThan(0)
  })

  it('nada de lo que dev-routes carga antes de terminar importa routes.tsx', () => {
    const roots = [...staticImportsOf(DEV_ROUTES), ...awaitedImportsOf(DEV_ROUTES)]

    expect(pathTo(roots, ROUTES)).toBeNull()
  })
})
