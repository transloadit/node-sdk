import nock from 'nock'
import { afterEach, expect, test } from 'vitest'

import { Transloadit } from '../../src/Transloadit.ts'

const origin = 'http://127.0.0.1:9'
const client = new Transloadit({ authKey: 'key', authSecret: 'secret', endpoint: origin })
const asset = {
  workspace: 'my-app',
  asset_id: 'A'.repeat(22),
  version_id: 'B'.repeat(21) + 'A',
  path: 'photos/renamed.jpg',
  size: 100,
  mime: 'image/jpeg',
  width: 800,
  height: 616,
}

afterEach(() => nock.cleanAll())

test('reads a pinned version without treating the saved path as its identity', async () => {
  const request = nock(origin)
    .get(`/dam/assets/${asset.asset_id}`)
    .query((query) => {
      const params = JSON.parse(String(query.params))
      return (
        params.auth.key === 'key' &&
        params.version_id === asset.version_id &&
        typeof query.signature === 'string'
      )
    })
    .reply(200, { ok: 'DAM_ASSET_FOUND', message: 'Found', asset })
  await expect(
    client.getStoredAsset(asset.asset_id, { version_id: asset.version_id }),
  ).resolves.toEqual(asset)
  expect(request.isDone()).toBe(true)
})

test('lists a bounded native metadata page, including Workspace context for an empty page', async () => {
  const request = nock(origin)
    .get('/dam/assets')
    .query((query) => {
      const params = JSON.parse(String(query.params))
      return params.prefix === 'photos/' && params.limit === 2 && params.cursor === 'photos/a.jpg'
    })
    .reply(200, {
      ok: 'DAM_ASSETS_LISTED',
      message: 'Listed',
      workspace: 'my-app',
      assets: [],
      next_cursor: null,
    })
  await expect(
    client.listStoredAssets({ prefix: 'photos/', limit: 2, cursor: 'photos/a.jpg' }),
  ).resolves.toMatchObject({ workspace: 'my-app', assets: [], next_cursor: null })
  expect(request.isDone()).toBe(true)
})

test('rejects malformed identifiers and unbounded page sizes before sending', async () => {
  await expect(client.getStoredAsset('../escape')).rejects.toThrow()
  await expect(client.getStoredAsset(asset.asset_id, { version_id: 'wrong' })).rejects.toThrow()
  await expect(client.listStoredAssets({ limit: 501 })).rejects.toThrow()
})

test('never silently substitutes the current version for a pinned lookup', async () => {
  nock(origin)
    .get(`/dam/assets/${asset.asset_id}`)
    .query(true)
    .reply(200, {
      ok: 'DAM_ASSET_FOUND',
      message: 'Found',
      asset: { ...asset, version_id: 'C'.repeat(21) + 'A' },
    })
  await expect(
    client.getStoredAsset(asset.asset_id, { version_id: asset.version_id }),
  ).rejects.toThrow(/requested Storage reference/)
})

test('refuses mixed-Workspace metadata from a catalog page', async () => {
  nock(origin)
    .get('/dam/assets')
    .query(true)
    .reply(200, {
      ok: 'DAM_ASSETS_LISTED',
      message: 'Listed',
      workspace: 'another-workspace',
      assets: [asset],
      next_cursor: null,
    })
  await expect(client.listStoredAssets()).rejects.toThrow(/Workspace/)
})

test('signs original media and attachment delivery for an exact version without geometry', () => {
  const video = {
    ...asset,
    mime: 'video/mp4',
    path: 'album/été.mp4',
    width: undefined,
    height: undefined,
  }
  const inline = new URL(client.getStoredAssetUrl(video))
  expect(decodeURIComponent(inline.pathname)).toContain(
    `builtin/storage-serve@0.0.3/${video.asset_id}`,
  )
  expect(inline.searchParams.get('v')).toBe(video.version_id)
  expect(inline.searchParams.has('download')).toBe(false)
  const download = new URL(client.getStoredAssetUrl(video, { download: true }))
  expect(download.searchParams.get('download')).toBe('été.mp4')
  expect(download.searchParams.get('sig')).toBeTruthy()
  expect(() => client.getStoredAssetUrl(video, { download: 'bad\r\nHeader: yes' })).toThrow()
  expect(() => client.getStoredAssetUrl(video, { lifetimeMs: 0 })).toThrow()
  expect(() => client.getStoredAssetUrl(video, { lifetimeMs: 48 * 3600_000 + 1 })).toThrow()
})

test('moves by identity and returns the canonical moved record without a second read', async () => {
  const request = nock(origin)
    .patch(`/dam/assets/${asset.asset_id}`, (body) => {
      const encoded = String(body)
      const params = /name="params"\r\n\r\n([^\r\n]+)/.exec(encoded)?.[1]
      if (params === undefined) return false
      const parsed = JSON.parse(params)
      return (
        parsed.filename === 'renamed.jpg' &&
        parsed.destination_folder_id === null &&
        encoded.includes('name="signature"')
      )
    })
    .reply(200, { ok: 'DAM_ASSET_MOVED', message: 'Moved', asset })
  await expect(
    client.moveStoredAsset(asset.asset_id, {
      filename: 'renamed.jpg',
      destination_folder_id: null,
    }),
  ).resolves.toEqual(asset)
  expect(request.isDone()).toBe(true)
})

test('soft-deletes by identity and returns the deletion receipt', async () => {
  nock(origin).delete(`/dam/assets/${asset.asset_id}`).reply(200, {
    ok: 'DAM_ASSET_DELETED',
    message: 'Deleted',
    asset_id: asset.asset_id,
    deleted_at: '2026-09-17T12:00:00.000Z',
  })
  await expect(client.deleteStoredAsset(asset.asset_id)).resolves.toEqual({
    asset_id: asset.asset_id,
    deleted_at: '2026-09-17T12:00:00.000Z',
  })
})

test('rejects an empty move and identifiers before sending a mutation', async () => {
  await expect(client.moveStoredAsset(asset.asset_id, {})).rejects.toThrow()
  await expect(client.moveStoredAsset('../escape', { filename: 'photo.jpg' })).rejects.toThrow()
  await expect(client.moveStoredAsset(asset.asset_id, { filename: '../escape' })).rejects.toThrow()
  await expect(client.deleteStoredAsset('../escape')).rejects.toThrow()
})

test('refuses a mutation response for another asset', async () => {
  nock(origin)
    .patch(`/dam/assets/${asset.asset_id}`)
    .reply(200, {
      ok: 'DAM_ASSET_MOVED',
      message: 'Moved',
      asset: { ...asset, asset_id: 'C'.repeat(21) + 'A' },
    })
  await expect(client.moveStoredAsset(asset.asset_id, { filename: 'photo.jpg' })).rejects.toThrow(
    /requested Storage reference/,
  )
})
