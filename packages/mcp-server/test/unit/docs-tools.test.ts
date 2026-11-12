import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createTransloaditMcpServer } from '../../src/server.ts'
import { parseToolPayload } from '../e2e/mcp-client.ts'

describe('MCP documentation tools', () => {
  let client: Client
  let server: ReturnType<typeof createTransloaditMcpServer>

  beforeEach(async () => {
    server = createTransloaditMcpServer({})
    client = new Client({ name: 'docs-tools-test', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    await client.close()
    await server.close()
  })

  it('exposes matching discovery/help names alongside the existing Robot tools without account credentials', async () => {
    const { tools } = await client.listTools()
    expect(tools.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'transloadit_list_docs',
        'transloadit_get_doc_help',
        'transloadit_list_robots',
        'transloadit_get_robot_help',
      ]),
    )
    expect(
      tools.find(({ name }) => name === 'transloadit_list_docs')?._meta?.securitySchemes,
    ).toEqual([{ type: 'noauth' }])
    expect(
      tools.find(({ name }) => name === 'transloadit_get_doc_help')?._meta?.securitySchemes,
    ).toEqual([{ type: 'noauth' }])
  })

  it('lists a scope without a search term and returns its public Markdown links', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          '- [Authentication](https://transloadit.com/docs/api/authentication.md): Sign API requests.',
        ),
      )
    vi.stubGlobal('fetch', fetchMock)
    const result = await client.callTool({
      name: 'transloadit_list_docs',
      arguments: { scope: 'api' },
    })
    expect(parseToolPayload(result)).toMatchObject({
      status: 'ok',
      results: [
        { title: 'Authentication', url: 'https://transloadit.com/docs/api/authentication.md' },
      ],
    })
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://transloadit.com/docs/api/llms.txt',
      expect.objectContaining({ headers: { Accept: 'text/markdown, text/plain;q=0.9' } }),
    )
  })

  it('filters discovered pages with the same search input name as list_robots', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            '- [Authentication](https://transloadit.com/docs/api/authentication.md): Sign API requests.',
          ),
        ),
    )
    const result = await client.callTool({
      name: 'transloadit_list_docs',
      arguments: { scope: 'api', search: 'something absent' },
    })
    expect(parseToolPayload(result)).toEqual({ status: 'ok', results: [] })
  })

  it('returns bounded Markdown through the renamed help tool', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(`# Authentication\n${'x'.repeat(2000)}`)),
    )
    const result = await client.callTool({
      name: 'transloadit_get_doc_help',
      arguments: { path_or_url: '/docs/api/authentication/', max_chars: 1000 },
    })
    expect(parseToolPayload(result)).toEqual({
      status: 'ok',
      document: {
        title: 'Authentication',
        url: 'https://transloadit.com/docs/api/authentication.md',
        markdown: `# Authentication\n${'x'.repeat(983)}`,
        truncated: true,
      },
    })
  })

  it('sanitizes unavailable indexes instead of returning upstream response bodies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('private upstream diagnostic', { status: 503 })),
    )
    const result = await client.callTool({
      name: 'transloadit_list_docs',
      arguments: { scope: 'api' },
    })
    expect(parseToolPayload(result)).toEqual({
      status: 'error',
      errors: [
        {
          code: 'mcp_docs_unavailable',
          message: 'The Transloadit documentation index is temporarily unavailable.',
        },
      ],
    })
  })
})
