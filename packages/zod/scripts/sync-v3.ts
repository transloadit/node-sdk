import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const filePath = fileURLToPath(import.meta.url)
const zodRoot = resolve(dirname(filePath), '..')
const alphalibRoot = resolve(zodRoot, '../node/src/alphalib')
const sourceRoot = resolve(alphalibRoot, 'types')
const destRoot = resolve(zodRoot, 'src/v3')
const relativeImportPattern = /(?:from\s+|import\s*)['"](\.\.?\/[^'"]+\.ts)['"]/g

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

const isPathInside = (root: string, candidate: string): boolean => {
  const relativePath = relative(root, candidate)
  return (
    relativePath === '' ||
    (relativePath !== '..' && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
  )
}

const listSharedDependencyFiles = async (): Promise<string[]> => {
  const pending = await collectFiles(sourceRoot)
  const visited = new Set(pending)
  const dependencies = new Set<string>()

  for (let index = 0; index < pending.length; index += 1) {
    const sourceFile = pending[index]
    if (!sourceFile) continue

    const contents = await readFile(sourceFile, 'utf8')
    for (const match of contents.matchAll(relativeImportPattern)) {
      const specifier = match[1]
      if (!specifier) continue

      const dependency = resolve(dirname(sourceFile), specifier)
      if (!isPathInside(alphalibRoot, dependency)) {
        throw new Error(`Schema dependency escapes alphalib: ${specifier} from ${sourceFile}`)
      }
      if (isPathInside(sourceRoot, dependency) || visited.has(dependency)) continue

      visited.add(dependency)
      dependencies.add(dependency)
      pending.push(dependency)
    }
  }

  return [...dependencies].sort()
}

const syncSharedDependencies = async (): Promise<string[]> => {
  const dependencies = await listSharedDependencyFiles()
  for (const dependency of dependencies) {
    const destination = resolve(destRoot, relative(alphalibRoot, dependency))
    await mkdir(dirname(destination), { recursive: true })
    await cp(dependency, destination)
  }
  return dependencies
}

const rewriteSharedDependencyImports = async (dependencies: string[]): Promise<void> => {
  const sourceFiles = await collectFiles(sourceRoot)
  const dependencySet = new Set(dependencies)

  for (const sourceFile of [...sourceFiles, ...dependencies]) {
    const sourceBase = dependencySet.has(sourceFile) ? alphalibRoot : sourceRoot
    const destination = resolve(destRoot, relative(sourceBase, sourceFile))
    const contents = await readFile(destination, 'utf8')
    const next = contents.replace(
      relativeImportPattern,
      (statement: string, specifier: string): string => {
        const dependency = resolve(dirname(sourceFile), specifier)
        if (isPathInside(sourceRoot, dependency)) return statement
        if (!isPathInside(alphalibRoot, dependency)) {
          throw new Error(`Schema dependency escapes alphalib: ${specifier} from ${sourceFile}`)
        }

        const dependencyDestination = resolve(destRoot, relative(alphalibRoot, dependency))
        const relativeSpecifier = relative(dirname(destination), dependencyDestination).replaceAll(
          sep,
          '/',
        )
        const normalizedSpecifier = relativeSpecifier.startsWith('.')
          ? relativeSpecifier
          : `./${relativeSpecifier}`
        return statement.replace(specifier, normalizedSpecifier)
      },
    )
    if (next !== contents) {
      await writeFile(destination, next, 'utf8')
    }
  }
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
  const indexModules = await listIndexModules()
  await rm(destRoot, { recursive: true, force: true })
  await mkdir(destRoot, { recursive: true })
  await cp(sourceRoot, destRoot, { recursive: true })
  const sharedDependencies = await syncSharedDependencies()
  await rewriteSharedDependencyImports(sharedDependencies)
  await writeFile(resolve(destRoot, 'index.ts'), buildIndexContents(indexModules), 'utf8')
  await rewriteZodImports()
}

await main()
