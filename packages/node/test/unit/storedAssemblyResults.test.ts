import { afterEach, expect, test, vi } from 'vitest'

import { Transloadit } from '../../src/Transloadit.ts'

const client = new Transloadit({ authKey: 'key', authSecret: 'secret' })
const image = {
  workspace: 'album',
  asset_id: 'A'.repeat(22),
  version_id: 'B'.repeat(21) + 'A',
  path: 'photos/photo (1).jpg',
  size: 100,
  mime: 'image/jpeg',
  width: 800,
  height: 616,
}
const video = {
  ...image,
  path: 'videos/movie.mp4',
  mime: 'video/mp4',
  width: undefined,
  height: undefined,
}

afterEach(() => vi.restoreAllMocks())

test("preserves each producing result's own placeholder and alpha metadata", async () => {
  const original = { ...image, thumbhash: 'WnU1pyAI9wiIh4hwj3CI+AiIcH/494cP', has_alpha: false }
  const poster = {
    ...image,
    version_id: `${'C'.repeat(21)}A`,
    thumbhash: '1QcSHQRnh493V4dIh4eXh1h4kJUI',
    has_alpha: true,
  }
  vi.spyOn(client, 'getAssembly').mockResolvedValue({
    assembly_id: 'upload-1',
    ok: 'ASSEMBLY_COMPLETED',
    results: {
      ':original': [{ ...original, id: 'input-1' }],
      poster: [{ ...poster, id: 'poster-1', original_id: 'input-1' }],
    },
  })
  const results = await client.getStoredAssemblyResults({
    assemblyId: 'upload-1',
    workspace: 'album',
  })
  expect(results.map((result) => result.asset)).toEqual([original, poster])
})

test('verifies a batch with originals, video and a poster without guessing input relationships', async () => {
  const get = vi.spyOn(client, 'getAssembly').mockResolvedValue({
    assembly_id: 'upload-1',
    ok: 'ASSEMBLY_COMPLETED',
    results: {
      ':original': [{ ...image, id: 'input-1', original_id: 'input-1' }],
      encoded: [{ ...video, id: 'video-1', original_id: ['input-2', null] }],
      poster: [{ ...image, id: 'poster-1', original_id: 'input-2' }],
      unretained: [{ id: 'temporary', url: 'https://example.invalid/temporary.jpg' }],
    },
  })
  const results = await client.getStoredAssemblyResults({
    assemblyId: 'upload-1',
    workspace: 'album',
  })
  expect(results).toEqual([
    {
      assembly_id: 'upload-1',
      step: ':original',
      result_id: 'input-1',
      original_id: 'input-1',
      asset: image,
    },
    {
      assembly_id: 'upload-1',
      step: 'encoded',
      result_id: 'video-1',
      original_id: ['input-2', null],
      asset: video,
    },
    {
      assembly_id: 'upload-1',
      step: 'poster',
      result_id: 'poster-1',
      original_id: 'input-2',
      asset: image,
    },
  ])
  expect(
    await client.getStoredAssemblyResults({ assemblyId: 'upload-1', workspace: 'album' }),
  ).toEqual(results)
  expect(get).toHaveBeenCalledWith('upload-1')
})

test.each([
  { ...image, workspace: 'someone-else' },
  { ...image, version_id: undefined },
  { ...image, asset_id: 'bad-id' },
])('rejects invalid or cross-Workspace stored results instead of silently omitting them', async (asset) => {
  vi.spyOn(client, 'getAssembly').mockResolvedValue({
    assembly_id: 'upload-1',
    ok: 'ASSEMBLY_COMPLETED',
    results: { ':original': [{ ...asset, id: 'input-1' }] },
  })
  await expect(
    client.getStoredAssemblyResults({ assemblyId: 'upload-1', workspace: 'album' }),
  ).rejects.toThrow(/Storage result/)
})

test('never reports partial writes in a failed Assembly as a completed batch', async () => {
  vi.spyOn(client, 'getAssembly').mockResolvedValue({
    assembly_id: 'upload-1',
    error: 'TRANSLOADIT_STORE_CONFLICT',
    message: 'Conflict',
    results: { ':original': [{ ...image, id: 'input-1' }] },
  })
  await expect(
    client.getStoredAssemblyResults({ assemblyId: 'upload-1', workspace: 'album' }),
  ).rejects.toMatchObject({ code: 'TRANSLOADIT_STORE_CONFLICT' })
})

test.each([
  'ASSEMBLY_EXECUTING',
  'ASSEMBLY_CANCELED',
] as const)('does not register %s', async (ok) => {
  vi.spyOn(client, 'getAssembly').mockResolvedValue({ assembly_id: 'upload-1', ok })
  await expect(
    client.getStoredAssemblyResults({ assemblyId: 'upload-1', workspace: 'album' }),
  ).rejects.toThrow(ok)
})

test('checks Assembly identity before returning any results', async () => {
  vi.spyOn(client, 'getAssembly').mockResolvedValue({
    assembly_id: 'different-upload',
    ok: 'ASSEMBLY_COMPLETED',
    results: {},
  })
  await expect(
    client.getStoredAssemblyResults({ assemblyId: 'upload-1', workspace: 'album' }),
  ).rejects.toThrow(/requested Assembly/)
})

test('does not invent provenance for malformed stored results', async () => {
  vi.spyOn(client, 'getAssembly').mockResolvedValue({
    assembly_id: 'upload-1',
    ok: 'ASSEMBLY_COMPLETED',
    results: { stored: [image] },
  })
  await expect(
    client.getStoredAssemblyResults({ assemblyId: 'upload-1', workspace: 'album' }),
  ).rejects.toThrow(/Storage result/)
})
