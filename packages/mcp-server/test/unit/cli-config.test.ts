import { spawnSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { afterEach, describe, expect, it } from 'vitest'

import { assemblyResultWidgetUri } from '../../src/ui/assembly-result-widget.ts'

const cliPath = fileURLToPath(new URL('../../src/cli.ts', import.meta.url))

describe('transloadit-mcp CLI configuration', { timeout: 20000 }, () => {
  let client: Client | undefined

  afterEach(async () => {
    await client?.close()
    client = undefined
  })

  it('reads TRANSLOADIT_MCP_RESULT_DOMAINS into the widget CSP', async () => {
    client = new Client({ name: 'cli-config', version: '1.0.0' })
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [cliPath, 'stdio'],
        env: {
          ...process.env,
          TRANSLOADIT_MCP_RESULT_DOMAINS: 'https://cdn.example.com, https://*.example.net',
        },
      }),
    )

    const { contents } = await client.readResource({ uri: assemblyResultWidgetUri })
    expect(contents[0]?._meta).toMatchObject({
      ui: {
        csp: {
          connectDomains: ['https://cdn.example.com', 'https://*.example.net'],
          resourceDomains: ['https://cdn.example.com', 'https://*.example.net'],
        },
      },
    })
  })

  it.each([
    [
      { maxRequestBodyBytes: '1MB' },
      'maxRequestBodyBytes must be a positive integer number of bytes.',
    ],
    [
      { urlDownloadTimeoutMs: '10m' },
      'urlDownloadTimeoutMs must be a positive integer number of milliseconds.',
    ],
  ])('refuses the config file %j', async (config, message) => {
    const directory = await mkdtemp(join(tmpdir(), 'mcp-config-'))
    const configPath = join(directory, 'config.json')
    await writeFile(configPath, JSON.stringify(config))

    const result = spawnSync(process.execPath, [cliPath, 'http', '--config', configPath], {
      env: process.env,
      encoding: 'utf8',
      input: '',
      timeout: 15000,
    })
    await rm(directory, { recursive: true, force: true })

    expect(result.status).toBe(1)
    expect(`${result.stdout}${result.stderr}`).toContain(message)
  })

  it('refuses to start with an unsupported TRANSLOADIT_SIGNATURE_ALGORITHM', () => {
    const result = spawnSync(process.execPath, [cliPath, 'stdio'], {
      env: { ...process.env, TRANSLOADIT_SIGNATURE_ALGORITHM: 'md5' },
      encoding: 'utf8',
      input: '',
    })

    expect(result.status).toBe(1)
    // The CLI logger writes to stdout; the message may land on either stream.
    expect(`${result.stdout}${result.stderr}`).toContain(
      'TRANSLOADIT_SIGNATURE_ALGORITHM must be one of sha1, sha256 or sha384.',
    )
  })
})
