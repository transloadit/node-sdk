import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const filePath = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(filePath), '..')
const packagesDir = resolve(repoRoot, 'packages')

const dependencyFields = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const

type PackageJson = Record<string, unknown> & {
  name?: string
  private?: boolean
}

const readJson = async (path: string): Promise<PackageJson> => {
  const raw = await readFile(path, 'utf8')
  return JSON.parse(raw) as PackageJson
}

const main = async (): Promise<void> => {
  const entries = await readdir(packagesDir, { withFileTypes: true })
  const issues: Array<{ pkg: string; field: string; name: string; version: string }> = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const packageJsonPath = resolve(packagesDir, entry.name, 'package.json')
    const pkg = await readJson(packageJsonPath)
    if (pkg.private) continue

    for (const field of dependencyFields) {
      const deps = pkg[field] as Record<string, unknown> | undefined
      if (!deps) continue
      for (const [name, version] of Object.entries(deps)) {
        if (typeof version === 'string' && version.startsWith('workspace:')) {
          issues.push({
            pkg: pkg.name ?? entry.name,
            field,
            name,
            version,
          })
        }
      }
    }
  }

  if (issues.length === 0) return

  console.error('Found workspace protocol versions in publishable packages:')
  for (const issue of issues) {
    console.error(`- ${issue.pkg} (${issue.field}): ${issue.name} -> ${issue.version}`)
  }
  process.exit(1)
}

main().catch((error) => {
  console.error('Failed to check workspace protocol dependencies')
  console.error(error)
  process.exit(1)
})
