import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

import { execa } from 'execa'
import { expect, onTestFinished, test } from 'vitest'

interface PackageManifest {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

test.each([
  'private-images',
  'browser-images',
])('explicitly exports both GET and HEAD for the %s fixture', async (route) => {
  const source = await readFile(
    resolve(import.meta.dirname, `fixtures/img-next/app/api/${route}/route.ts`),
    'utf8',
  )
  expect(source).toContain('as GET,')
  expect(source).toContain('as HEAD')
})

test('documents the pinned alpha pipeline, cache-key policy and server-enforced key separation', async () => {
  const readme = await readFile(resolve(import.meta.dirname, '../packages/img/README.md'), 'utf8')
  expect(readme).toContain('builtin/storage-preview@0.0.2')
  expect(readme).toContain('fallbackBackground')
  expect(readme).toContain('#00000000')
  expect(readme).toContain('Production Smart CDN uses Bunny')
  expect(readme).toContain('whole query string')
  expect(readme).not.toContain('NoCacheSigExp')
  expect(readme).toContain('by design')
})

async function readManifest(path: string): Promise<PackageManifest> {
  return JSON.parse(await readFile(path, 'utf8'))
}

test('keeps seed credentials outside Next and defines the factory before its first render', async () => {
  const readme = await readFile(resolve(import.meta.dirname, '../packages/img/README.md'), 'utf8')
  const dogfood = await readFile(resolve(import.meta.dirname, '../docs/img-dogfood.md'), 'utf8')
  expect.soft(dogfood).not.toContain('allowImportingTsExtensions')
  expect.soft(/^\s*node --env-file=(\S+) seed\.ts /m.exec(dogfood)?.[1]).toBe('.env.seed.local')
  const factory = readme.indexOf('export const { StorageImage')
  const firstRender = readme.indexOf("import { StorageImage } from '../lib/storageImage'")
  expect(factory).toBeGreaterThan(0)
  expect.soft(firstRender).toBeGreaterThan(factory)
  expect.soft(readme).toMatch(/`next build`.*runtime/s)
  expect
    .soft(readme)
    .not.toMatch(
      /allowImportingTsExtensions|gh pr checkout|from ['"][^'"]+\.tsx?['"]|type:.*module/,
    )
})

test('gets to the first image before teaching the security model and keeps the private recipe complete', async () => {
  const readme = await readFile(resolve(import.meta.dirname, '../packages/img/README.md'), 'utf8')
  const firstFactory = readme.slice(
    readme.indexOf('export const { StorageImage'),
    readme.indexOf('Then in `app/page.tsx`'),
  )
  expect(firstFactory).toContain("public: ['website/']")
  expect(firstFactory).toContain('createStorageImages')
  expect(firstFactory).not.toContain('authorize:')
  const login = readme.indexOf('yarn transloadit auth login')
  const store = readme.indexOf('yarn transloadit storage store')
  const page = readme.indexOf('export default function Page()')
  const privacy = readme.indexOf('## Ship it privately')
  expect(login).toBeGreaterThan(0)
  expect(store).toBeGreaterThan(login)
  expect(page).toBeGreaterThan(store)
  expect(privacy).toBeGreaterThan(page)
  expect(readme.slice(0, page)).not.toContain('Assembly-only')
  expect(readme).toContain('## Under the hood')
  expect(readme).toContain('storageRoute as GET, storageRoute as HEAD')
  expect(readme).not.toContain('loading="eager"')
  expect(readme).toContain('Firefox 150+')
  expect(readme).toContain('Safari 27 beta')
  expect(readme).toContain('Uppy')
  expect(readme).toContain('"robot": "/transloadit/store"')
  expect(readme).toContain('notification')
  expect(readme).toContain('EXIF')
  expect(readme).toContain('asset_id')
  expect(readme).toContain('Run from your app root')
  expect(readme).toContain('standard Web `Request`')
  expect(readme).toContain('denied requests return `404`')
  expect(readme).toContain('All three factories')
  expect(readme).toContain('TRANSLOADIT_ENDPOINT')
  expect(readme).toContain('https://github.com/transloadit/node-sdk/blob/main/docs/img-dogfood.md')
  expect(readme).not.toContain('](../../docs/')
  expect(readme).toContain('The default route is `/api/storage-images`')
  expect(readme).toContain('capability has no independent expiry')
})

test('locks every external runtime dependency of the packed image package', async () => {
  const repoRoot = resolve(import.meta.dirname, '..')
  const imageManifest = await readManifest(resolve(repoRoot, 'packages/img/package.json'))
  const fixtureManifest = await readManifest(
    resolve(repoRoot, 'scripts/fixtures/img-next/package.json'),
  )
  const fixtureDependencies = {
    ...fixtureManifest.dependencies,
    ...fixtureManifest.devDependencies,
  }

  for (const [name, range] of Object.entries(imageManifest.dependencies ?? {})) {
    if (range.startsWith('workspace:')) continue
    expect(fixtureDependencies[name], `${name} must be pinned in the fixture`).toMatch(/^\d/)
  }
})

test.each([
  ['scripts/fixtures/img-next/package.json', 'scripts/fixtures/img-next/package-lock.json', 0],
  ['scripts/fixtures/img-next/package.json', 'yarn.lock', 1],
  ['package.json', 'scripts/fixtures/img-next/package-lock.json', 1],
  ['package.json', 'yarn.lock', 0],
])('guards dependency changes in %s with %s (exit %i)', async (manifest, lockfile, exitCode) => {
  const directory = await mkdtemp(resolve(tmpdir(), 'img-lockfile-test-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  const git = (...args: string[]) => execa('git', args, { cwd: directory })
  await git('init', '--quiet')
  await git('config', 'user.name', 'Fixture')
  await git('config', 'user.email', 'fixture@example.invalid')
  await mkdir(resolve(directory, 'scripts/fixtures/img-next'), { recursive: true })
  const initial = `${JSON.stringify({ dependencies: { react: '19.2.0' } })}\n`
  await writeFile(resolve(directory, 'package.json'), initial)
  await writeFile(resolve(directory, 'scripts/fixtures/img-next/package.json'), initial)
  await git('add', '.')
  await git(
    '-c',
    'core.hooksPath=/dev/null',
    'commit',
    '--quiet',
    '--no-gpg-sign',
    '-m',
    'Baseline',
  )
  const { stdout: base } = await git('rev-parse', 'HEAD')
  await writeFile(
    resolve(directory, manifest),
    `${JSON.stringify({ dependencies: { react: '19.2.1' } })}\n`,
  )
  await writeFile(resolve(directory, lockfile), 'Updated dependency lock\n')
  await git('add', '.')
  await git(
    '-c',
    'core.hooksPath=/dev/null',
    'commit',
    '--quiet',
    '--no-gpg-sign',
    '-m',
    'Dependency change',
  )
  const { stdout: head } = await git('rev-parse', 'HEAD')

  // Exercise the actual legacy inline guard, not a duplicate implementation of its lockfile policy.
  const workflow = await readFile(
    resolve(import.meta.dirname, '../.github/workflows/ci.yml'),
    'utf8',
  )
  const guard = workflow.split("node <<'NODE'\n")[1]?.split('\n          NODE')[0]
  if (guard === undefined) throw new Error('CI lockfile guard was not found')
  const result = await execa(process.execPath, ['--input-type=commonjs', '--eval', guard], {
    cwd: directory,
    env: { BASE_SHA: base, HEAD_SHA: head },
    reject: false,
  })
  expect(result.exitCode, result.stderr).toBe(exitCode)
})
