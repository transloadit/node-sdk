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
const rootDocsIndexUrl = `${docsOrigin}/llms.txt`
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
  if (url.origin !== docsOrigin) return
  url.hash = ''
  url.search = ''
  if (url.pathname === '/llms.txt') return url
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

async function fetchSearchIndexes(
  scope: DocsScope,
  fetcher: typeof fetch,
): Promise<DocsTextResponse[]> {
  try {
    return await Promise.all(
      docsIndexUrls[scope].map((url) => fetchDocsText(url, docsIndexMaxChars, fetcher)),
    )
  } catch {
    // Keep search available if the MCP package deploys before the scoped content routes.
    return [await fetchDocsText(rootDocsIndexUrl, docsIndexMaxChars, fetcher)]
  }
}

function parseIndex(index: string): DocsSearchResult[] {
  const results: DocsSearchResult[] = []
  for (const line of index.split('\n')) {
    const match = markdownLinkPattern.exec(line.trim())
    if (match === null) continue

    const [, title, rawUrl, description] = match
    if (title === undefined || rawUrl === undefined) continue
    const url = normalizeDocsUrl(rawUrl)
    if (url === undefined || !url.pathname.startsWith('/docs/')) continue
    results.push({ title, url: url.toString(), description })
  }
  return results
}

function matchesScope(result: DocsSearchResult, scope: DocsScope): boolean {
  if (scope === 'all') return true
  return new URL(result.url).pathname.startsWith(`/docs/${scope}/`)
}

function getSearchScore(result: DocsSearchResult, terms: string[]): number {
  const title = result.title.toLowerCase()
  const description = result.description?.toLowerCase() ?? ''
  const url = result.url.toLowerCase()

  return terms.reduce((score, term) => {
    if (title.includes(term)) return score + 5
    if (description.includes(term)) return score + 2
    if (url.includes(term)) return score + 1
    return score
  }, 0)
}

/** Search the public Transloadit documentation index without requiring account credentials. */
export async function searchTransloaditDocs(
  query: string,
  scope: DocsScope,
  limit: number,
  fetcher: typeof fetch = fetch,
): Promise<DocsSearchResult[]> {
  const terms = query.toLowerCase().split(/\s+/u).filter(Boolean)
  const indexResponses = await fetchSearchIndexes(scope, fetcher)
  if (indexResponses.some(({ truncated }) => truncated)) {
    throw new Error('A documentation index exceeded the maximum supported size.')
  }
  const index = indexResponses.map(({ text }) => text).join('\n')

  return parseIndex(index)
    .filter((result) => matchesScope(result, scope))
    .map((result) => ({ result, score: getSearchScore(result, terms) }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.result.title.localeCompare(right.result.title),
    )
    .slice(0, limit)
    .map(({ result }) => result)
}

/** Fetch one public Transloadit documentation page as bounded Markdown. */
export async function getTransloaditDoc(
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
