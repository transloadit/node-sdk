import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { describe, expect, it } from 'vitest'

import { createTransloaditMcpServer } from '../../src/server.ts'
import { parseToolPayload } from '../e2e/mcp-client.ts'

describe('transloadit_lint_assembly_instructions', () => {
  it('accepts document extraction in strict mode without account credentials', async () => {
    const server = createTransloaditMcpServer({})
    const client = new Client({ name: 'lint-assembly-test', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    try {
      const result = await client.callTool({
        name: 'transloadit_lint_assembly_instructions',
        arguments: {
          instructions: {
            steps: {
              imported: { robot: '/http/import', url: 'https://example.com/document.pdf' },
              extracted: { robot: '/document/extract', use: 'imported' },
              stored: { robot: '/s3/store', use: 'extracted', credentials: 's3-credentials' },
            },
          },
          strict: true,
        },
      })

      expect(parseToolPayload(result)).toEqual({
        status: 'ok',
        linting_issues: [],
        next_steps: ['transloadit_create_assembly'],
      })
    } finally {
      await client.close()
      await server.close()
    }
  })
})
