import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { execa } from 'execa'

const repoRoot = resolve(import.meta.dirname, '..')

async function testPackage(packageName: string): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'transloadit-contract-package-'))
  try {
    const archive = join(directory, 'node.tgz')
    await execa('corepack', ['yarn', 'workspace', packageName, 'pack', '--out', archive], {
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
            [packageName]: `file:${archive}`,
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
    const generatedFiles = await readdir(
      join(directory, 'node_modules', packageName, 'src/generated-contract'),
    )
    if (generatedFiles.includes('coverage.json'))
      throw new Error('Maintainer-only SDK coverage must not ship in the package')
    if (generatedFiles.includes('client.ts'))
      throw new Error('Generated TypeScript must not duplicate the published declarations')
    const generatedDist = join(directory, 'node_modules', packageName, 'dist/generated-contract')
    const distributionFiles = await readdir(generatedDist)
    if (distributionFiles.some((name) => name.endsWith('.map')))
      throw new Error('Generated source maps must not reference unpublished sources')
    for (const name of ['client.js', 'client.d.ts']) {
      const source = await readFile(join(generatedDist, name), 'utf8')
      if (source.includes('//# sourceMappingURL='))
        throw new Error(`Generated ${name} references an unpublished source map`)
    }
    const existingDist = join(directory, 'node_modules', packageName, 'dist')
    for (const name of ['Transloadit.js', 'Transloadit.d.ts']) {
      const source = await readFile(join(existingDist, name), 'utf8')
      if (!source.includes(`//# sourceMappingURL=${name}.map`))
        throw new Error(`Existing ${name} lost its debug map`)
      await readFile(join(existingDist, `${name}.map`), 'utf8')
    }
    const probe = await readFile(join(repoRoot, 'scripts/fixtures/contract-package.ts'), 'utf8')
    await writeFile(join(directory, 'probe.ts'), probe.replaceAll('@transloadit/node', packageName))
    await cp(
      join(directory, 'node_modules', packageName, 'examples/contract-workflow.ts'),
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
    console.log(
      `${packageName}: packed root, contract entry point and example pass strict compilation.`,
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function main(): Promise<void> {
  await testPackage('@transloadit/node')
  await testPackage('transloadit')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
