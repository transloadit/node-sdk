import { ApiError } from '../ApiError.ts'
import { formatAPIError } from './helpers.ts'

/** Keep Storage advice alongside sanitized text reasons, without dumping response bodies. */
export function storagePublicError(error: unknown, workspace?: string): string {
  if (error instanceof ApiError && error.code === 'STORAGE_PUBLIC_PREFIX_NEEDS_SMART_CDN_KEY') {
    const slug =
      workspace !== undefined && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(workspace)
        ? workspace
        : '<workspace>'
    return formatAPIError(
      error,
      `Enable Smart CDN on an Auth Key at https://transloadit.com/c/${slug}/template-credentials/ and retry. The same key can serve Assemblies and Smart CDN.`,
    )
  }
  if (error instanceof TypeError) return error.message
  // Unknown codes keep generic advice; only the textual reason is added by the shared formatter.
  return formatAPIError(
    error,
    'Could not update or list public Storage prefixes. Check the API endpoint and Auth Key dam:write scope, then retry.',
  )
}
