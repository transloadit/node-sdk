/**
 * Smart CDN URL building shared by the synchronous Node signer (`@transloadit/utils/node`) and the
 * asynchronous WebCrypto signer (`@transloadit/utils`). Only the HMAC differs between the two, so
 * the string-to-sign and the final URL are assembled here and cannot drift apart.
 */

export type SmartCdnUrlOptions = {
  /**
   * Workspace slug.
   */
  workspace: string
  /**
   * Template slug or template ID.
   */
  template: string
  /**
   * Input value that is provided as `${fields.input}` in the template.
   */
  input: string
  /**
   * Additional parameters for the URL query string.
   */
  urlParams?: Record<string, boolean | number | string | (boolean | number | string)[]>
  /**
   * Expiration timestamp of the signature in milliseconds since UNIX epoch.
   * Defaults to 1 hour from now.
   */
  expiresAt?: number
  /**
   * Transloadit auth key used to sign the URL.
   */
  authKey: string
  /**
   * Transloadit auth secret used to sign the URL.
   */
  authSecret: string
}

/** A Smart CDN URL with everything but its signature in place. */
export interface PreparedSmartCdnUrl {
  /** `workspace/template/input?sortedQuery`, the message the auth secret signs with HMAC-SHA256. */
  stringToSign: string
  /** URL-encoded path segments and the sorted query (without `sig`). */
  parts: {
    workspaceSlug: string
    templateSlug: string
    inputField: string
    queryParams: URLSearchParams
  }
}

/** Validates the options and assembles the string to sign; the caller supplies the HMAC. */
export const prepareSmartCdnUrl = (opts: SmartCdnUrlOptions): PreparedSmartCdnUrl => {
  if (opts.workspace == null || opts.workspace === '') throw new TypeError('workspace is required')
  if (opts.template == null || opts.template === '') throw new TypeError('template is required')
  if (opts.input == null) throw new TypeError('input is required')

  const workspaceSlug = encodeURIComponent(opts.workspace)
  const templateSlug = encodeURIComponent(opts.template)
  const inputField = encodeURIComponent(opts.input)
  const expiresAt = opts.expiresAt || Date.now() + 60 * 60 * 1000

  const queryParams = new URLSearchParams()
  for (const [key, value] of Object.entries(opts.urlParams || {})) {
    if (Array.isArray(value)) {
      for (const val of value) {
        queryParams.append(key, `${val}`)
      }
    } else {
      queryParams.append(key, `${value}`)
    }
  }

  queryParams.set('auth_key', opts.authKey)
  queryParams.set('exp', `${expiresAt}`)
  queryParams.sort()

  return {
    stringToSign: `${workspaceSlug}/${templateSlug}/${inputField}?${queryParams}`,
    parts: { workspaceSlug, templateSlug, inputField, queryParams },
  }
}

/** Appends the `sig` parameter and returns the final `https://{workspace}.tlcdn.com/…` URL. */
export const finishSmartCdnUrl = ({ parts }: PreparedSmartCdnUrl, signatureHex: string): string => {
  const { workspaceSlug, templateSlug, inputField, queryParams } = parts
  queryParams.set('sig', `sha256:${signatureHex}`)
  return `https://${workspaceSlug}.tlcdn.com/${templateSlug}/${inputField}?${queryParams}`
}
