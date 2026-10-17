import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { execa } from 'execa'

const root = fileURLToPath(new URL('../', import.meta.url))

async function main(): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'transloadit-init-packed-'))
  const command = execa({ cwd: root, timeout: 180_000 })
  try {
    await command('corepack', ['yarn', 'tsc:node'])
    const { stdout } = await command('npm', [
      'pack',
      './packages/node',
      '--ignore-scripts',
      '--json',
      '--pack-destination',
      directory,
    ])
    const [packed] = JSON.parse(stdout)
    assert(
      packed.files.some((file: { path: string }) => file.path === 'examples/upload-once/demo.ts'),
    )
    assert(
      packed.files.some((file: { path: string }) => file.path === 'examples/fixtures/berkley.jpg'),
    )
    // Release PRs may reference utils versions that have not reached npm yet.
    const utilsPack = await command('npm', [
      'pack',
      './packages/utils',
      '--ignore-scripts',
      '--json',
      '--pack-destination',
      directory,
    ])
    const [utils] = JSON.parse(utilsPack.stdout)
    await command(process.execPath, ['scripts/prepare-transloadit.ts'], {
      env: { TRANSLOADIT_PUBLISH_PREBUILT_NODE: 'true' },
    })
    const legacyPack = await command('npm', [
      'pack',
      './packages/transloadit',
      '--ignore-scripts',
      '--json',
      '--pack-destination',
      directory,
    ])
    const [legacy] = JSON.parse(legacyPack.stdout)
    // The linked release group ships both names together; init pins that same SDK version.
    assert.equal(legacy.version, packed.version, 'CLI distributions must retain version parity')
    assert(
      legacy.files.some((file: { path: string }) => file.path === 'examples/upload-once/demo.ts'),
    )
    assert(
      legacy.files.some((file: { path: string }) => file.path === 'examples/fixtures/berkley.jpg'),
    )
    const cli = join(root, 'packages/node/dist/cli.js')
    const project = join(directory, 'gallery')
    await command(process.execPath, [cli, 'init', 'upload-once', project, '--no-install'])
    assert.deepEqual(await readdir(project), [
      '.gitignore',
      'README.md',
      'demo.ts',
      'package.json',
      'photo.jpg',
    ])
    const manifest = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'))
    // Test the unreleased artifact rather than silently downloading the previous release.
    manifest.dependencies['@transloadit/node'] = `file:${join(directory, packed.filename)}`
    manifest.dependencies.transloadit = `file:${join(directory, legacy.filename)}`
    manifest.dependencies['@transloadit/utils'] = `file:${join(directory, utils.filename)}`
    await writeFile(join(project, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    await command('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: project,
    })
    const lock = JSON.parse(await readFile(join(project, 'package-lock.json'), 'utf8'))
    assert(
      lock.packages['node_modules/@transloadit/utils'].resolved.startsWith('file:'),
      'The packed fixture must exercise this checkout’s utils, including unreleased changes',
    )
    const installed = join(project, 'node_modules/@transloadit/node')
    for (const distribution of ['@transloadit/node', 'transloadit']) {
      assert.equal(
        createRequire(join(project, 'node_modules', distribution, 'package.json')).resolve(
          '@transloadit/utils/package.json',
        ),
        await realpath(join(project, 'node_modules/@transloadit/utils/package.json')),
      )
    }
    const secondProject = join(directory, 'from-installed-package')
    await command(process.execPath, [
      join(installed, 'dist/cli.js'),
      'init',
      'upload-once',
      secondProject,
      '--no-install',
    ])
    assert.equal(
      await readFile(join(secondProject, 'demo.ts'), 'utf8'),
      await readFile(join(project, 'demo.ts'), 'utf8'),
    )
    const legacyProject = join(directory, 'from-legacy-package')
    await command(process.execPath, [
      join(project, 'node_modules/transloadit/dist/cli.js'),
      'init',
      'upload-once',
      legacyProject,
      '--no-install',
    ])
    assert.equal(
      await readFile(join(legacyProject, 'demo.ts'), 'utf8'),
      await readFile(join(project, 'demo.ts'), 'utf8'),
    )
    await command(
      process.execPath,
      [
        join(root, 'node_modules/typescript/bin/tsc'),
        '--noEmit',
        '--strict',
        '--types',
        'node',
        '--target',
        'ES2022',
        '--module',
        'NodeNext',
        'demo.ts',
      ],
      { cwd: project },
    )

    // No saved file: a valid shell pair must win even when the optional fallback does not exist.
    const credentials = join(directory, 'fixture-credentials')
    const trace = join(directory, 'uploads')
    const env = {
      TRANSLOADIT_CREDENTIALS_FILE: credentials,
      TRANSLOADIT_KEY: 'fixture-key',
      TRANSLOADIT_SECRET: 'fixture-secret',
      TRANSLOADIT_AUTH_KEY: '',
      TRANSLOADIT_AUTH_SECRET: '',
      TRANSLOADIT_AUTH_TOKEN: '',
      TRANSLOADIT_ENDPOINT: 'https://api2.transloadit.com',
      TRANSLOADIT_INIT_FIXTURE_PACKAGE: join(installed, 'dist/Transloadit.js'),
      TRANSLOADIT_INIT_FIXTURE_TRACE: trace,
      NODE_OPTIONS: `--import=${new URL('./fixtures/upload-once-mock.ts', import.meta.url).href}`,
    }
    const failed = await command('npm', ['run', 'demo'], {
      cwd: project,
      env: { ...env, TRANSLOADIT_INIT_FIXTURE_FAIL_UPLOAD: 'true' },
      reject: false,
    })
    assert(failed.failed)
    assert(failed.stderr.includes('storage store'))
    assert(!`${failed.stdout}${failed.stderr}`.includes('fixture-signed-secret'))
    const first = await command('npm', ['run', 'demo'], { cwd: project, env })
    const repeated = await command('npm', ['run', 'demo'], { cwd: project, env })
    assert.equal(await readFile(trace, 'utf8'), 'upload\n', 'Second demo run uploaded again')
    const html = await readFile(join(project, 'gallery.html'), 'utf8')
    assert.equal([...html.matchAll(/<img /g)].length, 3)
    const urls = [...html.matchAll(/src="([^"]+)"/g)].map(
      (match) => new URL(match[1].replaceAll('&amp;', '&')),
    )
    for (const url of urls) {
      assert(decodeURIComponent(url.pathname).includes('builtin/storage-preview@0.0.3'))
      assert.equal(url.searchParams.get('v'), `${'B'.repeat(21)}A`)
      assert(url.searchParams.has('sig'))
    }
    assert(!html.includes('fixture-secret'))
    assert(
      !`${first.all ?? first.stdout}${first.stderr}${repeated.stdout}${repeated.stderr}`.includes(
        'fixture-secret',
      ),
    )
    assert.equal((await stat(join(project, 'gallery.html'))).mode & 0o777, 0o600)
    console.log(
      'Both packed CLIs, scaffold, npm install, strict types, secret-safe failure, first demo and repeat demo PASS; one mocked upload, three real signed URLs, no production calls.',
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown fixture failure')
  console.error(
    'Packed upload-once fixture failed; no production credentials or uploads were used.',
  )
  process.exitCode = 1
})
