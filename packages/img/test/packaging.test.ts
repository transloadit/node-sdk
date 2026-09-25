import { readFile } from 'node:fs/promises'
import { brotliCompressSync } from 'node:zlib'

import { build } from 'esbuild'
import { expect, test } from 'vitest'

test('React and Utils install no new runtime schema or SDK dependencies', async () => {
  const viewer = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const utils = JSON.parse(
    await readFile(new URL('../../utils/package.json', import.meta.url), 'utf8'),
  )
  expect(utils.dependencies ?? {}).toEqual({})
  expect(Object.keys(viewer.dependencies).sort()).toEqual([
    '@noble/ciphers',
    '@transloadit/utils',
    'server-only',
    'thumbhash',
  ])
})

test.each([
  ['@transloadit/viewer/react', 'browser', 24_000, 8_000],
  ['@transloadit/viewer/server', 'neutral', 20_000, 7_000],
] as const)('%s stays small and imports no Next, Node SDK or generated schemas', async (entry, platform, rawBudget, compressedBudget) => {
  const bundled = await build({
    stdin: { contents: `export * from '${entry}'`, resolveDir: import.meta.dirname },
    bundle: true,
    write: false,
    format: 'esm',
    platform,
    minify: true,
    metafile: true,
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    define: { 'process.env.NODE_ENV': '"production"' },
  })
  const output = bundled.outputFiles[0]?.contents
  expect(output).toBeDefined()
  if (output === undefined) throw new Error('No bundle emitted')
  expect(output.byteLength).toBeLessThan(rawBudget)
  expect(brotliCompressSync(output).byteLength).toBeLessThan(compressedBudget)
  expect(
    Object.keys(bundled.metafile.inputs).some((file) =>
      /node_modules\/(?:next|zod)\/|packages\/(?:node|zod)\//.test(file),
    ),
  ).toBe(false)
  expect(new TextDecoder().decode(output)).not.toMatch(/node:|\bBuffer\b/)
})

test('browser bundles cannot import the credential-bearing server factory', async () => {
  await expect(
    build({
      stdin: {
        contents:
          "import { createStorageRoute } from '@transloadit/viewer/server'; console.log(createStorageRoute)",
        resolveDir: import.meta.dirname,
      },
      bundle: true,
      write: false,
      platform: 'browser',
      logLevel: 'silent',
    }),
  ).rejects.toThrow(/No matching export/)
})

test.each([
  'workerd',
  'edge-light',
])('%s server bundles resolve the Web handler before the browser guard', async (condition) => {
  const bundled = await build({
    stdin: {
      contents: "export { createStorageRoute } from '@transloadit/viewer/server'",
      resolveDir: import.meta.dirname,
    },
    bundle: true,
    write: false,
    platform: 'browser',
    conditions: [condition, 'worker', 'browser'],
    format: 'esm',
    metafile: true,
    logLevel: 'silent',
  })
  expect(Object.keys(bundled.metafile.inputs)).toContain('dist/server.js')
  expect(new TextDecoder().decode(bundled.outputFiles[0]?.contents)).not.toMatch(/node:|\bBuffer\b/)
})
