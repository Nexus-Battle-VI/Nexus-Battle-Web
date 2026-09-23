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
        'AttackPanel.tsx',
        'HealthBar.tsx',
        'attackIntent.ts',
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

/**
 * HU-18: Combat decide el resultado del ataque basico, el dano, la Vida y el turno. Web solo
 * envia la intencion (a quien atacar) y pinta lo que llega. Estas guardas recorren el codigo
 * de PRODUCCION de la batalla y fallan si aparece un calculo de combate en el cliente.
 */
describe('el ataque basico no se decide en Web (HU-18)', () => {
  it('recorre los archivos nuevos de HU-18', () => {
    const files = productionSources().map((source) => source.file)

    expect(files).toEqual(
      expect.arrayContaining(['AttackPanel.tsx', 'HealthBar.tsx', 'attackIntent.ts']),
    )
  })

  it.each([
    [
      'Math.floor / ceil / round / trunc / min / max (no hay redondeo ni acotacion de dano en Web)',
      /Math\.(floor|ceil|round|trunc|min|max)\(/u,
    ],
    [
      'aritmetica sobre Ataque, Defensa o dano (la resolucion se muestra, no se recalcula)',
      /\b(attackValue|defenseValue|baseDamage|calculatedDamage|appliedDamage)\b\s*[-+*/](?!=)/u,
    ],
    [
      'aritmetica sobre el resultado (Ataque o Defensa a la derecha de un operador)',
      /[-+*/]\s*\b(attackValue|defenseValue|baseDamage|calculatedDamage|appliedDamage)\b/u,
    ],
    [
      'restar Vida (`current - ...` o `health -=`)',
      /\b(current|before|after)\s*-[^>]|\bhealth\b[^;\n]*-=/u,
    ],
  ])('no hay %s', (_name, pattern) => {
    // `realtime.ts` es la conexion compartida (su backoff usa `Math.min`), y
    // `battleClock.ts` es el UNICO modulo autorizado a redondear el reloj de
    // VISUALIZACION (HU-21); ninguno es combate. Hay una prueba que comprueba que
    // `battleClock.ts` no habla de Vida, dano, ataque ni Poder.
    const mathExceptions = new Set(['realtime.ts', 'battleClock.ts'])

    for (const { file, code } of productionSources().filter(
      (source) => !mathExceptions.has(source.file),
    )) {
      expect({ file, found: pattern.test(code) }).toEqual({ file, found: false })
    }
  })

  it('el ataque basico NO depende del Poder: ni la interfaz ni la disponibilidad lo mencionan', () => {
    const ui = productionSources().filter((source) =>
      [
        'AttackPanel.tsx',
        'HealthBar.tsx',
        'attackIntent.ts',
        'BattleScreen.tsx',
        'presentation.ts',
      ].includes(source.file),
    )

    expect(ui).toHaveLength(5)

    for (const { file, code } of ui) {
      expect({ file, found: /\b(power|poder)\b/iu.test(code) }).toEqual({ file, found: false })
    }
  })

  it('el commandId sale de un modulo aislado e inyectable: `useBattleRealtime` no usa randomUUID', () => {
    const hook = productionSources().find((source) => source.file === 'useBattleRealtime.ts')

    expect(hook?.code).toMatch(/from '\.\.\/commandId'/u)
    expect(hook?.code).not.toMatch(/randomUUID|crypto/u)
  })

  it('no hay reenvio automatico: el hook no usa temporizadores ni bucles de reintento', () => {
    const hook = productionSources().find((source) => source.file === 'useBattleRealtime.ts')

    expect(hook?.code).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/u)
  })

  it('el boton ataca con `aria-disabled` y solo envia si esta habilitado (no hay atajo que lo salte)', () => {
    const panel = productionSources().find((source) => source.file === 'AttackPanel.tsx')

    expect(panel?.code).toMatch(/aria-disabled=\{!availability\.enabled\}/u)
    expect(panel?.code).toMatch(/if \(availability\.enabled && selected !== null\)/u)
  })
})

/**
 * Arena (HU-18): la pantalla es UN solo DOM y su orden logico es el orden de lectura y de teclado
 * (estado, arena, resultado, acciones, turnos). El CSS solo cambia la composicion visual: nunca
 * reordena (`order-*`, `*-reverse`) ni saca los bloques del flujo (`absolute`/`fixed`), porque eso
 * desincroniza el foco y los lectores de pantalla del orden visual.
 */
describe('la arena no reordena ni saca del flujo los bloques (HU-18)', () => {
  const ARENA = ['BattleScreen.tsx', 'BattleArena.tsx', 'TurnOrderStrip.tsx', 'AttackPanel.tsx']

  it('recorre los archivos de la arena', () => {
    const files = productionSources().map((source) => source.file)

    expect(files).toEqual(expect.arrayContaining(ARENA))
  })

  it.each([
    ['order-* de Tailwind', /(^|[\s"'`:])-?order-(first|last|none|\d+|\[)/u],
    ['flex-row-reverse / flex-col-reverse', /(row|col)-reverse/u],
    ['posicion absolute o fixed', /(^|[\s"'`:])(absolute|fixed)(?=[\s"'`])/u],
  ])('ningun bloque de la arena usa %s', (_name, pattern) => {
    for (const { file, code } of productionSources().filter((source) =>
      ARENA.includes(source.file),
    )) {
      expect({ file, found: pattern.test(code) }).toEqual({ file, found: false })
    }
  })
})

/**
 * HU-19: Combat decide si una habilidad se puede pagar, cuanto Poder queda, cuando termina la
 * recarga, el resultado, el dano, la Vida y el turno (y degrada a ataque basico si el Poder no
 * alcanza, HU-11). Web solo envia la intencion (cual habilidad y contra quien) y pinta lo que llega.
 * Estas guardas recorren el codigo de PRODUCCION de las habilidades y fallan si aparece un calculo
 * de Poder, costo o recarga en el cliente.
 */
describe('las habilidades no se deciden en Web (HU-19)', () => {
  const SKILL_FILES = ['SkillList.tsx', 'skillIntent.ts', 'skillPresentation.ts']

  const sources = (files: readonly string[]) =>
    productionSources().filter((source) => files.includes(source.file))

  const only = (file: string): string => {
    const found = productionSources().find((source) => source.file === file)

    if (found === undefined) {
      throw new Error(`no se encontro ${file}`)
    }

    return found.code
  }

  it('recorre los archivos nuevos de HU-19', () => {
    expect(productionSources().map((source) => source.file)).toEqual(
      expect.arrayContaining(SKILL_FILES),
    )
  })

  it.each([
    [
      'aritmetica sobre costo o recarga (el cliente no descuenta Poder ni cuenta turnos)',
      /\b(powerCost|amount|cooldownRemaining|remainingTurns|chargeTurns)\b\s*[-+*/](?!=)/u,
    ],
    [
      'aritmetica con costo o recarga a la derecha de un operador',
      /[-+*/]\s*\b(powerCost|amount|cooldownRemaining|remainingTurns|chargeTurns)\b/u,
    ],
    [
      'aritmetica sobre el Poder (`power.current`, `.before`, `.after`, `.max`)',
      /\bpower\b\.(current|before|after|max)\s*[-+*/](?!=)|[-+*/]\s*\bpower\b\.(current|before|after|max)/u,
    ],
    [
      'comparar el Poder con el costo (decidir si alcanza es de Combat)',
      /\b(current|before|after|max)\b\s*[<>]=?\s*[\w.]*\b(amount|powerCost)\b|\b(amount|powerCost)\b\s*[<>]=?\s*[\w.]*\b(current|before|after|max)\b/u,
    ],
    [
      'asignar el estado de una habilidad (READY / RECHARGING / UNSUPPORTED los decide Combat)',
      /\bstatus\s*(:|=(?!=))\s*'(READY|RECHARGING|UNSUPPORTED)'/u,
    ],
    [
      'Math.* sobre habilidades (no hay redondeo ni acotacion)',
      /Math\.(floor|ceil|round|trunc|min|max)\(/u,
    ],
  ])('no hay %s', (_name, pattern) => {
    for (const { file, code } of sources(SKILL_FILES)) {
      expect({ file, found: pattern.test(code) }).toEqual({ file, found: false })
    }
  })

  it('el Poder NO decide la disponibilidad: `skillAvailability` no lo menciona (HU-11 lo degrada en Combat)', () => {
    const code = only('skillPresentation.ts')
    const start = code.indexOf('export const skillAvailability')
    const end = code.indexOf('export const describeSkillRejection')

    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(code.slice(start, end)).not.toMatch(/\b(power|current|max|amount|cost)\b/iu)
  })

  it('la intencion de habilidad solo lleva cual habilidad y contra quien: no conoce costo, Poder ni dano', () => {
    expect(only('skillIntent.ts')).not.toMatch(/power|poder|cost|damage|dano|cooldown|health/iu)
  })

  it('el boton usa `aria-disabled` y solo envia si esta habilitado; no hay `disabled` nativo', () => {
    const list = only('SkillList.tsx')

    expect(list).toMatch(/aria-disabled=\{!availability\.enabled\}/u)
    expect(list).toMatch(/if \(availability\.enabled\)/u)
    expect(list).not.toMatch(/\sdisabled=/u)
  })

  it('el rechazo se muestra con texto propio por codigo, nunca el del servidor tal cual', () => {
    const list = only('SkillList.tsx')

    expect(list).toMatch(/describeSkillRejection\(skill\.rejection\)/u)
    expect(list).not.toMatch(/\{\s*skill\.rejection\s*\}/u)
  })

  it('el hook envia el comando de habilidad con una lista blanca de claves: type, commandId, roomId, abilityId y target', () => {
    const hook = only('useBattleRealtime.ts')
    const start = hook.indexOf('const sendSkill')
    const end = hook.indexOf('const retrySkill')
    const body = hook.slice(start, end)
    const sent = /send\(\{([\s\S]*?)\}\)/u.exec(body)?.[1] ?? ''

    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(
      sent
        .split(',')
        .map((entry) => entry.split(':')[0]?.trim() ?? '')
        .filter((key) => key !== '')
        .sort(),
    ).toEqual(['abilityId', 'commandId', 'roomId', 'target', 'type'])
  })

  it('las habilidades no reordenan ni sacan del flujo sus bloques (mismo criterio que la arena)', () => {
    for (const pattern of [
      /(^|[\s"'`:])-?order-(first|last|none|\d+|\[)/u,
      /(row|col)-reverse/u,
      /(^|[\s"'`:])(absolute|fixed)(?=[\s"'`])/u,
    ]) {
      const { file, code } = { file: 'SkillList.tsx', code: only('SkillList.tsx') }

      expect({ file, pattern: String(pattern), found: pattern.test(code) }).toEqual({
        file,
        pattern: String(pattern),
        found: false,
      })
    }
  })
})

/**
 * Excepcion de curacion de HU-12 (Tabla 7, sin Task de Management): Combat decide
 * el monto sanado y quien puede ser objetivo; Web solo ofrece un selector de
 * companero y pinta lo que Combat ya resolvio. Estas guardas fallan si aparece un
 * calculo de curacion en el codigo de produccion de la batalla.
 */
describe('la curacion no se decide en Web (HU-12, excepcion de sanadores)', () => {
  const HEAL_FILES = [
    'SkillList.tsx',
    'skillPresentation.ts',
    'presentation.ts',
    'battleReducer.ts',
  ]

  const sources = (files: readonly string[]) =>
    productionSources().filter((source) => files.includes(source.file))

  it('recorre los archivos que tocan la excepcion de curacion', () => {
    expect(productionSources().map((source) => source.file)).toEqual(
      expect.arrayContaining(HEAL_FILES),
    )
  })

  it.each([
    [
      'aritmetica sobre el monto sanado (`heal.amount` se muestra, no se recalcula)',
      /\bheal\b\.amount\s*[-+*/](?!=)|[-+*/]\s*[\w.()[\]]*\bheal\b\.amount\b/u,
    ],
    [
      'aritmetica sobre la Vida del objetivo de curacion (`targetHealth`)',
      /\btargetHealth\b\.(before|after)\s*[-+*/](?!=)|[-+*/]\s*[\w.()[\]]*\btargetHealth\b\.(before|after)/u,
    ],
    [
      'Math.* sobre la curacion (no hay redondeo ni acotacion en Web)',
      /Math\.(floor|ceil|round|trunc|min|max)\(/u,
    ],
  ])('no hay %s', (_name, pattern) => {
    for (const { file, code } of sources(HEAL_FILES)) {
      expect({ file, found: pattern.test(code) }).toEqual({ file, found: false })
    }
  })

  it('healableAllies no filtra por Vida: un companero caido sigue siendo un objetivo valido', () => {
    const code = productionSources().find((source) => source.file === 'presentation.ts')?.code ?? ''
    const start = code.indexOf('export const healableAllies')
    const end = code.indexOf('export const EFFECT_LABELS')

    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(code.slice(start, end)).not.toMatch(/hasHealth|combatantHealth/u)
  })

  it('el selector de companero es un `radio` nativo, igual que el objetivo del ataque basico', () => {
    const code = productionSources().find((source) => source.file === 'SkillList.tsx')?.code ?? ''

    expect(code).toMatch(/type="radio"/u)
  })
})

/**
 * HU-21: el resultado y los tiempos los decide Combat. Estas guardas comprueban
 * que el reloj de visualizacion es SOLO de presentacion, que no habla de combate
 * y que el unico temporizador nuevo vive en `BattleTimers.tsx` (el hook sigue sin
 * temporizadores; `realtime.ts` ya tenia su reconexion).
 */
describe('el resultado no se decide en Web (HU-21)', () => {
  const clockFile = (): { readonly file: string; readonly code: string } => {
    const source = productionSources().find((entry) => entry.file === 'battleClock.ts')

    if (source === undefined) {
      throw new Error('battleClock.ts no esta entre las fuentes de produccion')
    }

    return source
  }

  it('battleClock.ts no menciona Vida, dano, ataque, Poder ni ganador', () => {
    const { code } = clockFile()

    expect(code).not.toMatch(/health|damage|attack|power|percent|winner/iu)
  })

  it('battleClock.ts usa un reloj monotono inyectable y NO Date.now()', () => {
    const { code } = clockFile()

    expect(code).toMatch(/performance\.now/u)
    expect(code).not.toMatch(/Date\.now\(/u)
    expect(code).not.toMatch(/new Date\(/u)
  })

  it('ningun archivo de produccion de batalla construye un BattleResult ni fija ganador', () => {
    for (const { file, code } of productionSources()) {
      // `fixtures.ts` no es produccion y `types.ts` VALIDA la forma (declara el
      // tipo del resultado y lo comprueba); ninguno construye un resultado.
      if (file === 'fixtures.ts' || file === 'types.ts') {
        continue
      }

      // Solo se prohibe CONSTRUIR (clave de objeto o asignacion), no leer el
      // resultado que llega de Combat.
      expect({ file, found: /winnerTeamLabel\s*:/u.test(code) }).toEqual({ file, found: false })
      expect({ file, found: /\boutcome\s*:\s*['"]/u.test(code) }).toEqual({ file, found: false })
      expect({
        file,
        found: /\breason\s*:\s*['"](ELIMINATION|DISCONNECTION|TIME_LIMIT)/u.test(code),
      }).toEqual({ file, found: false })
    }
  })

  it('los temporizadores nuevos solo estan en BattleTimers.tsx', () => {
    const withTimers = productionSources()
      .filter(({ code }) => /setInterval|setTimeout/u.test(code))
      .map(({ file }) => file)
      .sort()

    expect(withTimers).toEqual(['BattleTimers.tsx', 'realtime.ts'])
  })
})

/**
 * HU-23: Combat y Wallet deciden la apuesta (reserva, pozo, reparto,
 * liquidacion y saldo). Web solo manda la INTENCION (monto al crear/unirse) y
 * pinta lo que el servidor devolvio. Estas guardas fallan si aparece un
 * calculo de economia en el codigo de produccion de la feature.
 */
describe('la apuesta no se calcula en Web (HU-23)', () => {
  const STAKE_FILES = ['stakePresentation.ts', 'useBattleStake.ts', 'StakePanel.tsx']
  const ROOM_STAKE_FILES = [
    'BattleRoomCard.tsx',
    'CreateBattleRoomPanel.tsx',
    'AvailableBattleRoomsPanel.tsx',
    'BattleRoomLobbyPage.tsx',
  ]

  const roomDir = path.resolve(__dirname, '..')

  /** Archivos de produccion de la feature fuera de `battle/` (tarjeta, crear, lobby). */
  const roomSources = (): readonly { readonly file: string; readonly code: string }[] =>
    readdirSync(roomDir)
      .filter((name) => /\.(ts|tsx)$/u.test(name))
      .filter((name) => !/\.test\.(ts|tsx)$/u.test(name) && name !== 'presentation.ts')
      .map((name) => ({
        file: name,
        code: readFileSync(path.join(roomDir, name), 'utf8')
          .replace(/\/\*[\s\S]*?\*\//gu, '')
          .replace(/(^|[^:])\/\/.*$/gmu, '$1'),
      }))

  const stakeSources = (): readonly { readonly file: string; readonly code: string }[] => [
    ...productionSources().filter((source) => STAKE_FILES.includes(source.file)),
    ...roomSources().filter((source) => ROOM_STAKE_FILES.includes(source.file)),
  ]

  it('recorre los archivos nuevos de HU-23', () => {
    expect(productionSources().map((source) => source.file)).toEqual(
      expect.arrayContaining(STAKE_FILES),
    )
    expect(roomSources().map((source) => source.file)).toEqual(
      expect.arrayContaining(ROOM_STAKE_FILES),
    )
  })

  it.each([
    [
      'aritmetica sobre el monto de la apuesta (el monto se muestra, no se recalcula)',
      /\.amount\s*[-+*/](?!=)|[-+*/]\s*[\w.()[\]]*\.amount\b/u,
    ],
    ['agregacion propia del pozo (`reduce`, `sum`)', /\breduce\s*\(|\bsum\s*\(/u],
    [
      'aritmetica sobre el saldo (Web nunca suma ni resta creditos)',
      /\bbalance\b\s*[-+*/](?!=)|[-+*/]\s*\bbalance\b/u,
    ],
    [
      'decisiones de ganador (el resultado llega decidido de Combat)',
      /winnerTeamLabel\s*:|\boutcome\s*:\s*['"]|stakePool\??\s*:/u,
    ],
  ])('no hay %s', (_name, pattern) => {
    for (const { file, code } of stakeSources()) {
      expect({ file, found: pattern.test(code) }).toEqual({ file, found: false })
    }
  })

  it('el resumen agregado del pozo solo se LEE: la unica declaracion vive en types.ts', () => {
    const declarers = [...productionSources(), ...roomSources()]
      .filter(({ code }) => /stakePool\??\s*:/u.test(code))
      .map(({ file }) => file)

    // `types.ts` declara el TIPO (no construye nada) y por eso queda fuera de
    // `stakeSources`; cualquier OTRO archivo que lo declare seria un calculo.
    expect(declarers).toEqual(['types.ts'])
    expect(readFileSync(path.join(roomDir, 'types.ts'), 'utf8')).toMatch(/stakePool\?/u)
  })

  it('el monto de la apuesta se envia tal cual lo escribio la persona, sin transformarlo', () => {
    const panel = roomSources().find((source) => source.file === 'CreateBattleRoomPanel.tsx')

    expect(panel?.code).toMatch(/stake:\s*\{\s*amount:\s*stakeAmount/u)
    expect(panel?.code).not.toMatch(/Math\.(floor|round|ceil|max|min)\(/u)
  })
})
