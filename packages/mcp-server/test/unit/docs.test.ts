import { afterEach, describe, expect, it, vi } from 'vitest'

import { getTransloaditDoc, searchTransloaditDocs } from '../../src/docs.ts'

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

    const results = await searchTransloaditDocs('resize image', 'robots', 5)

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

  it('falls back to the root index while scoped indexes are unavailable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          '- [Authentication](https://transloadit.com/docs/api/authentication.md): Sign API requests.',
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const results = await searchTransloaditDocs('authentication', 'api', 5)

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://transloadit.com/llms.txt',
      expect.anything(),
    )
    expect(results).toHaveLength(1)
  })

  it('normalizes an HTML docs URL and returns bounded Markdown', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('# Image resize\n\nDetailed documentation.', {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const page = await getTransloaditDoc('https://transloadit.com/docs/robots/image-resize/', 20)

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

    const page = await getTransloaditDoc('/docs/large-page/', 1_000)

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

    await expect(getTransloaditDoc('/docs/error/', 1_000)).rejects.toThrow(
      'unsupported content type',
    )
  })

  it('rejects non-Transloadit and non-documentation URLs without fetching', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await getTransloaditDoc('https://example.com/docs/secrets/', 1000)).toBeUndefined()
    expect(await getTransloaditDoc('https://transloadit.com/pricing/', 1000)).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
