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
