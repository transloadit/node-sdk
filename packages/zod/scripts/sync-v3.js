import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const filePath = fileURLToPath(import.meta.url)
const zodRoot = resolve(dirname(filePath), '..')
const sourceRoot = resolve(zodRoot, '../node/src/alphalib/types')
const destRoot = resolve(zodRoot, 'src/v3')

const indexContents = [
  "export * from './assembliesGet.ts'",
  "export * from './assemblyReplay.ts'",
  "export * from './assemblyReplayNotification.ts'",
  "export * from './assemblyStatus.ts'",
  "export * from './bill.ts'",
  "export * from './stackVersions.ts'",
  "export * from './template.ts'",
  "export * from './templateCredential.ts'",
  "export * from './robots/_index.ts'",
  '',
].join('\n')

const main = async () => {
  await rm(destRoot, { recursive: true, force: true })
  await mkdir(destRoot, { recursive: true })
  await cp(sourceRoot, destRoot, { recursive: true })
  await writeFile(resolve(destRoot, 'index.ts'), indexContents, 'utf8')
}

await main()
