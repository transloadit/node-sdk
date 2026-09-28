import { readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const packageRoot = resolve(import.meta.dirname, '../packages/node')

async function main(): Promise<void> {
  // ESZIP includes the entire npm package. Publishing this generated source alongside its
  // declarations duplicates megabytes of types. The preceding incremental tsc build owns all
  // checking/emission; only this module's references to unpublished source maps are removed.
  for (const name of ['client.js', 'client.d.ts']) {
    const filename = resolve(packageRoot, 'dist/generated-contract', name)
    const source = await readFile(filename, 'utf8')
    const withoutMap = source.replace(/\r?\n\/\/# sourceMappingURL=[^\r\n]*(?:\r?\n)?$/, '\n')
    if (withoutMap !== source) await writeFile(filename, withoutMap)
    await rm(`${filename}.map`, { force: true })
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
