export type DocsScope = 'all' | 'api' | 'faq' | 'robots' | 'sdks'

export interface DocsSearchResult {
  title: string
  url: string
  description?: string
}

export interface DocsPage {
  title: string
  url: string
  markdown: string
  truncated: boolean
}

const docsOrigin = 'https://transloadit.com'
const docsFetchTimeoutMs = 10_000
const docsIndexMaxChars = 500_000
const docsIndexUrls: Record<DocsScope, readonly string[]> = {
  all: [
    `${docsOrigin}/docs/llms.txt`,
    `${docsOrigin}/docs/api/llms.txt`,
    `${docsOrigin}/docs/faq/llms.txt`,
    `${docsOrigin}/docs/robots/llms.txt`,
    `${docsOrigin}/docs/sdks/llms.txt`,
  ],
  api: [`${docsOrigin}/docs/api/llms.txt`],
  faq: [`${docsOrigin}/docs/faq/llms.txt`],
  robots: [`${docsOrigin}/docs/robots/llms.txt`],
  sdks: [`${docsOrigin}/docs/sdks/llms.txt`],
}
const markdownLinkPattern = /^- \[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?$/u

function normalizeDocsUrl(value: string): URL | undefined {
  if (!URL.canParse(value, docsOrigin)) return

  const url = new URL(value, docsOrigin)
  if (url.origin !== docsOrigin || url.username || url.password) return
  url.hash = ''
  url.search = ''
  if (url.pathname === '/llms.txt') return url
  if (['/docs', '/docs/', '/docs.md'].includes(url.pathname)) {
    url.pathname = '/docs.md'
    return url
  }
  if (!url.pathname.startsWith('/docs/')) return

  if (!url.pathname.endsWith('.md') && !url.pathname.endsWith('.txt')) {
    url.pathname = `${url.pathname.replace(/\/$/u, '')}.md`
  }
  return url
}

interface DocsTextResponse {
  text: string
  truncated: boolean
}

async function readBoundedResponseText(
  response: Response,
  maxChars: number,
): Promise<DocsTextResponse> {
  if (response.body === null) {
    return { text: '', truncated: false }
  }

  const decoder = new TextDecoder()
  const reader = response.body.getReader()
  let text = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      text += decoder.decode()
      return {
        text: text.slice(0, maxChars),
        truncated: text.length > maxChars,
      }
    }

    text += decoder.decode(value, { stream: true })
    if (text.length <= maxChars) continue

    await reader.cancel()
    return { text: text.slice(0, maxChars), truncated: true }
  }
}

async function fetchDocsText(
  url: string,
  maxChars: number,
  fetcher: typeof fetch,
): Promise<DocsTextResponse> {
  const response = await fetcher(url, {
    headers: { Accept: 'text/markdown, text/plain;q=0.9' },
    redirect: 'error',
    signal: AbortSignal.timeout(docsFetchTimeoutMs),
  })
  if (!response.ok) {
    throw new Error(`Documentation request failed with HTTP ${response.status}.`)
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/markdown') && !contentType.includes('text/plain')) {
    throw new Error(`Documentation request returned unsupported content type: ${contentType}.`)
  }
  return readBoundedResponseText(response, maxChars)
}

function parseIndex(index: string): DocsSearchResult[] {
  const results = new Map<string, DocsSearchResult>()
  for (const line of index.split('\n')) {
    const match = markdownLinkPattern.exec(line.trim())
    if (match === null) continue

    const [, title, rawUrl, description] = match
    if (title === undefined || rawUrl === undefined) continue
    const url = normalizeDocsUrl(rawUrl)
    if (url === undefined || !url.pathname.endsWith('.md')) continue
    if (!results.has(url.href)) results.set(url.href, { title, url: url.href, description })
  }
  return [...results.values()]
}

function matchesScope(result: DocsSearchResult, scope: DocsScope): boolean {
  if (scope === 'all') return true
  return new URL(result.url).pathname.startsWith(`/docs/${scope}/`)
}

function getSearchScore(
  result: DocsSearchResult,
  terms: string[],
): { matches: number; weight: number } {
  const title = result.title.toLowerCase()
  const description = result.description?.toLowerCase() ?? ''
  const url = result.url.toLowerCase()

  let matches = 0
  let weight = 0
  for (const term of terms) {
    const score = title.includes(term)
      ? 5
      : description.includes(term)
        ? 2
        : url.includes(term)
          ? 1
          : 0
    if (score === 0) continue
    matches++
    weight += score
  }
  return { matches, weight }
}

/** List public documentation pages, optionally ranked by search text, without account credentials. */
export async function listTransloaditDocs(
  search: string | undefined,
  scope: DocsScope,
  limit: number,
  fetcher: typeof fetch = fetch,
): Promise<DocsSearchResult[]> {
  const terms = search?.toLowerCase().split(/\s+/u).filter(Boolean) ?? []
  // The scoped indexes are deployed. Fail explicitly if one is unavailable rather than
  // silently replacing it with the incomplete root index and presenting missing results.
  const indexResponses = await Promise.all(
    docsIndexUrls[scope].map((url) => fetchDocsText(url, docsIndexMaxChars, fetcher)),
  )
  if (indexResponses.some(({ truncated }) => truncated)) {
    throw new Error('A documentation index exceeded the maximum supported size.')
  }
  const index = indexResponses.map(({ text }) => text).join('\n')

  return parseIndex(index)
    .filter((result) => matchesScope(result, scope))
    .map((result) => ({ result, score: getSearchScore(result, terms) }))
    .filter(({ score }) => terms.length === 0 || score.matches > 0)
    .sort(
      (left, right) =>
        right.score.matches - left.score.matches ||
        right.score.weight - left.score.weight ||
        left.result.title.localeCompare(right.result.title),
    )
    .slice(0, limit)
    .map(({ result }) => result)
}

/** Fetch one public Transloadit documentation page as bounded Markdown. */
export async function getTransloaditDocHelp(
  pathOrUrl: string,
  maxChars: number,
  fetcher: typeof fetch = fetch,
): Promise<DocsPage | undefined> {
  const url = normalizeDocsUrl(pathOrUrl)
  if (url === undefined) return

  const { text: markdown, truncated } = await fetchDocsText(url.toString(), maxChars, fetcher)
  const title = markdown.match(/^#\s+(.+)$/mu)?.[1] ?? url.pathname
  return {
    title,
    url: url.toString(),
    markdown,
    truncated,
  }
}
