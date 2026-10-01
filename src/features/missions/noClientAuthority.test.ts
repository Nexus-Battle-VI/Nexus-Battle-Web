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

/**
 * HU-10 (Task HU-10.5): la liquidacion de finalizacion (XP, creditos, producto)
 * la decide y la acredita Missions -- que a su vez llama a Player/Inventory y a
 * Wallet por sus rutas INTERNAS. Web solo PINTA lo que el reporte publica.
 */
describe('la liquidacion de finalizacion no se calcula ni se acredita en Web (HU-10.5)', () => {
  it.each([
    ['la ruta interna entre servicios', /\/api\/internal\//u],
    ['el credito de mision de Wallet', /wallet\/credits\/mission-reward/u],
    [
      'la acreditacion de experiencia de Player\\/Inventory',
      /heroes\/.*\/experience|players\/.*\/experience/u,
    ],
    ['la entrega de productos de Player\\/Inventory', /inventory\/grants/u],
    ['la construccion de un operationId', /\boperationId\b/u],
    ['el espacio de nombres UUID de una entrega', /NAMESPACE|uuidV5/u],
  ])('no hay %s', (_name, pattern) => {
    for (const { file, code } of productionSources()) {
      expect({ file, found: pattern.test(code) }).toEqual({ file, found: false })
    }
  })

  it('no se suma la XP de HU-09 con la de HU-10: cada una es su propia recompensa', () => {
    // Si alguien sumara los dos totales apareceria una variable o expresion con
    // los dos nombres juntos; aqui solo se comprueba que ninguna combina
    // `totalXp` (HU-09) con una cantidad de una linea HU-10 en una misma cuenta.
    const page = productionSources().find((source) => source.file === 'MissionReportPage.tsx')

    expect(page?.code).not.toMatch(/totalMissionXp|totalXp\s*\+|\+\s*totalXp/u)
  })

  it('la progresion de HU-10 solo se LEE: ningun archivo NUEVO construye un objeto con sus 4 campos', () => {
    // `api.ts` declara la forma del contrato (`MissionRewardProgression`);
    // `missionReportApi.ts` la REFERENCIA por tipo (no la redeclara), igual que
    // esta misma suite exige para `defeats|totalXp|levelsGained` mas arriba.
    // `missionReport.ts` ya declaraba esos mismos cuatro nombres de campo para
    // el agregado de HU-09 (`MissionExperience`), asi que tambien aparece aqui
    // por coincidencia de nombres, no por HU-10. Ningun OTRO archivo deberia
    // ensamblar un objeto literal con los cuatro juntos: seria un calculo
    // propio en vez de una lectura.
    const declarers = productionSources()
      .filter(
        ({ code }) =>
          /\blevel\s*:/u.test(code) &&
          /\bcurrentXp\s*:/u.test(code) &&
          /\bmaxLevel\s*:/u.test(code) &&
          /\blevelsGained\s*:/u.test(code),
      )
      .map(({ file }) => file)
      .sort()

    expect(declarers).toEqual(['api.ts', 'missionReport.ts'])
  })

  it('la entrega de finalizacion se distingue por `source`, no solo por `kind`', () => {
    const page = productionSources().find((source) => source.file === 'MissionReportPage.tsx')

    // El filtro que separa el panel de HU-09 del resto de la lista debe mirar
    // tambien el origen: `kind !== 'EXPERIENCE'` por si solo ocultaria tambien
    // la XP de finalizacion de HU-10.
    expect(page?.code).not.toMatch(/reward\.kind\s*!==\s*'EXPERIENCE'/u)
    expect(page?.code).toMatch(/isHu09ExperienceLine/u)
  })

  it('el sondeo de HU-10 tiene una unica fuente de decision, no duplicada en el hook y la pagina', () => {
    const hook = productionSources().find((source) => source.file === 'useMissionReport.ts')
    const report = productionSources().find((source) => source.file === 'missionReport.ts')

    expect(report?.code).toMatch(/missionReportNeedsPolling/u)
    expect(hook?.code).toMatch(/missionReportNeedsPolling/u)
    // El hook no vuelve a mirar el estado de las lineas por su cuenta.
    expect(hook?.code).not.toMatch(/status\s*===\s*'PENDING'/u)
  })
})
