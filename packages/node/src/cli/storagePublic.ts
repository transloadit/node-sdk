import { ApiError } from '../ApiError.ts'
import { resolveCliConfig } from './helpers.ts'

/** Actionable CLI advice without printing remote response bodies or credentials. */
export function storagePublicError(error: unknown): string {
  if (error instanceof ApiError && error.code === 'STORAGE_PUBLIC_PREFIX_NEEDS_SMART_CDN_KEY') {
    const workspace = resolveCliConfig().credentialsWorkspace
    const slug =
      workspace !== undefined && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(workspace)
        ? workspace
        : '<workspace>'
    return `Enable Smart CDN on an Auth Key at https://transloadit.com/c/${slug}/template-credentials/ and retry. The same key can serve Assemblies and Smart CDN.`
  }
  if (error instanceof TypeError) return error.message
  return 'Could not update or list public Storage prefixes. Check the API endpoint and Auth Key dam:write scope, then retry.'
}
