import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const filePath = fileURLToPath(import.meta.url)
const zodRoot = resolve(dirname(filePath), '..')
const typesRoot = resolve(zodRoot, '../node/src/alphalib/types')

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

console.log('zod exports: ok')
