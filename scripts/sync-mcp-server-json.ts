import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

interface PackageJson {
  name: string
  version: string
}

interface ServerJson {
  version: string
  packages: { registryType: string; identifier: string; version: string }[]
}

/**
 * The MCP Registry entry must name the npm version it installs. Changesets only bumps
 * package.json, so the Version Packages PR runs this to carry that version into server.json,
 * replacing the version values in place to keep the file's formatting.
 */
async function main(): Promise<void> {
  const { positionals } = parseArgs({ allowPositionals: true })
  const packageDir = resolve(positionals[0] ?? 'packages/mcp-server')
  const { name, version }: PackageJson = JSON.parse(
    await readFile(join(packageDir, 'package.json'), 'utf8'),
  )
  const serverJsonPath = join(packageDir, 'server.json')
  const synced = (await readFile(serverJsonPath, 'utf8')).replaceAll(
    /("version":\s*)"[^"]*"/g,
    (_match, key: string) => `${key}${JSON.stringify(version)}`,
  )
  // Parsing again proves the replacement kept valid JSON and reached both version fields.
  const serverJson: ServerJson = JSON.parse(synced)
  const npmPackage = serverJson.packages.find(
    (entry) => entry.registryType === 'npm' && entry.identifier === name,
  )
  if (
    typeof version !== 'string' ||
    serverJson.version !== version ||
    npmPackage?.version !== version
  ) {
    throw new Error(`Could not set ${serverJsonPath} to ${name}@${version}`)
  }
  await writeFile(serverJsonPath, synced)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
