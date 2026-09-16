import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'

import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from 'next/constants.js'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { withTransloaditImages } from '../src/next/config.ts'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'img-next-config-'))
  await writeFile(
    join(root, 'transloadit.images.json'),
    JSON.stringify({ workspace: 'my-app', public: ['website/'], images: {} }),
  )
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

test('the documented upload factory, route and receipt page typecheck together', async () => {
  const repoRoot = resolve(import.meta.dirname, '../../..')
  const reference = await readFile(resolve(repoRoot, 'packages/img/docs/reference.md'), 'utf8')
  const uploads = reference.slice(
    reference.indexOf('### Images uploaded by your users'),
    reference.indexOf('### Credentials and framework adapters'),
  )
  // This package's test command builds its declarations; root script tests run before that build.
  await symlink(resolve(repoRoot, 'node_modules'), join(root, 'node_modules'), 'dir')
  const files: string[] = []
  for (const block of uploads.split('```')) {
    const match = block.match(/^tsx?\n\/\/ (app\/[^\n]+)\n([\s\S]*)$/)
    if (match?.[1] === undefined || match[2] === undefined) continue
    const file = join(root, match[1])
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, match[2])
    files.push(file)
  }
  expect(files).toHaveLength(3)
  await mkdir(join(root, 'lib'))
  // Only application-owned helpers are declared; SDK/framework imports use real declarations.
  await writeFile(
    join(root, 'lib/authorization.ts'),
    'export declare function getSession(request: Request): Promise<{ canRead(path: string): boolean } | null>\n',
  )
  await writeFile(
    join(root, 'lib/images.ts'),
    "import type { TransloaditImageSource } from '@transloadit/img'\nexport declare function getAuthorizedImage(id: string): Promise<TransloaditImageSource & { description: string; ownerId: string }>\n",
  )
  const result = await promisify(execFile)(
    process.execPath,
    [
      resolve(repoRoot, 'node_modules/typescript/bin/tsc'),
      '--ignoreConfig',
      '--noEmit',
      '--strict',
      // Check the recipe without rechecking dependency internals.
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'esnext',
      '--moduleResolution',
      'bundler',
      '--jsx',
      'react-jsx',
      '--esModuleInterop',
      '--types',
      'node,react',
      ...files,
    ],
    { cwd: root, timeout: 25_000 },
  )
  expect(result.stdout).toBe('')
}, 30_000)

test('only development carries a stable catalog identity for hot-reload diagnostics', async () => {
  const plugin = withTransloaditImages({}, { root })
  const path = join(root, 'node_modules/.cache/transloadit-images/options.json')
  plugin(PHASE_DEVELOPMENT_SERVER)
  expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({
    authorizePath: join(root, 'transloadit.authorize.ts'),
    diagnosticsId: join(root, 'transloadit.images.json'),
  })
  plugin(PHASE_PRODUCTION_BUILD)
  expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({})
})

test('binds the conventional catalog and retains unrelated Next configuration', async () => {
  const config = withTransloaditImages(
    {
      basePath: '/site',
      outputFileTracingIncludes: { '/*': ['./existing.json'], '/other': ['./other.json'] },
      turbopack: { resolveAlias: { existing: './existing.ts' } },
    },
    { root },
  )(PHASE_PRODUCTION_BUILD)
  expect(config.basePath).toBe('/site')
  expect(config.turbopack?.resolveAlias).toMatchObject({
    existing: './existing.ts',
    '@transloadit/img/next/catalog': './transloadit.images.json',
  })
  expect(config.outputFileTracingIncludes).toMatchObject({
    '/*': expect.arrayContaining(['./existing.json', './transloadit.images.json']),
    '/other': ['./other.json'],
  })
  expect(
    JSON.parse(
      await readFile(join(root, 'node_modules/.cache/transloadit-images/options.json'), 'utf8'),
    ),
  ).toEqual({ basePath: '/site' })
})

test('discovers authorization and allows a custom catalog and delivery without touching the source', async () => {
  await mkdir(join(root, 'assets'))
  await writeFile(join(root, 'assets/images.json'), '{}')
  await writeFile(join(root, 'transloadit.authorize.ts'), 'export const authorize = () => false\n')
  const delivery = {
    baseUrl: 'http://127.0.0.1:32189/file/{workspace}',
    urlParams: { cdn: 'required' },
  }
  const config = withTransloaditImages(
    {},
    { root, catalog: 'assets/images.json', delivery },
  )(PHASE_PRODUCTION_BUILD)
  expect(config.turbopack?.resolveAlias).toMatchObject({
    '@transloadit/img/next/catalog': './assets/images.json',
    '@transloadit/img/next/authorize': './transloadit.authorize.ts',
  })
  expect(
    JSON.parse(
      await readFile(join(root, 'node_modules/.cache/transloadit-images/options.json'), 'utf8'),
    ),
  ).toEqual({ delivery })
  expect(await readFile(join(root, 'assets/images.json'), 'utf8')).toBe('{}')
})

test('missing catalog names the upload command, not image init', async () => {
  await rm(join(root, 'transloadit.images.json'))
  expect(() => withTransloaditImages({}, { root })(PHASE_PRODUCTION_BUILD)).toThrow(/storage store/)
})

test('production start requires neither a source catalog nor regenerating a pruned cache', async () => {
  await rm(join(root, 'transloadit.images.json'))
  const plugin = withTransloaditImages({ basePath: '/site' }, { root })
  const config = plugin(PHASE_PRODUCTION_SERVER)
  expect(config.basePath).toBe('/site')
  await expect(
    readFile(join(root, 'node_modules/.cache/transloadit-images/options.json')),
  ).rejects.toMatchObject({ code: 'ENOENT' })
})

test('the webpack adapter applies exact aliases after preserving the application hook', () => {
  const upstream = vi.fn(() => ({ resolve: { alias: { other: '/app/other.ts' } }, retained: true }))
  const config = withTransloaditImages({ webpack: upstream }, { root })(PHASE_PRODUCTION_BUILD)
  if (typeof config.webpack !== 'function') throw new Error('Expected the bundler hook')
  const input = { name: 'server' }
  const context = { isServer: true }
  const output = Reflect.apply(config.webpack, undefined, [input, context])
  expect(upstream).toHaveBeenCalledExactlyOnceWith(input, context)
  expect(output).toMatchObject({
    retained: true,
    resolve: {
      alias: {
        other: '/app/other.ts',
        '@transloadit/img/next/catalog$': join(root, 'transloadit.images.json'),
      },
    },
  })
})

test('declines catalog paths outside the app root instead of silently depending on untraced files', () => {
  expect(() =>
    withTransloaditImages({}, { root, catalog: '../outside.json' })(PHASE_PRODUCTION_BUILD),
  ).toThrow(/inside the Next.js app/)
})
