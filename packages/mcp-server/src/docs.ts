import { z } from 'zod'

/** One result from the public documentation search contract. Unknown fields are ignored. */
export const docsSearchResultSchema = z.object({
  title: z.string(),
  url: z.url(),
  markdown_url: z.url().refine((value) => new URL(value).pathname.endsWith('.md')),
  excerpt: z.string().max(300),
  section: z.string(),
})

const docsSearchResponseSchema = z.object({
  version: z.literal(1),
  query: z.string(),
  results: z.array(docsSearchResultSchema).max(20),
})

const invalidQueryResponseSchema = z.object({
  error: z.literal('invalid_request'),
  message: z.string(),
})

export type DocsSearchResult = z.infer<typeof docsSearchResultSchema>

export interface DocsPage {
  title: string
  url: string
  markdown: string
  start_index: number
  next_start_index: number | null
  truncated: boolean
}

type DocsErrorCode =
  | 'mcp_invalid_docs_query'
  | 'mcp_invalid_docs_url'
  | 'mcp_doc_not_found'
  | 'mcp_docs_unavailable'

/** A sanitized tool error and a diagnostic that never contains an upstream body or input URL. */
export class DocsError extends Error {
  readonly code: DocsErrorCode
  readonly diagnostic: string

  constructor(code: DocsErrorCode, message: string, diagnostic: string) {
    super(message)
    this.code = code
    this.diagnostic = diagnostic
  }
}

const docsOrigin = 'https://transloadit.com'
const docsFetchTimeoutMs = 10_000
const docsSearchMaxChars = 100_000
const docsTitleMaxChars = 1_000
const docsMaxRedirects = 3

function normalizeDocsUrl(value: string): URL | undefined {
  if (!value.startsWith('/') && !/^https?:\/\//iu.test(value)) return
  if (!URL.canParse(value, docsOrigin)) return

  const url = new URL(value, docsOrigin)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !['transloadit.com', 'www.transloadit.com'].includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password
  ) {
    return
  }
  url.protocol = 'https:'
  url.hostname = 'transloadit.com'
  url.hash = ''
  url.search = ''
  if (['/docs', '/docs/', '/docs.md'].includes(url.pathname)) {
    url.pathname = '/docs.md'
    return url
  }
  if (!url.pathname.startsWith('/docs/')) return

  if (!url.pathname.endsWith('.md')) {
    url.pathname = `${url.pathname.replace(/\/+$/u, '')}.md`
  }
  return url
}

interface DocsTextResponse {
  text: string
  prefix: string
  length: number
  truncated: boolean
}

async function readBoundedResponseText(
  response: Response,
  maxChars: number,
  startIndex = 0,
): Promise<DocsTextResponse> {
  if (response.body === null) {
    throw new DocsError('mcp_docs_unavailable', 'Documentation is unavailable.', 'missing_body')
  }

  const decoder = new TextDecoder('utf-8', { fatal: true })
  const reader = response.body.getReader()
  let text = ''
  let prefix = ''
  let length = 0
  let skipped = 0
  let prefixLength = 0

  const consume = (chunk: string): boolean => {
    // Count Unicode code points after decoding, so neither byte chunks nor pages split a character.
    for (const character of chunk) {
      if (prefixLength < docsTitleMaxChars) {
        prefix += character
        prefixLength++
      }
      if (skipped < startIndex) {
        skipped++
        continue
      }
      if (length === maxChars) return true
      text += character
      length++
    }
    return false
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        const truncated = consume(decoder.decode())
        return { text, prefix, length, truncated }
      }

      // A fetch implementation can deliver a huge chunk. Decode only small windows, even then.
      for (let offset = 0; offset < value.length; offset += 1_024) {
        if (consume(decoder.decode(value.subarray(offset, offset + 1_024), { stream: true }))) {
          return { text, prefix, length, truncated: true }
        }
      }
    }
  } finally {
    await reader.cancel()
    reader.releaseLock()
  }
}

function hasContentType(response: Response, accepted: string[]): boolean {
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
  return contentType !== undefined && accepted.includes(contentType)
}

/** Search the website's public documentation index without account credentials. */
export async function searchTransloaditDocs(
  query: string,
  section: string | undefined,
  limit: number,
  fetcher: typeof fetch = fetch,
): Promise<DocsSearchResult[]> {
  const url = new URL('/api/docs/search/', docsOrigin)
  url.searchParams.set('q', query)
  if (section !== undefined) url.searchParams.set('section', section)
  url.searchParams.set('limit', String(limit))
  const response = await fetcher(url.href, {
    headers: { Accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(docsFetchTimeoutMs),
  })
  if (!response.ok && response.status !== 400) {
    await response.body?.cancel()
    throw new DocsError(
      'mcp_docs_unavailable',
      'Documentation search is temporarily unavailable.',
      `search_http_${response.status}`,
    )
  }
  if (!hasContentType(response, ['application/json'])) {
    await response.body?.cancel()
    throw new DocsError(
      'mcp_docs_unavailable',
      'Documentation search is temporarily unavailable.',
      'search_content_type',
    )
  }
  const { text, truncated } = await readBoundedResponseText(response, docsSearchMaxChars)
  if (truncated) {
    throw new DocsError(
      'mcp_docs_unavailable',
      'Documentation search is temporarily unavailable.',
      'search_body_too_large',
    )
  }
  const body: unknown = JSON.parse(text)
  if (!response.ok) {
    const { message } = invalidQueryResponseSchema.parse(body)
    throw new DocsError('mcp_invalid_docs_query', message, 'search_invalid_request')
  }
  return docsSearchResponseSchema.parse(body).results
}

/** Fetch a bounded page of Markdown. Pagination offsets count Unicode code points. */
export async function getTransloaditDoc(
  pathOrUrl: string,
  startIndex: number,
  maxChars: number,
  fetcher: typeof fetch = fetch,
): Promise<DocsPage> {
  let url = normalizeDocsUrl(pathOrUrl)
  if (url === undefined) {
    throw new DocsError(
      'mcp_invalid_docs_url',
      'Provide a public path under /docs or a transloadit.com documentation URL.',
      'invalid_url',
    )
  }

  const signal = AbortSignal.timeout(docsFetchTimeoutMs)
  for (let redirects = 0; ; redirects++) {
    const response = await fetcher(url.href, {
      headers: { Accept: 'text/markdown, text/plain;q=0.9' },
      redirect: 'manual',
      signal,
    })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel()
      const location = response.headers.get('location')
      const target = location && URL.canParse(location, url) ? new URL(location, url) : undefined
      if (
        target === undefined ||
        target.origin !== docsOrigin ||
        target.username ||
        target.password ||
        !target.pathname.startsWith('/docs/')
      ) {
        throw new DocsError(
          'mcp_doc_not_found',
          'The requested Transloadit documentation page was not found.',
          'redirect_outside_docs',
        )
      }
      if (redirects === docsMaxRedirects) {
        throw new DocsError(
          'mcp_docs_unavailable',
          'The requested Transloadit documentation page is temporarily unavailable.',
          'too_many_redirects',
        )
      }
      url = normalizeDocsUrl(target.href)
      if (url === undefined || !url.pathname.startsWith('/docs/')) {
        throw new DocsError(
          'mcp_doc_not_found',
          'The requested Transloadit documentation page was not found.',
          'redirect_outside_docs',
        )
      }
      continue
    }
    if (!response.ok) {
      await response.body?.cancel()
      throw new DocsError(
        response.status === 404 ? 'mcp_doc_not_found' : 'mcp_docs_unavailable',
        response.status === 404
          ? 'The requested Transloadit documentation page was not found.'
          : 'The requested Transloadit documentation page is temporarily unavailable.',
        `page_http_${response.status}`,
      )
    }
    if (!hasContentType(response, ['text/markdown', 'text/plain'])) {
      await response.body?.cancel()
      throw new DocsError(
        'mcp_docs_unavailable',
        'The requested Transloadit documentation page is temporarily unavailable.',
        'page_content_type',
      )
    }
    const { text, prefix, length, truncated } = await readBoundedResponseText(
      response,
      maxChars,
      startIndex,
    )
    return {
      title: prefix.match(/^#\s+(.+)$/mu)?.[1] ?? url.pathname,
      url: url.href,
      markdown: text,
      start_index: startIndex,
      next_start_index: truncated ? startIndex + length : null,
      truncated,
    }
  }
}
