/** Resolve a PDF or worker URL using the browser's HTTP(S) URL rules. */
export function pdfUrl(src: string | undefined, base: string | URL): URL | undefined {
  if (!src) return undefined
  try {
    const url = new URL(src, base)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url
  } catch {
    // A malformed URL uses the same preview fallback as an unsupported protocol.
  }
  return undefined
}
