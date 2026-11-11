import { expect, test } from 'vitest'

import { getPublicStoredAssetUrl, parseSmartCdnUrl } from '../src/index.ts'

const asset = { workspace: 'my-app', asset_id: 'A'.repeat(22), version_id: `${'B'.repeat(21)}A` }

test('builds stable original and download URLs without credentials or mutable filenames', () => {
  expect(parseSmartCdnUrl(getPublicStoredAssetUrl(asset))).toMatchObject({
    workspace: 'my-app',
    template: 'builtin/public-serve@0.0.3',
    input: asset.asset_id,
    urlParams: { v: asset.version_id },
  })
  const download = parseSmartCdnUrl(getPublicStoredAssetUrl(asset, { download: true }))
  expect(download.urlParams).toEqual({ download: '1', v: asset.version_id })
  expect(download.auth).toBeUndefined()
})

test.each(['auto', 'frame', 'icon'] as const)('builds bounded %s preview URLs', (preset) => {
  const url = getPublicStoredAssetUrl(asset, {
    preview: {
      width: 800,
      height: 450,
      quality: 75,
      format: 'webp',
      resizeStrategy: 'fit',
      preset,
    },
  })
  expect(parseSmartCdnUrl(url)).toMatchObject({
    template: 'builtin/public-preview@0.0.4',
    input: asset.asset_id,
    urlParams: {
      w: '800',
      h: '450',
      q: '75',
      f: 'webp',
      r: 'fit',
      vs: preset,
      v: asset.version_id,
    },
  })
})

test.each([
  { width: 4097 },
  { height: 0 },
  { quality: 86 },
  { width: 1.5 },
  { background: 'red' },
])('rejects unsupported preview values %j', (preview) => {
  expect(() => getPublicStoredAssetUrl(asset, { preview })).toThrow()
})

test('rejects untyped attacker-controlled fields instead of generating unsigned work variants', () => {
  const badInputs: unknown[] = [
    { preview: { preset: 'clip' } },
    { download: 'file.html' },
    { preview: { clip_duration: 30 } },
    { preview: {}, download: true },
    { preview: { resizeStrategy: 'min_fit' } },
    { urlParams: { v: 'latest' } },
  ]
  for (const options of badInputs) {
    // JavaScript callers do not have the TypeScript option union.
    // @ts-expect-error Deliberately exercise the runtime boundary.
    expect(() => getPublicStoredAssetUrl(asset, options)).toThrow()
  }
  expect(() => getPublicStoredAssetUrl({ ...asset, version_id: 'latest' })).toThrow()
  expect(() => getPublicStoredAssetUrl({ ...asset, workspace: 'elsewhere/path' })).toThrow()
})
