import { execFile } from 'node:child_process'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const filePath = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(filePath), '..')
const nodePackage = resolve(repoRoot, 'packages/node')
const legacyPackage = resolve(repoRoot, 'packages/transloadit')

const copyDir = async (from, to) => {
  await rm(to, { recursive: true, force: true })
  await mkdir(to, { recursive: true })
  await cp(from, to, { recursive: true })
}

const readJson = async (filePath) => {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

const formatPackageJson = (data) => {
  let json = JSON.stringify(data, null, 2)
  const inlineArray = (key) => {
    const pattern = new RegExp(`"${key}": \\[\\n([\\s\\S]*?)\\n\\s*\\]`, 'm')
    return json.replace(pattern, (_match, inner) => {
      const values = inner
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/,$/, ''))
      return `"${key}": [${values.join(', ')}]`
    })
  }

  json = inlineArray('keywords')
  json = inlineArray('files')
  return `${json}\n`
}

const writeLegacyPackageJson = async () => {
  const nodePackageJson = await readJson(resolve(nodePackage, 'package.json'))
  const scripts = { ...(nodePackageJson.scripts ?? {}) }
  scripts.prepack = 'node ../../scripts/prepare-transloadit.js'
  const legacyPackageJson = {
    ...nodePackageJson,
    name: 'transloadit',
    scripts,
  }

  const formatted = formatPackageJson(legacyPackageJson)
  await writeFile(resolve(legacyPackage, 'package.json'), formatted)
}

const writeLegacyChangelog = async () => {
  const changelog = await readFile(resolve(nodePackage, 'CHANGELOG.md'), 'utf8')
  const updated = changelog.replace(/^# .+$/m, '# transloadit')
  await writeFile(resolve(legacyPackage, 'CHANGELOG.md'), updated)
}

const main = async () => {
  await execFileAsync('yarn', ['workspace', '@transloadit/node', 'prepack'], {
    cwd: repoRoot,
  })

  await copyDir(resolve(nodePackage, 'dist'), resolve(legacyPackage, 'dist'))
  await copyDir(resolve(nodePackage, 'src'), resolve(legacyPackage, 'src'))
  await cp(resolve(repoRoot, 'README.md'), resolve(legacyPackage, 'README.md'))
  await cp(resolve(repoRoot, 'LICENSE'), resolve(legacyPackage, 'LICENSE'))
  await writeLegacyPackageJson()
  await writeLegacyChangelog()
}

await main()
