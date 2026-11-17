import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

import {
  flattenSchemaTree,
  readTree,
  replaceDirectory,
  reverseTree,
  rewriteBareZodImports,
} from './zodSource.ts'

const zodRoot = resolve(import.meta.dirname, '..')

/** Generate the published Zod 3 tree (`src/v3`) from the Zod 4 schema source. */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      source: { type: 'string', default: resolve(zodRoot, 'alphalib') },
      out: { type: 'string', default: resolve(zodRoot, 'src/v3') },
    },
  })
  const v3Tree = reverseTree(await readTree(resolve(values.source)))
  await replaceDirectory(
    resolve(values.out),
    rewriteBareZodImports(flattenSchemaTree(v3Tree), 'zod/v3'),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
