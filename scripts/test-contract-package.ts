import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { execa } from 'execa'

const repoRoot = resolve(import.meta.dirname, '..')

async function main(): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'transloadit-contract-package-'))
  try {
    const archive = join(directory, 'node.tgz')
    await execa('corepack', ['yarn', 'workspace', '@transloadit/node', 'pack', '--out', archive], {
      cwd: repoRoot,
      stdio: 'inherit',
    })
    const manifest: { packageManager: string; devDependencies: Record<string, string> } =
      JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'))
    await writeFile(
      join(directory, 'package.json'),
      `${JSON.stringify(
        {
          private: true,
          type: 'module',
          packageManager: manifest.packageManager,
          dependencies: {
            '@transloadit/node': `file:${archive}`,
            '@types/node': manifest.devDependencies['@types/node'],
            typescript: manifest.devDependencies.typescript,
          },
        },
        null,
        2,
      )}\n`,
    )
    await writeFile(
      join(directory, '.yarnrc.yml'),
      'nodeLinker: node-modules\nenableScripts: false\n',
    )
    await execa('corepack', ['yarn', 'install'], {
      cwd: directory,
      stdio: 'inherit',
      env: { YARN_ENABLE_IMMUTABLE_INSTALLS: 'false' },
    })
    await cp(join(repoRoot, 'scripts/fixtures/contract-package.ts'), join(directory, 'probe.ts'))
    await cp(
      join(repoRoot, 'packages/node/examples/contract-workflow.ts'),
      join(directory, 'example.ts'),
    )
    await execa(
      'corepack',
      [
        'yarn',
        'tsc',
        '--noEmit',
        '--strict',
        '--noUncheckedIndexedAccess',
        '--exactOptionalPropertyTypes',
        '--skipLibCheck',
        'false',
        '--target',
        'es2023',
        '--module',
        'nodenext',
        '--types',
        'node',
        'probe.ts',
        'example.ts',
      ],
      {
        cwd: directory,
        stdio: 'inherit',
      },
    )
    console.log('Packed root, contract entry point and workflow example pass strict compilation.')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
