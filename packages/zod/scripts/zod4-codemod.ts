import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { diffTrees, forwardTree, readTree, selectSchemaSources, writeTree } from './zodSource.ts'

const zodRoot = resolve(import.meta.dirname, '..')

const usage = `Convert the schema subset of a Zod 3 alphalib tree into Zod 4 source.

Usage: node packages/zod/scripts/zod4-codemod.ts --in <alphalib> --out <dir> [--check]

  --in       Zod 3 alphalib root (contains types/)
  --out      Zod 4 source root to write (stale .ts files there are removed)
  --adapter  optional-semantics adapter to copy (default: packages/zod/alphalib/lib/sdkZodOptional.ts)
  --check    compare instead of writing; exit 1 when --out differs`

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      in: { type: 'string' },
      out: { type: 'string' },
      adapter: { type: 'string', default: resolve(zodRoot, 'alphalib/lib/sdkZodOptional.ts') },
      check: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  })
  if (values.help || !values.in || !values.out) {
    console.log(usage)
    process.exitCode = values.help ? 0 : 1
    return
  }

  const input = await readTree(resolve(values.in))
  const output = forwardTree(input, await readFile(resolve(values.adapter), 'utf8'))
  const outDir = resolve(values.out)
  if (values.check) {
    const differences = diffTrees(output, await readTree(outDir))
    if (differences.length > 0) {
      throw new Error(`${outDir} is not the Zod 4 form of ${values.in}:\n${differences.join('\n')}`)
    }
    console.log(`${outDir} matches the Zod 4 form of ${values.in}`)
    return
  }
  await writeTree(outDir, output)
  console.log(
    `Wrote ${output.size} Zod 4 source files to ${outDir} (${selectSchemaSources(input).size} schema files)`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
