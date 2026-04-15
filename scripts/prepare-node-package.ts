import { execFile } from 'node:child_process'
import { access, chmod, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const filePath = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(filePath), '..')
const nodePackage = resolve(repoRoot, 'packages/node')
const nodeDistCli = resolve(nodePackage, 'dist/cli.js')

function shouldReusePreparedNodeDist(hasNodeDist: boolean): boolean {
  return process.env.TRANSLOADIT_PUBLISH_PREBUILT_NODE === 'true' && hasNodeDist
}

const ensureNodePackagePrepared = async (): Promise<void> => {
  const hasNodeDist = await access(nodeDistCli)
    .then(() => true)
    .catch(() => false)

  if (shouldReusePreparedNodeDist(hasNodeDist)) {
    await chmod(nodeDistCli, 0o755)
    return
  }

  await rm(resolve(nodePackage, 'dist'), { recursive: true, force: true })
  await rm(resolve(nodePackage, 'tsconfig.tsbuildinfo'), { force: true })
  await rm(resolve(nodePackage, 'tsconfig.build.tsbuildinfo'), { force: true })
  await execFileAsync('yarn', ['tsc:node'], {
    cwd: repoRoot,
  })
  await chmod(nodeDistCli, 0o755)
}

if (process.argv[1] != null && resolve(process.argv[1]) === filePath) {
  await ensureNodePackagePrepared()
}

export { ensureNodePackagePrepared, shouldReusePreparedNodeDist }
