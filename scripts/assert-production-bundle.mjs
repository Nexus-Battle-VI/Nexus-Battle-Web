import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const DIST_DIRECTORY = path.resolve('dist')
const FORBIDDEN_MARKERS = [
  'AccountDevPreview',
  '/__dev/account',
  'jugador.demo@nexus.test',
  // Artefactos exclusivamente DEV de "Estadísticas y logros" (HU-06.4). El bundle
  // productivo nunca debe contener contenido de ejemplo de estadísticas/logros.
  'DEV_STATISTICS_FIXTURE',
  'dev-fixture-achievement',
  'StatisticsDevPreview',
  // Artefactos exclusivamente DEV del lobby de preparación de sala (HU-15.3).
  // El bundle productivo nunca debe contener las rutas `__dev/hu15/lobby(/:roomId)`
  // ni el componente de preview asociado (hallazgo MEDIO-01, auditoría HU-15.4:
  // hoy Vite los elimina por tree-shaking, pero sin este guard explícito una
  // futura regresión no seria detectada por `build:verify`).
  '__dev/hu15',
  'BattleRoomLobbyDevPreview',
  // Artefactos exclusivamente DEV del medidor de Poder (HU-11): la ruta
  // `__dev/hu11/poder` y su preview, con el recorrido de ejemplo. El bundle
  // productivo no debe llevarlos; el componente `PowerMeter` en si si puede
  // llegar cuando una pantalla lo monte.
  '__dev/hu11',
  'PowerMeterDevPreview',
  // Artefactos exclusivamente DEV de la pantalla de batalla (HU-17): la ruta
  // `__dev/hu17/battle` y su preview con eventos de ejemplo. La pantalla
  // `BattleScreen` en si es de produccion.
  '__dev/hu17',
  'BattleScreenDevPreview',
  // Artefactos exclusivamente DEV de la vista previa del chat (HU-13): la ruta
  // `__dev/hu13/chat`, su servidor falso y el ticket de ejemplo que le inyecta.
  '__dev/hu13',
  'ChatPanelDevPreview',
  'ticket-de-vista-previa',
]

/**
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  /** @type {string[]} */
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)))
    } else if (entry.isFile()) {
      files.push(entryPath)
    }
  }

  return files
}

/** @returns {Promise<void>} */
const assertDistExists = async () => {
  try {
    const details = await stat(DIST_DIRECTORY)

    if (!details.isDirectory()) {
      throw new Error('dist existe pero no es un directorio')
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'dist existe pero no es un directorio') {
      throw error
    }

    throw new Error('No existe dist; ejecuta primero el build productivo', { cause: error })
  }
}

await assertDistExists()

/** @type {string[]} */
const violations = []
const files = await collectFiles(DIST_DIRECTORY)

for (const file of files) {
  const relativePath = path.relative(DIST_DIRECTORY, file)

  for (const marker of FORBIDDEN_MARKERS) {
    if (relativePath.includes(marker)) {
      violations.push(`${relativePath}: nombre contiene ${marker}`)
    }
  }

  const contents = await readFile(file)
  const text = contents.toString('utf8')

  for (const marker of FORBIDDEN_MARKERS) {
    if (text.includes(marker)) {
      violations.push(`${relativePath}: contenido contiene ${marker}`)
    }
  }
}

if (violations.length > 0) {
  process.stderr.write('El bundle productivo contiene artefactos exclusivos de desarrollo:\n')
  for (const violation of violations) {
    process.stderr.write(`- ${violation}\n`)
  }
  process.exitCode = 1
} else {
  process.stdout.write(
    `Bundle productivo verificado: ${String(files.length)} archivos sin marcadores DEV\n`,
  )
}
