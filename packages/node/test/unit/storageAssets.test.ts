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
