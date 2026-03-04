import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const CLI_PATH = fileURLToPath(new URL('../src/cli.ts', import.meta.url))

describe('cli', () => {
  it('accepts bracketed IPv6 loopback notify URL over HTTP', () => {
    const result = spawnSync(
      process.execPath,
      [CLI_PATH, '--help', '--notifyUrl', 'http://[::1]:3000/transloadit'],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          TRANSLOADIT_SECRET: 'test_secret',
        },
      },
    )

    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('Usage: notify-url-relay [options]')
  })
})
