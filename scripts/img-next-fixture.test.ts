import type { Node } from 'typescript'

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { execa } from 'execa'
import {
  createSourceFile,
  forEachChild,
  isStringLiteral,
  ScriptKind,
  ScriptTarget,
} from 'typescript'
import { expect, onTestFinished, test } from 'vitest'

import { storageImagePage } from '../packages/node/src/cli/storageSnippets.ts'

test('scaffold helpers load in a cold checkout without built workspace packages', async () => {
  const source = pathToFileURL(
    resolve(import.meta.dirname, '../packages/node/src/cli/storageSnippets.ts'),
  ).href
  const result = await execa(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `
    import { registerHooks } from 'node:module'
    registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('@transloadit/')) throw new Error('Workspace packages are not built yet')
        return nextResolve(specifier, context)
      },
    })
    await import(${JSON.stringify(source)})
  `,
    ],
    { reject: false },
  )
  expect(result.exitCode, result.stderr).toBe(0)
})

interface PackageManifest {
  description?: string
  engines?: { node?: string }
  files?: string[]
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  private?: boolean
  publishConfig?: { access?: string; tag?: string }
}

test('Viewer alpha is publishable with explicit release metadata and registry dependencies', async () => {
  const manifest = await readManifest(resolve(import.meta.dirname, '../packages/img/package.json'))
  expect(manifest.private).not.toBe(true)
  expect(manifest.description).toMatch(/\balpha\b/i)
  expect(manifest.publishConfig).toEqual({ access: 'public', tag: 'alpha' })
  expect(manifest.dependencies?.['@transloadit/utils']).toMatch(/^\^\d+\.\d+\.\d+$/)
  const readme = await readFile(resolve(import.meta.dirname, '../packages/img/README.md'), 'utf8')
  expect(readme).toContain('Alpha')
  expect(readme).toContain('API may change')
  expect(readme).toContain('@transloadit/viewer@alpha')
  expect(readme).toContain('matching API2 deployment')
  expect(readme).not.toContain('Unpublished dogfood')
})

function scaffoldUploadCommand(page: string): string {
  const commands: string[] = []
  function visit(node: Node): void {
    if (isStringLiteral(node) && node.text.startsWith('npx transloadit storage store'))
      commands.push(node.text)
    forEachChild(node, visit)
  }
  visit(createSourceFile('page.tsx', page, ScriptTarget.Latest, true, ScriptKind.TSX))
  expect(commands).toHaveLength(1)
  const command = commands[0]
  if (command === undefined) throw new Error('Expected the generated upload command')
  return command
}

test.each([
  'team photos/',
  "team'photos/",
  'cash$IMG_SNIPPET_SENTINEL/',
])('the scaffold upload command preserves the literal prefix %s in a shell', async (prefix) => {
  const command = scaffoldUploadCommand(storageImagePage('../../transloadit.images.json', prefix))
  // A local function captures arguments; no npx process, network request or upload runs.
  const result = await execa('bash', ['-c', `npx() { printf '%s\\n' "$@"; }\n${command}`], {
    reject: false,
    env: { IMG_SNIPPET_SENTINEL: 'must-not-expand' },
  })
  expect(result.exitCode).toBe(0)
  expect(result.stdout.split('\n')).toEqual([
    'transloadit',
    'storage',
    'store',
    './hero.jpg',
    `${prefix}hero.jpg`,
  ])
})

test('a custom catalog remains the upload destination advertised by image init', async () => {
  const page = storageImagePage('../../catalog photos.json', 'website/', 'catalog photos.json')
  const command = scaffoldUploadCommand(page)
  const result = await execa('bash', ['-c', `npx() { printf '%s\\n' "$@"; }\n${command}`])
  expect(result.stdout.split('\n')).toContain('--receipts=catalog photos.json')
  expect(page).toContain("from '@transloadit/viewer/next'")
})

test('the generated example is already formatted for the repository Biome configuration', async () => {
  const page = storageImagePage('../../transloadit.images.json', 'website/')
  const result = await execa(
    process.execPath,
    [
      resolve(import.meta.dirname, '../node_modules/@biomejs/biome/bin/biome'),
      'format',
      '--stdin-file-path=app/storage-image-example/page.tsx',
    ],
    { input: page, stripFinalNewline: false },
  )
  expect(result.stdout).toBe(page)
})

test.each([
  'node',
  'transloadit',
])('the %s CLI declares the Node floor for JSON imports and composed cancellation', async (name) => {
  const manifest = await readManifest(
    resolve(import.meta.dirname, `../packages/${name}/package.json`),
  )
  expect(manifest.engines?.node).toBe('>= 20.10.0')
})

async function imageDocumentation(): Promise<string> {
  return `${await readFile(resolve(import.meta.dirname, '../packages/img/README.md'), 'utf8')}\n${await readFile(resolve(import.meta.dirname, '../packages/img/docs/reference.md'), 'utf8')}`
}

test('private setup prefers the least-privilege signing scope', async () => {
  const readme = await readFile(resolve(import.meta.dirname, '../packages/img/README.md'), 'utf8')
  const privateRecipe = readme.slice(
    readme.indexOf('## Private'),
    readme.indexOf('## When it breaks'),
  )
  expect(privateRecipe).toContain('smart_cdn:sign')
  expect(privateRecipe).toMatch(/assemblies:write.*also accepted/)
  expect(privateRecipe).toContain('Assembly')
  expect(privateRecipe).toContain('// transloadit.authorize.ts')
  expect(privateRecipe).toContain('getSession')
  expect(privateRecipe).toContain('canReadAsset(asset_id) === true')
  expect(privateRecipe).toContain('// app/api/storage-images/route.ts')
  expect(privateRecipe).toContain("export { GET, HEAD } from '@transloadit/viewer/next/route'")
  expect(privateRecipe).toContain('TRANSLOADIT_SMART_CDN_KEY=')
  expect(privateRecipe).toContain('TRANSLOADIT_SMART_CDN_SECRET=')
  expect(privateRecipe).toContain('Restart `next dev` after adding the authorizer')
  expect(privateRecipe).not.toContain('placeholder="blur"')
  const reference = await readFile(
    resolve(import.meta.dirname, '../packages/img/docs/reference.md'),
    'utf8',
  )
  expect(reference).toContain('INSUFFICIENT_AUTH_SCOPE')
  expect(reference).not.toContain('A generic 403 cannot tell us')
})

test('image docs distinguish version pinning from optional immutable filenames', async () => {
  const docs = (await imageDocumentation()).replaceAll(/\s+/g, ' ')
  expect(docs).toContain(
    'even a cold request after an overwrite reads that exact retained version, never the replacement',
  )
  const readme = await readFile(resolve(import.meta.dirname, '../packages/img/README.md'), 'utf8')
  expect(readme.slice(0, readme.indexOf('## Responsive'))).toContain('immutable filename')
  expect(readme.slice(0, readme.indexOf('## Responsive'))).toContain(
    'Prefer `--hashed` for images you will replace',
  )
  expect(readme.indexOf('Prefer `--hashed`')).toBeLessThan(
    readme.indexOf('npx transloadit storage store'),
  )
  const quickstart = readme.slice(0, readme.indexOf('## Responsive'))
  expect(quickstart).toContain(
    'npx transloadit storage store ./hero.jpg website/hero.jpg --public --hashed',
  )
  expect(quickstart).toContain('use the printed JSX path')
  expect(quickstart).toContain(
    'Use the path printed by your upload as `src`; the hash below is only an example',
  )
  expect(quickstart).toContain('src="website/hero.fce9d56a.jpg"')
  expect(docs).toContain('eight hex')
  expect(docs).toContain('same bytes')
  expect(docs).toContain('Hashed filenames remain useful for repository organization')
  expect(docs).toContain('placeholder="blur"')
  expect(docs).toContain('thumbhash')
  expect(docs).toContain('hasAlpha: true')
  expect(docs).toContain('transparent image: no blur placeholder')
  expect(docs).toContain('no client-side load handler')
  expect(docs).toContain('img-src data:')
  expect(docs).toContain('6 KB')
})

test('server-upload docs connect verified receipts to an explicit private rendering factory', async () => {
  const readme = await readFile(resolve(import.meta.dirname, '../packages/img/README.md'), 'utf8')
  expect(readme).toContain(
    '](https://github.com/transloadit/node-sdk/blob/main/packages/node/README.md#store-an-image)',
  )
  const node = await readFile(resolve(import.meta.dirname, '../packages/node/README.md'), 'utf8')
  expect(node).toContain('storage store ./hero.jpg website/hero.jpg --public --hashed')
  expect(node).toContain('use the printed JSX path')
  const reference = await readFile(
    resolve(import.meta.dirname, '../packages/img/docs/reference.md'),
    'utf8',
  )
  const uploads = reference.slice(
    reference.indexOf('### Images uploaded by your users'),
    reference.indexOf('### Credentials and framework adapters'),
  )
  expect(uploads).toContain("import { createImages } from '@transloadit/viewer/next/server'")
  expect(uploads).toContain('export const { Image, imageRoute } = createImages({')
  expect(uploads).toContain("allowedPathPrefixes: ['uploads/']")
  expect(uploads).toContain('canReadAsset(asset_id) === true')
  expect(uploads).toContain('// app/api/upload-images/route.ts')
  expect(uploads).toContain("route: '/api/upload-images'")
  expect(uploads).toContain(
    "export { imageRoute as GET, imageRoute as HEAD } from '../../upload-images'",
  )
  expect(uploads).toContain("import { Image } from '../../upload-images'")
  expect(uploads).toContain('<Image src={savedImage}')
  expect(uploads).toContain('getAuthorizedImage')
  expect(uploads).toContain('not SDK helpers')
  expect(uploads).toContain('does not need the CLI catalog or a rebuild for each upload')
  expect(uploads).not.toContain('allowWorkspaceRoot: true')
  expect(uploads).not.toContain("public: ['uploads/']")
})

test('the leading SDK example selects SHA-256 for combined keys without changing the legacy default', async () => {
  const readme = await readFile(resolve(import.meta.dirname, '../packages/node/README.md'), 'utf8')
  const example = readme
    .slice(readme.indexOf('const transloadit = new Transloadit('))
    .split('```')[0]
  expect(example).toContain("signatureAlgorithm: 'sha256'")
  const constructorDocs = readme
    .slice(readme.indexOf('#### constructor(options)'))
    .split('\n#### ')[0]
  expect(constructorDocs).toContain("signatureAlgorithm: 'sha256'")
  expect(constructorDocs).toContain("default `'sha384'`")
  const reference = await readFile(
    resolve(import.meta.dirname, '../packages/img/docs/reference.md'),
    'utf8',
  )
  const keyRecipe = reference.slice(
    reference.indexOf('For private deployments, create'),
    reference.indexOf('Login saves'),
  )
  expect(keyRecipe).toContain("signatureAlgorithm: 'sha256'")
})

test('cache keys and native recovery describe the version-pinned contract and deployment prerequisite', async () => {
  const reference = await readFile(
    resolve(import.meta.dirname, '../packages/img/docs/reference.md'),
    'utf8',
  )
  expect(reference).toContain('configured on `*.tlcdn.com`')
  const readme = await readFile(resolve(import.meta.dirname, '../packages/img/README.md'), 'utf8')
  expect(readme).not.toMatch(/storage ls|storage receipts sync/)
  expect(readme).toContain('Restore the committed catalog')
  expect(readme).not.toContain('[Recovery requires the Storage read API')
  expect(readme).toContain('](./docs/reference.md#recovery)')
  const recovery = reference.slice(reference.indexOf('### Recovery'))
  expect(recovery).toContain('storage ls')
  expect(recovery).toContain('storage receipts sync')
  expect(recovery).toContain('GET /dam/assets')
  expect(recovery).toContain('dam:read')
  expect(recovery).toContain('without S3, per-file HEAD requests')
  expect(recovery).toContain('HTTP 403 means access was refused')
  const node = await readFile(resolve(import.meta.dirname, '../packages/node/README.md'), 'utf8')
  const legacy = await readFile(
    resolve(import.meta.dirname, '../packages/transloadit/README.md'),
    'utf8',
  )
  expect(node).toContain('reference.md#recovery)')
  expect(node).toContain('Older API deployments may not yet expose these reads')
  expect(legacy).toContain('reference.md#recovery)')
  expect(reference).toContain('`v` is its actual version ID, not a digest or arbitrary cache tag')
  expect(node).toContain(
    'client.getStoredAsset(receipt.asset_id, { version_id: receipt.version_id })',
  )
})

test('private deployment uses an application key rather than the revocable CLI login identity', async () => {
  const documentation = await imageDocumentation()
  expect(documentation).toContain('Credentials → New Auth Key')
  expect(documentation).toContain('separate application key')
  expect(documentation).toContain('TRANSLOADIT_SMART_CDN_SECRET')
  expect(documentation).not.toContain("Supply the login's")
})

test('the reference describes the generated alt and isolated workspace selection', async () => {
  const documentation = await imageDocumentation()
  expect(documentation).toContain('filename-derived alt')
  expect(documentation).not.toContain('decorative empty alt')
  expect(documentation).toContain('An explicit `workspace` prop cannot borrow another workspace')
  expect(documentation).not.toContain('`TRANSLOADIT_WORKSPACE` overrides the catalog workspace')
})

test('the package index and reference authorizer use the selected source identity', async () => {
  const root = await readFile(resolve(import.meta.dirname, '../README.md'), 'utf8')
  expect(root).toContain('`@transloadit/viewer`')
  expect(root).not.toContain('`@transloadit/img`')
  const reference = await readFile(
    resolve(import.meta.dirname, '../packages/img/docs/reference.md'),
    'utf8',
  )
  const recipe = reference.slice(reference.indexOf('import { authenticate, canReadStorageObject }'))
  expect(recipe).toContain('if (template !== transloaditStoragePreviewTemplate) return false')
})

test('the README is a short invitation, with operational caveats in the reference', async () => {
  const readme = await readFile(resolve(import.meta.dirname, '../packages/img/README.md'), 'utf8')
  // Keep Storage, private delivery and the short HTTP/S3 entry point out of operations-manual territory.
  expect(readme.split('\n').length).toBeLessThanOrEqual(110)
  expect(readme).toContain('width={960} preload')
  expect(readme).toContain("import type { NextConfig } from 'next'")
  expect(readme).toContain('const nextConfig: NextConfig =')
  expect(readme).toContain('export default withTransloaditImages(nextConfig)')
  expect(readme).not.toMatch(/Bunny|NEXT_PUBLIC_|--replace|cached bytes|`v`/)
})

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

test('documents the pinned alpha pipeline, public cache policy and combined credential contract', async () => {
  const readme = await imageDocumentation()
  expect(readme).toContain('builtin/storage-preview@0.0.3')
  expect(readme).toContain('fallbackBackground')
  expect(readme).toContain('#00000000')
  expect(readme).toContain('Production Smart CDN uses Bunny')
  expect(readme).toContain('whole query string')
  expect(readme).not.toContain('NoCacheSigExp')
  expect(readme).toContain('builtin/public-preview@0.0.2')
  expect(readme).toContain('immutable')
  expect(readme).toContain('TRANSLOADIT_KEY')
  expect(readme).toContain('TRANSLOADIT_SMART_CDN_KEY/SECRET')
  expect(readme).not.toContain('by design')
})

async function readManifest(path: string): Promise<PackageManifest> {
  return JSON.parse(await readFile(path, 'utf8'))
}

test('keeps the maintainer seed separate and uses the package import without default scaffolding', async () => {
  const readme = await imageDocumentation()
  const dogfood = await readFile(resolve(import.meta.dirname, '../docs/img-dogfood.md'), 'utf8')
  expect.soft(dogfood).not.toContain('allowImportingTsExtensions')
  expect.soft(/^\s*node --env-file=(\S+) seed\.ts /m.exec(dogfood)?.[1]).toBe('.env.seed.local')
  const store = readme.indexOf('npx transloadit storage store ./hero.jpg website/hero.jpg --public')
  const firstRender = readme.indexOf("import { Image } from '@transloadit/viewer/next'")
  expect(store).toBeGreaterThan(0)
  expect.soft(firstRender).toBeGreaterThan(store)
  expect.soft(readme).toContain('never reads or validates signing credentials')
  expect
    .soft(readme)
    .not.toMatch(
      /allowImportingTsExtensions|gh pr checkout|from ['"][^'"]+\.tsx?['"]|type:.*module/,
    )
})

test('gets to the first image before teaching the security model and keeps the private recipe complete', async () => {
  const readme = await imageDocumentation()
  const quickstart = readme
    .slice(readme.indexOf('## Quickstart'), readme.indexOf('## Responsive'))
    .trim()
  expect(quickstart.split('\n').length).toBeLessThanOrEqual(40)
  expect(quickstart).not.toContain('image init')
  expect(quickstart).toContain('withTransloaditImages')
  expect(quickstart).not.toContain('--write-env')
  expect(quickstart).toContain('app/page.tsx')
  expect(quickstart).toContain('transloadit-images.d.ts')
  expect(quickstart).toContain('transloadit.images.json')
  expect(quickstart).toContain('Start with `auth login` even without an account')
  expect(quickstart).toContain('create a free workspace')
  expect(readme).toContain('Older deployments may watermark Community-plan uploads')
  expect(quickstart).toContain('npm run dev')
  expect(quickstart).not.toContain('authorize:')
  const login = readme.indexOf('npx transloadit auth login')
  const store = readme.indexOf('npx transloadit storage store')
  const page = readme.indexOf('<Image storage src=')
  const privacy = readme.indexOf('## Private')
  expect(login).toBeGreaterThan(0)
  expect(store).toBeGreaterThan(login)
  expect(page).toBeGreaterThan(store)
  expect(privacy).toBeGreaterThan(page)
  expect(readme.slice(0, page)).not.toContain('Assembly-only')
  expect(readme.indexOf('## When it breaks')).toBeGreaterThan(privacy)
  expect(readme.indexOf('## Reference')).toBeGreaterThan(readme.indexOf('## When it breaks'))
  expect(readme).toContain('imageRoute as GET, imageRoute as HEAD')
  expect(readme).not.toContain('yarn transloadit')
  expect(readme).not.toContain('loading="eager"')
  expect(readme).toContain('Firefox 150+')
  expect(readme).toContain('Safari does not yet')
  expect(readme).toContain('Uppy')
  expect(readme).toContain('"robot": "/transloadit/store"')
  expect(readme).toContain('notification')
  expect(readme).toContain('EXIF')
  expect(readme).toContain('asset_id')
  expect(readme).toContain('Run beside `package.json`')
  expect(readme).toContain('standard Web `Request`')
  expect(readme).toContain('denied requests return `404`')
  expect(readme).toContain('One factory owns both modes')
  expect(readme).not.toMatch(/\bcreatePrivateStorageImages\b|\bcreateTransloaditImage\b|--next/)
  expect(readme).toContain('TRANSLOADIT_ENDPOINT')
  expect(readme).toContain('https://github.com/transloadit/node-sdk/blob/main/docs/img-dogfood.md')
  expect(readme).not.toContain('](../../docs/')
  expect(readme).toContain('The default route is `/api/storage-images`')
  expect(readme).toContain('capability has no independent expiry')
})

test('answers stranger signup and delivery setup questions without a private-doc dead end', async () => {
  const readme = await readFile(resolve(import.meta.dirname, '../packages/img/README.md'), 'utf8')
  const reference = await readFile(
    resolve(import.meta.dirname, '../packages/img/docs/reference.md'),
    'utf8',
  )
  const quickstart = readme.slice(readme.indexOf('## Quickstart'), readme.indexOf('## Responsive'))
  expect(quickstart).toContain('@transloadit/viewer@alpha')
  expect(quickstart).toContain('matching API2 deployment')
  expect(quickstart).toContain('pnpm add')
  expect(quickstart).toContain('yarn add')
  expect(quickstart).toMatch(/choose Sign up in the\s+browser it opens/)
  expect(reference).toContain('15 minutes')
  expect(quickstart.indexOf('16.3.3')).toBeLessThan(quickstart.indexOf('auth login'))
  expect(readme).toContain('`baseUrl` and `urlParams`')
  expect(readme).toContain('`<workspace>.tlcdn.com`')
  const troubleshooting = `${readme.slice(readme.indexOf('## When it breaks'))}\n${reference}`
  expect(troubleshooting).toContain('auth login --endpoint <url>')
  expect(troubleshooting).toContain('persists that endpoint')
  expect(troubleshooting).toContain('TRANSLOADIT_CREDENTIALS_FILE')
  expect(troubleshooting).toContain('in your shell')
  expect(troubleshooting).toContain('Console → Credentials')
  expect(readme).not.toContain('https://transloadit.com/c/<workspace>')
  expect(quickstart).toContain('any JPEG you have')
  expect(quickstart).toContain('If your app has `src/`, prefix the source paths')
  expect(readme).toContain('Credentials')
  expect(reference).toContain('## Delivery overrides')
  expect(reference).toContain('baseUrl:')
  expect(reference).toContain('urlParams:')
  expect(reference).not.toContain('Restart development to retry')
  expect(reference).toContain('density-corrected')
})

test('ships a focused secretless quickstart and the detailed reference it links to', async () => {
  const readme = await readFile(resolve(import.meta.dirname, '../packages/img/README.md'), 'utf8')
  const reference = await readFile(
    resolve(import.meta.dirname, '../packages/img/docs/reference.md'),
    'utf8',
  )
  const manifest = await readManifest(resolve(import.meta.dirname, '../packages/img/package.json'))
  expect(manifest.files).toContain('docs')
  expect(readme).toContain('](./docs/reference.md')
  expect(readme.split('\n').length).toBeLessThanOrEqual(110)
  expect(readme).toContain('16.3.3')
  expect(reference).toContain("cacheMaxAge: '1m'")
  expect(readme).toContain('then deploy')
  expect(readme).toContain('width={960} preload')
  expect(reference).toContain('Windows')
  expect(readme).not.toContain('maxWidth=')
  expect(readme).not.toMatch(/rotationIntervalMs|delivery: 'direct'|deferUntilHydrated|retryKey/)
  expect(reference).toContain('Experimental')
  expect(reference).toContain('This deliberately changes cache keys')
  expect(reference).toContain('storage publications')
  const node = await readFile(resolve(import.meta.dirname, '../packages/node/README.md'), 'utf8')
  expect(node).toContain('auth login')
  expect(node).toContain('storage store ./hero.jpg website/hero.jpg --public')
  expect(node).toContain('auth logout')
  expect(node).not.toMatch(/storage ls website\/|storage receipts sync website\//)
  expect(node).toContain('Recovery options and prerequisites')
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
