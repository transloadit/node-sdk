/** Server-side development probe; errors become static hints, never raw response/URL logs. */
export type DiagnoseStorageImage = (path: string, url: string) => void

async function probe(url: string): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (response.ok && response.headers.get('content-type')?.startsWith('image/')) return
    // A manual HEAD cannot establish whether the browser's redirect target is a valid image.
    if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.has('location'))
      return
    const hints =
      response.status === 401 || response.status === 403
        ? 'Use a Smart CDN-enabled Auth Key, not an Assembly-only key; check its workspace and the signature secret, expiry and server clock.'
        : response.status === 404
          ? 'Check the workspace slug, that the Storage path exists there, and the configured Template.'
          : response.ok
            ? 'Expected an image Content-Type. Check the configured Template and delivery endpoint.'
            : 'Check the delivery endpoint and Template, then retry after restarting the development server.'
    console.warn(`[StorageImage] Development HEAD returned HTTP ${response.status}. ${hints}`)
  } catch {
    // Error messages can include a credential-bearing URL. A HEAD failure does not establish
    // whether the cause is credentials, networking, a cold transformation, or the CDN itself.
    console.warn(
      '[StorageImage] Could not reach Smart CDN within five seconds. Check connectivity and the trusted baseUrl; restart development to retry.',
    )
  }
}

/** Deduplicates concurrent and repeated probes within one credentialed development integration. */
export function createImageDiagnostics(template: string): DiagnoseStorageImage | undefined {
  if (process.env.NODE_ENV !== 'development') return undefined
  const requests = new Set<string>()
  return (path, url) => {
    const key = JSON.stringify([path, template])
    if (requests.has(key)) return
    requests.add(key)
    void probe(url)
  }
}
