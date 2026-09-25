import assert from 'node:assert/strict'
import { test } from 'node:test'

import { extractStoredAssemblyResults as extractV3 } from '../src/v3/storageResults.ts'
import { extractStoredAssemblyResults as extractV4 } from '../src/v4/storageResults.ts'

const asset = {
  workspace: 'album',
  asset_id: 'A'.repeat(22),
  version_id: `${'B'.repeat(21)}A`,
  path: 'photos/photo.jpg',
  size: 100,
  mime: 'image/jpeg',
  width: 800,
  height: 616,
  thumbhash: 'WnU1pyAI9wiIh4hwj3CI+AiIcH/494cP',
  has_alpha: false,
}
const options = { assemblyId: 'upload-1', workspace: 'album' }
const assembly = {
  assembly_id: 'upload-1',
  ok: 'ASSEMBLY_COMPLETED',
  results: {
    ':original': [{ ...asset, id: 'input-1' }],
    poster: [{ ...asset, id: 'result-1', original_id: ['input-1', null] }],
    temporary: [{ id: 'temp', url: 'https://example.invalid/file.jpg' }],
  },
}

for (const [version, extract] of Object.entries({ v3: extractV3, v4: extractV4 })) {
  test(`${version}: extracts retained receipts and provenance, preserving canonical validation`, () => {
    assert.deepEqual(extract(assembly, options), [
      {
        assembly_id: 'upload-1',
        step: ':original',
        result_id: 'input-1',
        original_id: undefined,
        asset,
      },
      {
        assembly_id: 'upload-1',
        step: 'poster',
        result_id: 'result-1',
        original_id: ['input-1', null],
        asset,
      },
    ])
    for (const invalid of [
      null,
      [],
      { ...assembly, assembly_id: 'wrong' },
      { ...assembly, ok: 'ASSEMBLY_EXECUTING' },
      { ...assembly, error: 'STORE_CONFLICT' },
      { ...assembly, results: undefined },
      { ...assembly, results: [] },
      { ...assembly, results: { step: {} } },
    ])
      assert.throws(() => extract(invalid, options))
    for (const invalid of [
      { version_id: undefined },
      { workspace: 'other' },
      { width: 0 },
      { thumbhash: 'invalid' },
      { size: -1 },
      { id: undefined },
      { original_id: 42 },
      { md5hash: 'invalid' },
    ])
      assert.throws(
        () =>
          extract(
            { ...assembly, results: { step: [{ ...asset, id: 'r1', ...invalid }] } },
            options,
          ),
        /Storage result/,
      )
  })
}
