import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * HU-17: el orden de turnos y el turno vigente los decide SIEMPRE Combat. Este
 * guard recorre el codigo de PRODUCCION de la pantalla de batalla y de la conexion
 * en tiempo real y falla si aparece cualquier fuente de aleatoriedad, reloj o
 * calculo de "turno siguiente" en el cliente.
 */
const BATTLE_DIR = path.resolve(__dirname)
const REALTIME_FILE = path.resolve(__dirname, '..', 'realtime.ts')

const productionSources = (): readonly { readonly file: string; readonly code: string }[] => {
  const battleFiles = readdirSync(BATTLE_DIR)
    .filter((name) => /\.(ts|tsx)$/u.test(name))
    .filter((name) => !/\.test\.(ts|tsx)$/u.test(name) && name !== 'fixtures.ts')
    .map((name) => path.join(BATTLE_DIR, name))

  return [...battleFiles, REALTIME_FILE].map((file) => ({
    file: path.basename(file),
    // Sin comentarios: la documentacion puede NOMBRAR lo prohibido para explicar
    // por que no se usa.
    code: readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .replace(/(^|[^:])\/\/.*$/gmu, '$1'),
  }))
}

describe('la pantalla de batalla no decide nada (HU-17)', () => {
  it('recorre el codigo de produccion esperado', () => {
    const files = productionSources().map((source) => source.file)

    expect(files).toEqual(
      expect.arrayContaining([
        'BattlePage.tsx',
        'BattleScreen.tsx',
        'battleReducer.ts',
        'presentation.ts',
        'useBattleRealtime.ts',
        'realtime.ts',
      ]),
    )
    expect(files).not.toContain('fixtures.ts')
  })

  it.each([
    ['Math.random', /Math\.random/u],
    ['crypto.getRandomValues', /getRandomValues/u],
    ['crypto.randomUUID', /randomUUID/u],
    [
      'generador propio (seed / mulberry / mt19937)',
      /\b(mulberry|mt19937|xorshift|seedrandom)\b/iu,
    ],
    ['Date.now() como fuente de decision', /Date\.now\(/u],
    ['new Date() como fuente de decision', /new Date\(/u],
  ])('no usa %s', (_name, pattern) => {
    for (const { file, code } of productionSources()) {
      expect({ file, found: pattern.test(code) }).toEqual({ file, found: false })
    }
  })

  it('no calcula el turno siguiente: ni "% length" ni "+ 1) %" ni turno + 1', () => {
    const forbidden = [
      /%\s*[\w.]*length/u,
      /\+\s*1\s*\)\s*%/u,
      /turnsCompleted\s*\+\s*1/u,
      /currentTurn\s*\+\s*1/u,
      /position\s*\+\s*1\s*\)\s*%/u,
    ]

    for (const { file, code } of productionSources()) {
      for (const pattern of forbidden) {
        expect({ file, pattern: String(pattern), found: pattern.test(code) }).toEqual({
          file,
          pattern: String(pattern),
          found: false,
        })
      }
    }
  })

  it('el JWT nunca se arma dentro de la URL del socket', () => {
    const realtime = productionSources().find((source) => source.file === 'realtime.ts')

    expect(realtime?.code).not.toMatch(/searchParams|\?token=|access_token|accessToken\s*\}/u)
  })
})
