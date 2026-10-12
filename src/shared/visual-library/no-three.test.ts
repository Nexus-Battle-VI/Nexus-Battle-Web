import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/** Todos los .ts/.tsx de `src`, para comprobar dependencias sobre el codigo fuente. */
const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? sources(full) : /\.(ts|tsx)$/u.test(name) ? [full] : []
  })

describe('EN-031 — sin Three.js', () => {
  it('ningun modulo importa three: los heroes son sprites y three ya no es dependencia', () => {
    const offenders = sources(path.join(process.cwd(), 'src')).filter((file) =>
      /from ['"]three(?:\/[^'"]*)?['"]|import\(['"]three/u.test(readFileSync(file, 'utf8')),
    )
    const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }

    expect(offenders).toEqual([])
    expect(manifest.dependencies?.three).toBeUndefined()
    expect(manifest.devDependencies?.['@types/three']).toBeUndefined()
  })
})
