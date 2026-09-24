import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * HU-09 (Task HU-09.5): la experiencia la decide el dominio -- Missions pide la
 * tirada a Combat y acredita en Player/Inventory --, y el nivel lo calcula
 * Player/Inventory con la tabla de HU-08 (`ADR-019`). Web solo PINTA lo que el
 * informe de HU-74 publica.
 *
 * Este guard recorre el codigo de PRODUCCION de la feature y falla si aparece
 * cualquier calculo de experiencia, de nivel o de progreso en el cliente.
 */
const MISSIONS_DIR = path.resolve(__dirname)

const productionSources = (): readonly { readonly file: string; readonly code: string }[] =>
  readdirSync(MISSIONS_DIR)
    .filter((name) => /\.(ts|tsx)$/u.test(name))
    .filter((name) => !/\.test\.(ts|tsx)$/u.test(name) && name !== 'fixtures.ts')
    .map((name) => ({
      file: name,
      // Sin comentarios: la documentacion puede NOMBRAR lo prohibido para explicar
      // por que no se usa.
      code: readFileSync(path.join(MISSIONS_DIR, name), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//gu, '')
        .replace(/(^|[^:])\/\/.*$/gmu, '$1'),
    }))

/** El bloque de experiencia y sus cifras, tal como los publica Missions. */
const EXPERIENCE_FIELDS =
  'totalXp|currentXp|maxLevel|levelsGained|defeats|credited|pending|failed|quantity|level'

describe('la feature de misiones recorre sus fuentes de produccion (HU-09.5)', () => {
  it('estan los archivos nuevos de la task', () => {
    const files = productionSources().map((source) => source.file)

    expect(files).toEqual(
      expect.arrayContaining([
        'api.ts',
        'missionReport.ts',
        'useMissionReport.ts',
        'experiencePresentation.ts',
        'MissionExperiencePanel.tsx',
        'MissionReportPage.tsx',
      ]),
    )
    expect(files).not.toContain('fixtures.ts')
  })
})

describe('la experiencia no se calcula en Web (HU-09.5)', () => {
  it.each([
    [
      'aritmetica sobre la experiencia, el nivel o el desenlace de las derrotas',
      new RegExp(`\\b(${EXPERIENCE_FIELDS})\\b\\s*[-+*/](?!=)`, 'u'),
    ],
    [
      'aritmetica con esos valores a la derecha de un operador',
      new RegExp(`[-+*/]\\s*\\b(${EXPERIENCE_FIELDS})\\b`, 'u'),
    ],
    [
      'agregacion propia (sumar o reducir la experiencia es de Missions)',
      /\breduce\s*\(|\bsum\s*\(/u,
    ],
    [
      'umbrales o progreso hacia el nivel siguiente (la tabla de niveles es de Player/Inventory)',
      /\b(threshold|nextLevel|xpForNextLevel|remainingXp|xpHasta)\b/u,
    ],
    [
      'redondeo o acotacion de cifras (no hay Math.* en la feature)',
      /Math\.(floor|ceil|round|trunc|min|max)\(/u,
    ],
    ['aleatoriedad', /Math\.random|getRandomValues|randomUUID/u],
    ['el reloj como fuente de decision', /Date\.now\(|new Date\(/u],
  ])('no hay %s', (_name, pattern) => {
    for (const { file, code } of productionSources()) {
      expect({ file, found: pattern.test(code) }).toEqual({ file, found: false })
    }
  })

  it('el agregado solo se DECLARA en los tipos: ningun otro archivo lo construye', () => {
    const declarers = productionSources()
      .filter(({ code }) => /\b(defeats|totalXp|levelsGained)\s*:/u.test(code))
      .map(({ file }) => file)
      .sort()

    // `api.ts` declara la forma del contrato y `missionReport.ts` la de su lectura
    // tolerante; cualquier OTRO archivo que las escriba seria un calculo.
    expect(declarers).toEqual(['api.ts', 'missionReport.ts'])
  })

  it('el estado de cada derrota se LEE del servicio: no hay un mapa que lo decida', () => {
    const panel = productionSources().find((source) => source.file === 'MissionExperiencePanel.tsx')

    expect(panel?.code).toMatch(/lineStateText\(line\.status\)/u)
    expect(panel?.code).not.toMatch(/\bstatus\s*(:|\?\?)\s*'(PENDING|CREDITED|FAILED)'/u)
  })

  it('el nivel y la subida se leen del servicio: el panel no los deduce de la experiencia', () => {
    const panel = productionSources().find((source) => source.file === 'MissionExperiencePanel.tsx')

    // El panel no compara XP con umbrales ni cuenta niveles por su cuenta: usa los
    // campos ya resueltos (`level`, `maxLevel`, `levelsGained`).
    expect(panel?.code).toMatch(/levelText\(experience\)/u)
    expect(panel?.code).toMatch(/levelUpText\(experience\)/u)
    expect(panel?.code).not.toMatch(/levelsGained\s*[-+*/]/u)
  })

  it('la pantalla no envia ningun identificador de jugador: solo la matricula de la direccion', () => {
    const page = productionSources().find((source) => source.file === 'MissionReportPage.tsx')
    const api = productionSources().find((source) => source.file === 'api.ts')

    expect(page?.code).toMatch(/useParams<\{ enrollmentId: string \}>/u)
    expect(api?.code).not.toMatch(/playerId|subject|useSession/u)
    expect(api?.code).toMatch(/\/v1\/missions\/me\/reports\//u)
  })
})
