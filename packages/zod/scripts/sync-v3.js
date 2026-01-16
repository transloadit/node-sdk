import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const filePath = fileURLToPath(import.meta.url)
const zodRoot = resolve(dirname(filePath), '..')
const sourceRoot = resolve(zodRoot, '../node/src/alphalib/types')
const destRoot = resolve(zodRoot, 'src/v3')

const reexportExtension = 'ts'
const indexModules = [
  'assembliesGet',
  'assemblyReplay',
  'assemblyReplayNotification',
  'assemblyStatus',
  'bill',
  'stackVersions',
  'template',
  'templateCredential',
  'robots/_index',
]
const indexContents = [
  ...indexModules.map((module) => `export * from './${module}.${reexportExtension}'`),
  '',
].join('\n')

const main = async () => {
  await rm(destRoot, { recursive: true, force: true })
  await mkdir(destRoot, { recursive: true })
  await cp(sourceRoot, destRoot, { recursive: true })
  await writeFile(resolve(destRoot, 'index.ts'), indexContents, 'utf8')
}

await main()
