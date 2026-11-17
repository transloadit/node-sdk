import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { diffTrees, readTree, reverseTree, selectSchemaSources, writeTree } from './zodSource.ts'

const zodRoot = resolve(import.meta.dirname, '..')

/**
 * Keep the SDK's Zod 3 schema files (`packages/node/src/alphalib`) generated from the Zod 4 source.
 * The SDK compiles and publishes those files, so they stay tracked; this only rewrites the schema
 * subset and leaves the SDK's other alphalib files alone.
 */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      source: { type: 'string', default: resolve(zodRoot, 'alphalib') },
      sdk: { type: 'string', default: resolve(zodRoot, '../node/src/alphalib') },
      check: { type: 'boolean', default: false },
    },
  })
  const sdkRoot = resolve(values.sdk)
  const generated = reverseTree(await readTree(resolve(values.source)))
  const sdkTree = await readTree(sdkRoot)

  if (values.check) {
    const differences = diffTrees(generated, selectSchemaSources(sdkTree))
    if (differences.length === 0) return
    throw new Error(
      [
        `${sdkRoot} is out of sync with the Zod 4 schema source:`,
        ...differences.map((difference) => `  ${difference}`),
        '',
        'After an alphalib sync into packages/node, convert it into the Zod 4 source:',
        '  yarn workspace @transloadit/zod codemod:v4',
        'After editing packages/zod/alphalib, regenerate the SDK copy:',
        '  yarn workspace @transloadit/zod sync:sdk',
      ].join('\n'),
    )
  }

  // Rewrite only the schema subset: the SDK's other alphalib files are not generated.
  const next = new Map(sdkTree)
  for (const path of selectSchemaSources(sdkTree).keys()) next.delete(path)
  for (const [path, contents] of generated) next.set(path, contents)
  await writeTree(sdkRoot, next)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
