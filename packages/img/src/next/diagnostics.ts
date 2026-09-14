/** Server-side development probe; errors become static hints, never raw response/URL logs. */
export type DiagnoseStorageImage = (path: string, url: string, publicPrefix?: string) => void

async function probe(url: string, publicPrefix?: string): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
      if (
        publicPrefix !== undefined &&
        response.headers.get('cache-control')?.includes('immutable')
      )
        console.info(
          '[StorageImage] Public delivery verified: image response with immutable caching.',
        )
      return
    }
    // A manual HEAD cannot establish whether the browser's redirect target is a valid image.
    if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.has('location'))
      return
    const hints =
      response.status === 404
        ? 'Check the workspace slug, that the Storage path exists there, and the configured Template.'
        : publicPrefix !== undefined &&
            response.headers.get('Transloadit-Error') === 'NO_SIGNATURE_FIELD'
          ? `For unsigned public delivery, run transloadit storage publish ${/^[a-zA-Z0-9/_-]+$/.test(publicPrefix) ? publicPrefix : '<your-public-prefix>/'}. If already published, check its workspace and public Built-in.`
          : publicPrefix === undefined && (response.status === 401 || response.status === 403)
            ? 'Enable Smart CDN on the Auth Key; check its workspace and the signature secret, expiry and server clock.'
            : response.ok
              ? 'Expected an image Content-Type. Check the configured Template and delivery endpoint.'
              : 'Check the delivery endpoint and Template.'
    console.warn(`[StorageImage] Development HEAD returned HTTP ${response.status}. ${hints}`)
  } catch {
    // Error messages can include a credential-bearing URL. A HEAD failure does not establish
    // whether the cause is credentials, networking, a cold transformation, or the CDN itself.
    console.warn(
      '[StorageImage] Could not reach Smart CDN within five seconds. Check connectivity and the trusted baseUrl.',
    )
  }
}

/** Deduplicates concurrent and repeated probes within one credentialed development integration. */
export function createImageDiagnostics(template: string): DiagnoseStorageImage | undefined {
  if (process.env.NODE_ENV !== 'development') return undefined
  const requests = new Set<string>()
  return (path, url, publicPrefix) => {
    const key = JSON.stringify([path, template])
    if (requests.has(key)) return
    requests.add(key)
    void probe(url, publicPrefix)
  }
}
