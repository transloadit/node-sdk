import { afterEach, describe, expect, it, vi } from 'vitest'

import { getTransloaditDocHelp, listTransloaditDocs } from '../../src/docs.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MCP documentation retrieval', () => {
  it('searches and scopes the public documentation index', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          [
            '# Transloadit',
            '- [Resize images](https://transloadit.com/docs/robots/image-resize.md): Resize and crop images.',
            '- [Authentication](https://transloadit.com/docs/api/authentication.md): Sign API requests.',
            '- [External](https://example.com/docs/image.md): Must not be returned.',
          ].join('\n'),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const results = await listTransloaditDocs('resize image', 'robots', 5)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://transloadit.com/docs/robots/llms.txt',
      expect.anything(),
    )
    expect(results).toEqual([
      {
        title: 'Resize images',
        url: 'https://transloadit.com/docs/robots/image-resize.md',
        description: 'Resize and crop images.',
      },
    ])
  })

  it('reports a missing scoped index instead of silently searching an incomplete root index', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(listTransloaditDocs('authentication', 'api', 5)).rejects.toThrow('HTTP 404')
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://transloadit.com/docs/api/llms.txt',
      expect.anything(),
    )
  })

  it.each(['api', 'faq', 'robots', 'sdks'] as const)('reads the %s scoped index', async (scope) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(''))
    await listTransloaditDocs(undefined, scope, 8, fetchMock)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `https://transloadit.com/docs/${scope}/llms.txt`,
      expect.objectContaining({ redirect: 'error' }),
    )
  })

  it('deduplicates today’s overlapping indexes and omits links to other indexes', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(
        () =>
          new Response(
            [
              '- [Documentation overview](https://transloadit.com/docs.md): Choose an integration path.',
              '- [Authentication](https://transloadit.com/docs/api/authentication.md): Sign API requests.',
              '- [Authentication duplicate](https://transloadit.com/docs/api/authentication.md): Sign API requests.',
              '- [API endpoints](https://transloadit.com/docs/api/llms.txt): Endpoint catalog.',
            ].join('\n'),
          ),
      )
    const results = await listTransloaditDocs(undefined, 'all', 8, fetchMock)
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(results.map(({ title, url }) => ({ title, url }))).toEqual([
      { title: 'Authentication', url: 'https://transloadit.com/docs/api/authentication.md' },
      { title: 'Documentation overview', url: 'https://transloadit.com/docs.md' },
    ])
  })

  it('ranks results matching both search terms before a title matching only one', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          [
            '- [Are Assembly IDs secure?](https://transloadit.com/docs/faq/uuid.md): Assembly identifiers.',
            '- [Are there limits for upload time or processing time?](https://transloadit.com/docs/faq/assembly-expiry.md): An Assembly expires after its time limit.',
          ].join('\n'),
        ),
      )
    const results = await listTransloaditDocs('assembly expiry', 'faq', 1, fetchMock)
    expect(results[0]?.url).toBe('https://transloadit.com/docs/faq/assembly-expiry.md')
  })

  it('rejects an oversized index instead of presenting incomplete results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('x'.repeat(500_001)))
    await expect(listTransloaditDocs(undefined, 'faq', 8, fetchMock)).rejects.toThrow(
      'index exceeded',
    )
  })

  it('normalizes the documentation overview linked by today’s index', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('# Documentation\n'))
    expect(await getTransloaditDocHelp('/docs/', 1000, fetchMock)).toMatchObject({
      url: 'https://transloadit.com/docs.md',
      title: 'Documentation',
      truncated: false,
    })
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://transloadit.com/docs.md',
      expect.anything(),
    )
  })

  it('normalizes an HTML docs URL and returns bounded Markdown', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('# Image resize\n\nDetailed documentation.', {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const page = await getTransloaditDocHelp(
      'https://transloadit.com/docs/robots/image-resize/',
      20,
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://transloadit.com/docs/robots/image-resize.md',
      expect.objectContaining({
        headers: { Accept: 'text/markdown, text/plain;q=0.9' },
      }),
    )
    expect(page).toEqual({
      title: 'Image resize',
      url: 'https://transloadit.com/docs/robots/image-resize.md',
      markdown: '# Image resize\n\nDeta',
      truncated: true,
    })
  })

  it('streams and truncates oversized Markdown without buffering the full response', async () => {
    const response = new Response(`# Large page\n\n${'x'.repeat(2_000)}`, {
      headers: { 'Content-Type': 'text/markdown' },
      status: 200,
    })
    const text = vi.spyOn(response, 'text')
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)

    const page = await getTransloaditDocHelp('/docs/large-page/', 1_000)

    expect(page?.markdown).toHaveLength(1_000)
    expect(page?.truncated).toBe(true)
    expect(text).not.toHaveBeenCalled()
  })

  it('rejects a successful HTML response instead of returning it as Markdown', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('<!doctype html><title>Error</title>', {
        headers: { 'Content-Type': 'text/html' },
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getTransloaditDocHelp('/docs/error/', 1_000)).rejects.toThrow(
      'unsupported content type',
    )
  })

  it('rejects non-Transloadit and non-documentation URLs without fetching', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await getTransloaditDocHelp('https://example.com/docs/secrets/', 1000)).toBeUndefined()
    expect(await getTransloaditDocHelp('https://transloadit.com/pricing/', 1000)).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
