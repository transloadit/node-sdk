import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
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

const collectFiles = async (dir, acc = []) => {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(full, acc)
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      acc.push(full)
    }
  }
  return acc
}

const rewriteZodImports = async () => {
  const files = await collectFiles(destRoot)
  for (const file of files) {
    const contents = await readFile(file, 'utf8')
    const next = contents.replace(/from ['"]zod['"]/g, "from 'zod/v3'")
    if (next !== contents) {
      await writeFile(file, next, 'utf8')
    }
  }
}

const main = async () => {
  await rm(destRoot, { recursive: true, force: true })
  await mkdir(destRoot, { recursive: true })
  await cp(sourceRoot, destRoot, { recursive: true })
  await writeFile(resolve(destRoot, 'index.ts'), indexContents, 'utf8')
  await rewriteZodImports()
}

await main()
