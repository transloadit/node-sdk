import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const filePath = fileURLToPath(import.meta.url)
const zodRoot = resolve(dirname(filePath), '..')
const sourceRoot = resolve(zodRoot, '../node/src/alphalib/types')
const destRoot = resolve(zodRoot, 'src/v3')

const collectFiles = async (dir: string, acc: string[] = []): Promise<string[]> => {
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

const listIndexModules = async (): Promise<string[]> => {
  const entries = await readdir(sourceRoot, { withFileTypes: true })
  const modules = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => entry.name.replace(/\.ts$/, ''))
  modules.push('robots/_index')
  return [...new Set(modules)].sort()
}

const buildIndexContents = (modules: string[]): string =>
  [...modules.map((module) => `export * from './${module}.ts'`), ''].join('\n')

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
  const indexModules = await listIndexModules()
  await rm(destRoot, { recursive: true, force: true })
  await mkdir(destRoot, { recursive: true })
  await cp(sourceRoot, destRoot, { recursive: true })
  await writeFile(resolve(destRoot, 'index.ts'), buildIndexContents(indexModules), 'utf8')
  await rewriteZodImports()
}

await main()
