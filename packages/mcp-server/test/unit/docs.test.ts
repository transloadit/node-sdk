import { afterEach, describe, expect, it, vi } from 'vitest'

import { getTransloaditDoc, searchTransloaditDocs } from '../../src/docs.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('MCP documentation retrieval', () => {
  it.each([
    '/docs/api/authentication',
    'https://transloadit.com/docs/api/authentication/',
    'https://www.transloadit.com/docs/api/authentication/?secret=redact#heading',
    'http://transloadit.com/docs/api/authentication/',
    'http://www.transloadit.com/docs/api/authentication.md?secret=redact#heading',
  ])('normalizes %s to the canonical Markdown URL', async (url) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('# Authentication\n'))
    const page = await getTransloaditDoc(url, 0, 1_000, fetchMock)

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://transloadit.com/docs/api/authentication.md',
      expect.objectContaining({
        headers: { Accept: 'text/markdown, text/plain;q=0.9' },
        redirect: 'manual',
        signal: expect.any(AbortSignal),
      }),
    )
    expect(page).toEqual({
      title: 'Authentication',
      url: 'https://transloadit.com/docs/api/authentication.md',
      markdown: '# Authentication\n',
      start_index: 0,
      next_start_index: null,
      truncated: false,
    })
  })

  it('preserves support for the documentation overview', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('# Documentation\n'))
    expect(await getTransloaditDoc('/docs/', 0, 1_000, fetchMock)).toMatchObject({
      url: 'https://transloadit.com/docs.md',
      title: 'Documentation',
      truncated: false,
    })
  })

  it.each([
    'https://example.com/docs/secrets/',
    'https://transloadit.com/pricing/',
    'https://transloadit.com:8443/docs/api/',
    'https://user:password@transloadit.com/docs/api/',
    'https://transloadit.com/docs/../../secrets/',
    'ftp://transloadit.com/docs/api/',
    'not a URL',
  ])('rejects invalid input %s without fetching', async (url) => {
    const fetchMock = vi.fn()
    await expect(getTransloaditDoc(url, 0, 1_000, fetchMock)).rejects.toMatchObject({
      code: 'mcp_invalid_docs_url',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('paginates Unicode characters across byte chunks without losing text or the title', async () => {
    const markdown = `# Unicode\n${'é界🙂'.repeat(400)}`
    const bytes = new TextEncoder().encode(markdown)
    const fetchMock = vi.fn().mockImplementation(() => {
      let offset = 0
      return new Response(
        new ReadableStream({
          pull(controller) {
            if (offset === bytes.length) {
              controller.close()
              return
            }
            // Three-byte chunks split both the two-byte and four-byte UTF-8 characters.
            controller.enqueue(bytes.subarray(offset, offset + 3))
            offset = Math.min(offset + 3, bytes.length)
          },
        }),
        { headers: { 'Content-Type': 'text/markdown' } },
      )
    })

    const first = await getTransloaditDoc('/docs/unicode/', 0, 1_000, fetchMock)
    expect(first.next_start_index).toBe(1_000)
    expect(first.truncated).toBe(true)
    expect([...first.markdown]).toHaveLength(1_000)
    if (first.next_start_index === null) throw new Error('Expected a second page.')
    const second = await getTransloaditDoc(
      '/docs/unicode/',
      first.next_start_index,
      1_000,
      fetchMock,
    )
    expect(second).toMatchObject({
      title: 'Unicode',
      start_index: 1_000,
      next_start_index: null,
      truncated: false,
    })
    expect(first.markdown + second.markdown).toBe(markdown)
  })

  it('skips a large prefix and cancels the stream once the page and lookahead are read', async () => {
    const cancel = vi.fn()
    const pull = vi.fn((controller: ReadableStreamDefaultController<Uint8Array>) => {
      controller.enqueue(new TextEncoder().encode('x'.repeat(1_000)))
    })
    const response = new Response(new ReadableStream({ pull, cancel }), {
      headers: { 'Content-Type': 'text/markdown' },
    })
    const text = vi.spyOn(response, 'text')
    const fetchMock = vi.fn().mockResolvedValue(response)

    const page = await getTransloaditDoc('/docs/large/', 100_000, 1_000, fetchMock)

    expect(page.markdown).toBe('x'.repeat(1_000))
    expect(page.next_start_index).toBe(101_000)
    expect(page.truncated).toBe(true)
    expect(pull.mock.calls.length).toBeLessThanOrEqual(103)
    expect(cancel).toHaveBeenCalledOnce()
    expect(text).not.toHaveBeenCalled()
  })

  it('bounds output even when one upstream chunk contains the whole oversized page', async () => {
    const response = new Response(`# Large page\n${'x'.repeat(1_000_000)}`)
    const text = vi.spyOn(response, 'text')
    const page = await getTransloaditDoc(
      '/docs/large/',
      0,
      1_000,
      vi.fn().mockResolvedValue(response),
    )
    expect(page.markdown).toHaveLength(1_000)
    expect(page.truncated).toBe(true)
    expect(text).not.toHaveBeenCalled()
  })

  it.each([1_000, 1_001])('detects EOF after skipping to index %i', async (startIndex) => {
    const page = await getTransloaditDoc(
      '/docs/exhausted/',
      startIndex,
      1_000,
      vi.fn().mockResolvedValue(new Response('x'.repeat(1_000))),
    )
    expect(page).toMatchObject({ markdown: '', next_start_index: null, truncated: false })
  })

  it('does not mark an exact-size final page as truncated', async () => {
    const page = await getTransloaditDoc(
      '/docs/exact/',
      0,
      1_000,
      vi.fn().mockResolvedValue(new Response('x'.repeat(1_000))),
    )
    expect(page).toMatchObject({ next_start_index: null, truncated: false })
    expect(page.markdown).toHaveLength(1_000)
  })

  it('follows a same-origin docs redirect and returns the final Markdown URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 308,
          headers: { Location: '/docs/api/webhooks/?q=redact#h' },
        }),
      )
      .mockResolvedValueOnce(new Response('# Webhooks\n'))
    const page = await getTransloaditDoc('/docs/api/old-webhooks/', 0, 1_000, fetchMock)
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://transloadit.com/docs/api/webhooks.md',
      expect.objectContaining({ redirect: 'manual' }),
    )
    expect(page.url).toBe('https://transloadit.com/docs/api/webhooks.md')
  })

  it.each([
    'https://example.com/docs/api/webhooks.md',
    'https://transloadit.com/pricing/',
    'https://www.transloadit.com/docs/api/webhooks.md',
    'http://transloadit.com/docs/api/webhooks.md',
    'https://user:secret@transloadit.com/docs/api/webhooks.md',
  ])('refuses the redirect target %s', async (location) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 302, headers: { Location: location } }))
    await expect(getTransloaditDoc('/docs/old/', 0, 1_000, fetchMock)).rejects.toMatchObject({
      code: 'mcp_doc_not_found',
    })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('follows at most three redirects', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(null, { status: 301, headers: { Location: '/docs/loop.md' } }),
        ),
      )
    await expect(getTransloaditDoc('/docs/loop/', 0, 1_000, fetchMock)).rejects.toMatchObject({
      code: 'mcp_docs_unavailable',
    })
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('bounds search response bodies instead of buffering an oversized JSON response', async () => {
    const response = new Response('x'.repeat(100_001), {
      headers: { 'Content-Type': 'application/json' },
    })
    const text = vi.spyOn(response, 'text')
    await expect(
      searchTransloaditDocs('webhook', undefined, 8, vi.fn().mockResolvedValue(response)),
    ).rejects.toMatchObject({ code: 'mcp_docs_unavailable' })
    expect(text).not.toHaveBeenCalled()
  })
})
