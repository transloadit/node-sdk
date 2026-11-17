import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { exportV4Tree, flattenSchemaTree, readTree, replaceDirectory } from './zodSource.ts'

const zodRoot = resolve(import.meta.dirname, '..')

/** Generate the published Zod 4 tree (`src/v4`) from the Zod 4 schema source. */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      source: { type: 'string', default: resolve(zodRoot, 'alphalib') },
      out: { type: 'string', default: resolve(zodRoot, 'src/v4') },
    },
  })
  const v4Tree = exportV4Tree(await readTree(resolve(values.source)))
  await replaceDirectory(resolve(values.out), flattenSchemaTree(v4Tree))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
