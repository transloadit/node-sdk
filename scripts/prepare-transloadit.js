import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
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

const main = async () => {
  await execFileAsync('yarn', ['workspace', '@transloadit/node', 'prepack'], {
    cwd: repoRoot,
  })

  await copyDir(resolve(nodePackage, 'dist'), resolve(legacyPackage, 'dist'))
  await copyDir(resolve(nodePackage, 'src'), resolve(legacyPackage, 'src'))
  await cp(resolve(repoRoot, 'README.md'), resolve(legacyPackage, 'README.md'))
  await cp(resolve(repoRoot, 'LICENSE'), resolve(legacyPackage, 'LICENSE'))
}

await main()
