import type { Diagnostic } from 'typescript'

import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  createProgram,
  formatDiagnostics,
  parseJsonConfigFileContent,
  readConfigFile,
  sys,
} from 'typescript'

const packageRoot = resolve(import.meta.dirname, '../packages/node')

function checkDiagnostics(diagnostics: readonly Diagnostic[]): void {
  if (diagnostics.length === 0) return
  throw new Error(
    formatDiagnostics(diagnostics, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: sys.getCurrentDirectory,
      getNewLine: () => sys.newLine,
    }),
  )
}

async function main(): Promise<void> {
  const config = readConfigFile(resolve(packageRoot, 'tsconfig.build.json'), sys.readFile)
  if (config.error) checkDiagnostics([config.error])
  const parsed = parseJsonConfigFileContent(config.config, sys, packageRoot)
  checkDiagnostics(parsed.errors)

  // ESZIP includes the entire npm package. Publishing this generated source alongside its
  // declarations duplicates megabytes of types; emit only this module without source maps.
  // The normal project build still checks all sources and preserves other modules' debug maps.
  const sourcePath = resolve(packageRoot, 'src/generated-contract/client.ts')
  const program = createProgram([sourcePath], {
    ...parsed.options,
    composite: false,
    incremental: false,
    sourceMap: false,
    declarationMap: false,
  })
  const source = program.getSourceFile(sourcePath)
  if (!source) throw new Error(`Missing generated contract source: ${sourcePath}`)
  const result = program.emit(source)
  checkDiagnostics(result.diagnostics)
  if (result.emitSkipped) throw new Error('Generated contract distribution emission was skipped')

  for (const name of ['client.js.map', 'client.d.ts.map']) {
    await rm(resolve(packageRoot, 'dist/generated-contract', name), { force: true })
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
