import { readFile } from 'node:fs/promises'

import { expect, it } from 'vitest'

import packageJson from '../../package.json' with { type: 'json' }

// The release flow syncs server.json in the Version Packages PR (scripts/sync-mcp-server-json.ts).
it('lists the package version in the MCP Registry server.json', async () => {
  const serverJson = JSON.parse(
    await readFile(new URL('../../server.json', import.meta.url), 'utf8'),
  )
  expect(serverJson.version).toBe(packageJson.version)
  expect(serverJson.packages).toContainEqual(
    expect.objectContaining({
      registryType: 'npm',
      identifier: packageJson.name,
      version: packageJson.version,
    }),
  )
})
