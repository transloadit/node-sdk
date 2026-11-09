import { expect, test } from 'vitest'

import config from '../knip.ts'
import nodePackage from '../packages/node/package.json' with { type: 'json' }
import legacyPackage from '../packages/transloadit/package.json' with { type: 'json' }

test.each([nodePackage, legacyPackage])('$name does not install a native image decoder', (pkg) => {
  expect(pkg.dependencies).not.toHaveProperty('sharp')
  expect(pkg).not.toHaveProperty('optionalDependencies.sharp')
  expect(pkg).not.toHaveProperty('peerDependencies.sharp')
})

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
