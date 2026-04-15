import { describe, expect, it } from 'vitest'

import { shouldReusePreparedNodeDist } from '../../../../scripts/prepare-node-package.ts'
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
        tag: 'beta',
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

  it('only reuses a prepared node dist during the explicit publish flow', () => {
    const original = process.env.TRANSLOADIT_PUBLISH_PREBUILT_NODE

    try {
      expect(shouldReusePreparedNodeDist(false)).toBe(false)

      process.env.TRANSLOADIT_PUBLISH_PREBUILT_NODE = 'true'
      expect(shouldReusePreparedNodeDist(true)).toBe(true)

      delete process.env.TRANSLOADIT_PUBLISH_PREBUILT_NODE
      expect(shouldReusePreparedNodeDist(true)).toBe(false)
    } finally {
      if (original == null) {
        delete process.env.TRANSLOADIT_PUBLISH_PREBUILT_NODE
      } else {
        process.env.TRANSLOADIT_PUBLISH_PREBUILT_NODE = original
      }
    }
  })
})
