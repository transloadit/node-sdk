import { expect, test } from 'vitest'

import config from '../knip.ts'
import legacyPackage from '../packages/transloadit/package.json' with { type: 'json' }

test('accounts for generated compatibility dependencies before their sources exist', () => {
  const legacy = config.workspaces?.['packages/transloadit']
  if (legacy === undefined || typeof legacy !== 'object') {
    throw new Error('Expected the compatibility workspace configuration')
  }
  // Fresh CI checkouts have its manifest but no generated sources; the canonical SDK is checked.
  expect(legacy.ignoreDependencies).toEqual(
    expect.arrayContaining(Object.keys(legacyPackage.dependencies)),
  )
})
