import { execFile } from 'node:child_process'
import { readdir, rename, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const filePath = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(filePath), '..')
const legacyPackage = resolve(repoRoot, 'packages/transloadit')

const runPack = async () => {
  await execFileAsync('node', [resolve(repoRoot, 'scripts/prepare-transloadit.js')], {
    cwd: repoRoot,
  })

  await execFileAsync('npm', ['pack', '--ignore-scripts', '--prefix', legacyPackage], {
    cwd: repoRoot,
  })

  const entries = await readdir(legacyPackage)
  const tarballs = entries.filter((entry) => entry.endsWith('.tgz'))
  if (tarballs.length === 0) {
    throw new Error('No tarball produced by npm pack')
  }

  for (const tarball of tarballs) {
    const from = resolve(legacyPackage, tarball)
    const to = resolve(repoRoot, tarball)
    await rm(to, { force: true })
    await rename(from, to)
  }
}

runPack().catch((error) => {
  console.error(error)
  process.exit(1)
})
