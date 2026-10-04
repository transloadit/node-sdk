import { parseWidgetOrigin } from './ui/assembly-result-widget.ts'

/**
 * Limits also arrive from JSON config files, where a value such as `"1MB"` would silently disable
 * a numeric comparison, so each one must be a positive integer.
 */
const assertPositiveInteger = (value: unknown, name: string, unit: string): void => {
  if (value === undefined) return
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer number of ${unit}.`)
  }
}

/** Validates what every server instance relies on, however it is constructed. */
export const assertServerOptions = (options: {
  resourceMetadataUrl?: string
  upstreamSecret?: string
  maxUrlDownloadBytes?: unknown
  urlDownloadTimeoutMs?: unknown
  resultDomains?: string[]
  widgetDomain?: string
}): void => {
  // API2 only accepts relayed `aud=mcp` tokens from the hosted service, so without the secret
  // every authenticated call fails; refusing to start surfaces that in the deploy's health check.
  if (options.resourceMetadataUrl && !options.upstreamSecret) {
    throw new Error(
      'TRANSLOADIT_MCP_RESOURCE_METADATA_URL (hosted mode) requires TRANSLOADIT_MCP_UPSTREAM_SECRET: API2 only accepts relayed MCP tokens from the hosted service.',
    )
  }
  assertPositiveInteger(options.maxUrlDownloadBytes, 'maxUrlDownloadBytes', 'bytes')
  assertPositiveInteger(options.urlDownloadTimeoutMs, 'urlDownloadTimeoutMs', 'milliseconds')
  // A malformed origin would only surface as blank previews in the host, so it fails startup.
  for (const domain of options.resultDomains ?? []) {
    parseWidgetOrigin(domain, 'resultDomains')
  }
  if (options.widgetDomain) {
    parseWidgetOrigin(options.widgetDomain, 'widgetDomain')
  }
}

/** Validates the HTTP request body limit. */
export const assertRequestBodyLimit = (value: unknown): void => {
  assertPositiveInteger(value, 'maxRequestBodyBytes', 'bytes')
}
