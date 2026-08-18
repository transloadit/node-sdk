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
const docsIndexUrl = `${docsOrigin}/llms.txt`
const docsFetchTimeoutMs = 10_000
const markdownLinkPattern = /^- \[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?$/u

function normalizeDocsUrl(value: string): URL | undefined {
  if (!URL.canParse(value, docsOrigin)) return

  const url = new URL(value, docsOrigin)
  if (url.origin !== docsOrigin) return
  if (url.pathname === '/llms.txt') return url
  if (!url.pathname.startsWith('/docs/')) return

  if (!url.pathname.endsWith('.md') && !url.pathname.endsWith('.txt')) {
    url.pathname = `${url.pathname.replace(/\/$/u, '')}.md`
  }
  url.hash = ''
  url.search = ''
  return url
}

async function fetchDocsText(url: string, fetcher: typeof fetch): Promise<string> {
  const response = await fetcher(url, {
    headers: { Accept: 'text/markdown, text/plain;q=0.9' },
    signal: AbortSignal.timeout(docsFetchTimeoutMs),
  })
  if (!response.ok) {
    throw new Error(`Documentation request failed with HTTP ${response.status}.`)
  }
  return response.text()
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
  const index = await fetchDocsText(docsIndexUrl, fetcher)

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

  const markdown = await fetchDocsText(url.toString(), fetcher)
  const title = markdown.match(/^#\s+(.+)$/mu)?.[1] ?? url.pathname
  return {
    title,
    url: url.toString(),
    markdown: markdown.slice(0, maxChars),
    truncated: markdown.length > maxChars,
  }
}
