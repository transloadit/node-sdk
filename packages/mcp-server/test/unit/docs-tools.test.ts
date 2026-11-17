import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { SevLogger } from '@transloadit/sev-logger'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createTransloaditMcpServer } from '../../src/server.ts'
import { parseToolPayload } from '../e2e/mcp-client.ts'

const searchResult = {
  title: 'Webhooks › Verify the signature',
  url: 'https://transloadit.com/docs/api/webhooks/#verify-the-signature',
  markdown_url: 'https://transloadit.com/docs/api/webhooks.md',
  excerpt: 'Verify the Webhook signature before trusting the payload.',
  section: 'api',
}

const pageContentSchema = z.object({
  markdown: z.string(),
  next_start_index: z.number().nullable(),
})

describe('MCP documentation tools', () => {
  let client: Client
  let server: ReturnType<typeof createTransloaditMcpServer>

  beforeEach(async () => {
    vi.spyOn(SevLogger.prototype, 'warn').mockImplementation(() => {})
    server = createTransloaditMcpServer({})
    client = new Client({ name: 'docs-tools-test', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    await client.close()
    await server.close()
  })

  it('exposes public search and page tools alongside the Robot tools', async () => {
    const { tools } = await client.listTools()
    expect(tools.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'transloadit_search_docs',
        'transloadit_get_doc',
        'transloadit_list_robots',
        'transloadit_get_robot_help',
      ]),
    )
    expect(tools.find(({ name }) => name === 'transloadit_search_docs')).toMatchObject({
      _meta: { securitySchemes: [{ type: 'noauth' }] },
      annotations: { readOnlyHint: true, openWorldHint: false },
    })
    expect(tools.find(({ name }) => name === 'transloadit_get_doc')).toMatchObject({
      _meta: { securitySchemes: [{ type: 'noauth' }] },
      annotations: { readOnlyHint: true, openWorldHint: false },
    })
  })

  it('maps search fields, preserves anchors, and passes section and limit to the trailing-slash endpoint', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        version: 1,
        query: 'webhook signature',
        results: [{ ...searchResult, future_field: true }],
        future_field: 'ignored',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const result = await client.callTool({
      name: 'transloadit_search_docs',
      arguments: { query: '  webhook signature  ', section: 'topics', limit: 3 },
    })
    expect(result.structuredContent).toEqual({
      status: 'ok',
      results: [searchResult],
      next_steps: ['transloadit_get_doc'],
    })
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://transloadit.com/api/docs/search/?q=webhook+signature&section=topics&limit=3',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
        redirect: 'error',
        signal: expect.any(AbortSignal),
      }),
    )
    expect(timeout).toHaveBeenCalledWith(10_000)
  })

  it('defaults to eight search results and omits section when unspecified', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ version: 1, query: 'webhook', results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await client.callTool({
      name: 'transloadit_search_docs',
      arguments: { query: 'webhook' },
    })
    expect(result.structuredContent).toEqual({ status: 'ok', results: [], next_steps: [] })
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://transloadit.com/api/docs/search/?q=webhook&limit=8',
      expect.anything(),
    )
  })

  it('suggests structured Robot help when a search result is a Robot page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          version: 1,
          query: 'resize',
          results: [
            {
              ...searchResult,
              url: 'https://transloadit.com/docs/robots/image-resize/#width',
              markdown_url: 'https://transloadit.com/docs/robots/image-resize.md',
              section: 'robots',
            },
          ],
        }),
      ),
    )
    const result = await client.callTool({
      name: 'transloadit_search_docs',
      arguments: { query: 'resize' },
    })
    expect(result.structuredContent?.next_steps).toEqual([
      'transloadit_get_doc',
      'transloadit_get_robot_help',
    ])
  })

  it('surfaces the endpoint’s invalid-query message without restricting section names locally', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: 'invalid_request',
            message: 'Unknown documentation section.',
          },
          { status: 400 },
        ),
      ),
    )
    const result = await client.callTool({
      name: 'transloadit_search_docs',
      arguments: { query: 'webhook', section: 'new-section' },
    })
    expect(result.isError).toBe(true)
    expect(parseToolPayload(result)).toEqual({
      status: 'error',
      errors: [{ code: 'mcp_invalid_docs_query', message: 'Unknown documentation section.' }],
    })
  })

  it.each([
    ['502', () => new Response('private upstream body', { status: 502 })],
    [
      'bad JSON',
      () =>
        new Response('private invalid JSON', {
          headers: { 'Content-Type': 'application/json' },
        }),
    ],
    ['version 2', () => Response.json({ version: 2, query: 'webhook', results: [] })],
    ['malformed result', () => Response.json({ version: 1, query: 'webhook', results: [{}] })],
    [
      'HTML',
      () =>
        new Response('<html>private upstream body</html>', {
          headers: { 'Content-Type': 'text/html' },
        }),
    ],
  ])('sanitizes search failure: %s', async (_name, response) => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(response))
    const result = await client.callTool({
      name: 'transloadit_search_docs',
      arguments: { query: 'webhook' },
    })
    expect(result.isError).toBe(true)
    expect(parseToolPayload(result)).toEqual({
      status: 'error',
      errors: [
        {
          code: 'mcp_docs_unavailable',
          message: 'Documentation search is temporarily unavailable.',
        },
      ],
    })
    expect(SevLogger.prototype.warn).toHaveBeenCalledOnce()
  })

  it('sanitizes a search timeout and logs a safe diagnostic', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValue(
          new DOMException(
            'https://transloadit.com/api/docs/search/?q=private-query private upstream body',
            'TimeoutError',
          ),
        ),
    )
    const result = await client.callTool({
      name: 'transloadit_search_docs',
      arguments: { query: 'webhook' },
    })
    expect(parseToolPayload(result)).toMatchObject({
      status: 'error',
      errors: [{ code: 'mcp_docs_unavailable' }],
    })
    expect(SevLogger.prototype.warn).toHaveBeenCalledExactlyOnceWith(
      'Documentation %s failed: %s',
      'search',
      'timeout',
    )
  })

  it.each([
    { query: ' x ' },
    { query: 'x'.repeat(201) },
    { query: 'webhook', limit: 0 },
    { query: 'webhook', limit: 21 },
    { query: 'webhook', limit: 1.5 },
  ])('rejects invalid search inputs %j before fetching', async (args) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const result = await client.callTool({ name: 'transloadit_search_docs', arguments: args })
    expect(result.isError).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns paginated Markdown with a 15,000-character default cap', async () => {
    const markdown = `# Authentication\n${'x'.repeat(16_000)}`
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Response(markdown)),
    )
    const first = await client.callTool({
      name: 'transloadit_get_doc',
      arguments: { url: '/docs/api/authentication/' },
    })
    expect(first.structuredContent).toEqual({
      status: 'ok',
      document: {
        title: 'Authentication',
        url: 'https://transloadit.com/docs/api/authentication.md',
        markdown: markdown.slice(0, 15_000),
        start_index: 0,
        next_start_index: 15_000,
        truncated: true,
      },
      next_steps: [],
    })
    const document = pageContentSchema.parse(first.structuredContent?.document)
    const second = await client.callTool({
      name: 'transloadit_get_doc',
      arguments: { url: '/docs/api/authentication/', start_index: document.next_start_index },
    })
    expect(second.structuredContent).toEqual({
      status: 'ok',
      document: {
        title: 'Authentication',
        url: 'https://transloadit.com/docs/api/authentication.md',
        markdown: markdown.slice(15_000),
        start_index: 15_000,
        next_start_index: null,
        truncated: false,
      },
      next_steps: [],
    })
    const secondDocument = pageContentSchema.parse(second.structuredContent?.document)
    expect(document.markdown + secondDocument.markdown).toBe(markdown)
  })

  it('suggests structured Robot help for a fetched Robot article', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('# Image resize\n')))
    const result = await client.callTool({
      name: 'transloadit_get_doc',
      arguments: { url: '/docs/robots/image-resize/' },
    })
    expect(result.structuredContent?.next_steps).toEqual(['transloadit_get_robot_help'])
  })

  it('returns a distinct error for an invalid page URL without fetching', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const result = await client.callTool({
      name: 'transloadit_get_doc',
      arguments: { url: 'https://example.com/docs/api/?secret=private' },
    })
    expect(parseToolPayload(result)).toMatchObject({
      status: 'error',
      errors: [{ code: 'mcp_invalid_docs_url' }],
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(SevLogger.prototype.warn).toHaveBeenCalledExactlyOnceWith(
      'Documentation %s failed: %s',
      'page',
      'invalid_url',
    )
  })

  it.each([
    [
      'missing page',
      () => new Response('private upstream body', { status: 404 }),
      'mcp_doc_not_found',
    ],
    [
      'off-origin redirect',
      () =>
        new Response(null, {
          status: 302,
          headers: { Location: 'https://example.com/docs/page.md' },
        }),
      'mcp_doc_not_found',
    ],
    [
      'off-docs redirect',
      () =>
        new Response(null, {
          status: 302,
          headers: { Location: '/pricing/' },
        }),
      'mcp_doc_not_found',
    ],
    [
      'HTML',
      () =>
        new Response('<html>private body</html>', {
          headers: { 'Content-Type': 'text/html' },
        }),
      'mcp_docs_unavailable',
    ],
    ['502', () => new Response('private body', { status: 502 }), 'mcp_docs_unavailable'],
    [
      'missing body',
      () =>
        new Response(null, {
          headers: { 'Content-Type': 'text/markdown' },
        }),
      'mcp_docs_unavailable',
    ],
  ])('returns a sanitized page error for %s', async (_name, response, code) => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(response))
    const result = await client.callTool({
      name: 'transloadit_get_doc',
      arguments: { url: '/docs/api/authentication/' },
    })
    expect(result.isError).toBe(true)
    expect(parseToolPayload(result)).toMatchObject({ status: 'error', errors: [{ code }] })
    expect(SevLogger.prototype.warn).toHaveBeenCalledOnce()
  })

  it('logs network failures without exposing URLs, queries or upstream messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValue(
          new Error(
            'https://transloadit.com/docs/api/authentication.md?secret=private private body',
          ),
        ),
    )
    const result = await client.callTool({
      name: 'transloadit_get_doc',
      arguments: { url: '/docs/api/authentication/?secret=private' },
    })
    expect(parseToolPayload(result)).toMatchObject({
      status: 'error',
      errors: [{ code: 'mcp_docs_unavailable' }],
    })
    expect(SevLogger.prototype.warn).toHaveBeenCalledExactlyOnceWith(
      'Documentation %s failed: %s',
      'page',
      'network_or_stream_failure',
    )
  })
})
