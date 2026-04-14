import { describe, expect, it } from 'vitest'

import { buildLegacyPackageJson } from '../../../../scripts/prepare-transloadit.ts'

describe('prepare-transloadit', () => {
  it('preserves an existing transloadit-only version bump', () => {
    const nodePackageJson = {
      name: '@transloadit/node',
      version: '4.8.1',
      scripts: {
        check: 'yarn lint && yarn fix',
        'test:unit': 'vitest run --coverage ./test/unit',
        'test:e2e': 'vitest run ./test/e2e',
        test: 'vitest run --coverage',
      },
      devDependencies: {
        vitest: '^3.2.4',
      },
      bin: {
        transloadit: './dist/cli.js',
      },
      publishConfig: {
        tag: 'experimental',
      },
    }

    const legacyExisting = {
      name: 'transloadit',
      version: '4.8.2',
      devDependencies: {
        vitest: '^3.2.4',
      },
    }

    const legacyPackageJson = buildLegacyPackageJson(nodePackageJson, legacyExisting)

    expect(legacyPackageJson.name).toBe('transloadit')
    expect(legacyPackageJson.version).toBe('4.8.2')
    expect(legacyPackageJson.bin).toBe('./dist/cli.js')
    expect(legacyPackageJson.publishConfig).toBeUndefined()
  })

  it('falls back to the node package version when no legacy package exists yet', () => {
    const nodePackageJson = {
      name: '@transloadit/node',
      version: '4.8.1',
      scripts: {},
      devDependencies: {},
    }

    const legacyPackageJson = buildLegacyPackageJson(nodePackageJson, null)

    expect(legacyPackageJson.version).toBe('4.8.1')
  })
})
