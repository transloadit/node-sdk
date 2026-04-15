import { chmod, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureNodePackagePrepared } from './prepare-node-package.ts'

const filePath = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(filePath), '..')
const nodePackage = resolve(repoRoot, 'packages/node')
const legacyPackage = resolve(repoRoot, 'packages/transloadit')

const copyDir = async (from: string, to: string): Promise<void> => {
  await rm(to, { recursive: true, force: true })
  await mkdir(to, { recursive: true })
  await cp(from, to, { recursive: true })
}

const readJson = async <T>(filePath: string): Promise<T> => {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

const formatPackageJson = (data: Record<string, unknown>): string => {
  return `${JSON.stringify(data, null, 2)}\n`
}

type PackageJson = Record<string, unknown> & { scripts?: Record<string, string> }

function replaceRequired(
  value: string,
  searchValue: string,
  replaceValue: string,
  label: string,
): string {
  if (!value.includes(searchValue)) {
    throw new Error(`Expected ${label} to include ${JSON.stringify(searchValue)}`)
  }

  return value.replace(searchValue, replaceValue)
}

function deriveLegacyScripts(nodeScripts: Record<string, string>): Record<string, string> {
  const scripts = { ...nodeScripts }
  if (scripts.check != null) {
    scripts.check = replaceRequired(scripts.check, ' && yarn fix', '', 'scripts.check')
  }

  if (scripts['test:unit'] != null) {
    scripts['test:unit'] = replaceRequired(
      scripts['test:unit'],
      'vitest run --coverage ./test/unit',
      'vitest run --coverage --passWithNoTests ./test/unit',
      'scripts.test:unit',
    )
  }

  if (scripts['test:e2e'] != null) {
    scripts['test:e2e'] = replaceRequired(
      scripts['test:e2e'],
      'vitest run ./test/e2e',
      'vitest run --passWithNoTests ./test/e2e',
      'scripts.test:e2e',
    )
  }

  if (scripts.test != null) {
    scripts.test = replaceRequired(
      scripts.test,
      'vitest run --coverage',
      'vitest run --coverage --passWithNoTests',
      'scripts.test',
    )
  }

  scripts.prepack = 'node ../../scripts/prepare-transloadit.ts'
  return scripts
}

function buildLegacyPackageJson(
  nodePackageJson: PackageJson,
  legacyExisting: PackageJson | null,
): PackageJson {
  const scripts = deriveLegacyScripts(nodePackageJson.scripts ?? {})
  const legacyVersion =
    typeof legacyExisting?.version === 'string' ? legacyExisting.version : nodePackageJson.version
  const legacyPackageJson: PackageJson = {
    ...nodePackageJson,
    name: 'transloadit',
    version: legacyVersion,
    scripts,
    devDependencies: legacyExisting?.devDependencies ?? nodePackageJson.devDependencies,
  }
  if ('publishConfig' in legacyPackageJson) {
    delete legacyPackageJson.publishConfig
  }
  // Normalize bin shape the same way npm does to avoid churn.
  const legacyBin = legacyPackageJson.bin
  if (
    legacyBin &&
    typeof legacyBin === 'object' &&
    'transloadit' in legacyBin &&
    Object.keys(legacyBin).length === 1
  ) {
    legacyPackageJson.bin = legacyBin.transloadit as string
  }

  return legacyPackageJson
}

const writeLegacyPackageJson = async (): Promise<void> => {
  const nodePackageJson = await readJson<PackageJson>(resolve(nodePackage, 'package.json'))
  const legacyExisting = await readJson<PackageJson>(resolve(legacyPackage, 'package.json')).catch(
    () => null,
  )
  const legacyPackageJson = buildLegacyPackageJson(nodePackageJson, legacyExisting)

  const formatted = formatPackageJson(legacyPackageJson)
  await writeFile(resolve(legacyPackage, 'package.json'), formatted)
}

const writeLegacyChangelog = async (): Promise<void> => {
  const changelog = await readFile(resolve(nodePackage, 'CHANGELOG.md'), 'utf8')
  const updated = changelog.replace(/^# .+$/m, '# transloadit')
  await writeFile(resolve(legacyPackage, 'CHANGELOG.md'), updated)
}

const main = async (): Promise<void> => {
  await ensureNodePackagePrepared()

  await copyDir(resolve(nodePackage, 'dist'), resolve(legacyPackage, 'dist'))
  await copyDir(resolve(nodePackage, 'src'), resolve(legacyPackage, 'src'))
  await cp(resolve(nodePackage, 'README.md'), resolve(legacyPackage, 'README.md'))
  await cp(resolve(repoRoot, 'LICENSE'), resolve(legacyPackage, 'LICENSE'))
  await chmod(resolve(legacyPackage, 'dist/cli.js'), 0o755)
  await writeLegacyPackageJson()
  await writeLegacyChangelog()
}

if (process.argv[1] != null && resolve(process.argv[1]) === filePath) {
  await main()
}

export { buildLegacyPackageJson, deriveLegacyScripts }
