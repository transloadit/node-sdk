import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const filePath = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(filePath), '..')

type PackTarget = {
  packagePath: string
  extraEnv?: NodeJS.ProcessEnv
}

async function packPackage(packDir: string, target: PackTarget): Promise<void> {
  await execFileAsync('npm', ['pack', target.packagePath, '--pack-destination', packDir], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...target.extraEnv,
    },
  })
}

const main = async (): Promise<void> => {
  const packDir = await mkdtemp(resolve(tmpdir(), 'transloadit-release-dry-run-'))

  await Promise.all([
    packPackage(packDir, {
      packagePath: './packages/node',
      extraEnv: { TRANSLOADIT_PUBLISH_PREBUILT_NODE: 'true' },
    }),
    packPackage(packDir, {
      packagePath: './packages/transloadit',
      extraEnv: { TRANSLOADIT_PUBLISH_PREBUILT_NODE: 'true' },
    }),
  ])

  await packPackage(packDir, {
    packagePath: './packages/mcp-server',
  })
}

if (process.argv[1] != null && resolve(process.argv[1]) === filePath) {
  await main()
}

export { packPackage }
