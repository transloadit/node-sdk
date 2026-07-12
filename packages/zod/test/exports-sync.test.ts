import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const filePath = fileURLToPath(import.meta.url)
const zodRoot = resolve(dirname(filePath), '..')
const alphalibRoot = resolve(zodRoot, '../node/src/alphalib')
const typesRoot = resolve(alphalibRoot, 'types')
const relativeImportPattern = /(?:from\s+|import\s*)['"](\.\.?\/[^'"]+\.ts)['"]/g

const normalize = (items: string[]): string[] => [...new Set(items)].sort()

const listTypeModules = async (): Promise<string[]> => {
  const entries = await readdir(typesRoot, { withFileTypes: true })
  const modules = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => entry.name.replace(/\.ts$/, ''))
  modules.push('robots/_index')
  return normalize(modules)
}

const readIndexModules = async (indexPath: string): Promise<string[]> => {
  const contents = await readFile(indexPath, 'utf8')
  const modules = contents
    .split('\n')
    .map((line) => line.match(/export \* from ['"]\.\/(.+?)\.(?:ts|js)['"]/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => match[1])
  return normalize(modules)
}

const collectFiles = async (dir: string, acc: string[] = []): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(fullPath, acc)
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      acc.push(fullPath)
    }
  }
  return acc
}

const isPathInside = (root: string, candidate: string): boolean => {
  const relativePath = relative(root, candidate)
  return (
    relativePath === '' ||
    (relativePath !== '..' && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
  )
}

const assertSharedDependenciesAreSynced = async (): Promise<void> => {
  const pending = await collectFiles(typesRoot)
  const visited = new Set(pending)

  for (let index = 0; index < pending.length; index += 1) {
    const sourceFile = pending[index]
    if (!sourceFile) continue

    const contents = await readFile(sourceFile, 'utf8')
    for (const match of contents.matchAll(relativeImportPattern)) {
      const specifier = match[1]
      if (!specifier) continue

      const dependency = resolve(dirname(sourceFile), specifier)
      if (!isPathInside(alphalibRoot, dependency) || isPathInside(typesRoot, dependency)) continue

      const dependencyContents = await readFile(dependency, 'utf8')
      for (const version of ['v3', 'v4']) {
        const destination = resolve(zodRoot, 'src', version, relative(alphalibRoot, dependency))
        assert.equal(
          await readFile(destination, 'utf8'),
          dependencyContents,
          `${relative(alphalibRoot, dependency)} must be synced into packages/zod/src/${version}`,
        )
      }

      if (visited.has(dependency)) continue
      visited.add(dependency)
      pending.push(dependency)
    }
  }
}

const expected = await listTypeModules()
const v3Index = await readIndexModules(resolve(zodRoot, 'src/v3/index.ts'))
const v4Index = await readIndexModules(resolve(zodRoot, 'src/v4/index.ts'))

assert.deepEqual(
  v3Index,
  expected,
  'zod v3 index exports must match packages/node/src/alphalib/types',
)
assert.deepEqual(
  v4Index,
  expected,
  'zod v4 index exports must match packages/node/src/alphalib/types',
)
await assertSharedDependenciesAreSynced()

console.log('zod exports: ok')
