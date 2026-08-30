/**
 * Smart CDN URL grammar shared by the synchronous Node signer (`@transloadit/utils/node`) and the
 * asynchronous WebCrypto signer (`@transloadit/utils`): building (signed and unsigned), parsing,
 * and stripping signature parameters. Only the HMAC differs between the two signers, so the
 * string-to-sign and the final URL are assembled here and cannot drift apart.
 */

const SMART_CDN_HOST_SUFFIX = '.tlcdn.com'
const WORKSPACE_PLACEHOLDER = '{workspace}'
/** Query parameters that carry the signature; `hsh` is an api2-side hash that is stripped too. */
const SIGNATURE_PARAMS = new Set(['auth_key', 'exp', 'sig'])
const STRIPPED_PARAMS = new Set([...SIGNATURE_PARAMS, 'hsh'])

export type SmartCdnUrlParams = Record<
  string,
  boolean | number | string | (boolean | number | string)[]
>

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
  urlParams?: SmartCdnUrlParams
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
  /**
   * Base URL that replaces `https://{workspace}.tlcdn.com`, e.g. a local api2's URL Transform
   * endpoint `https://api2-devdock.transloadit.dev/file/{workspace}`. A literal `{workspace}` is
   * substituted with the encoded workspace slug; a trailing slash is ignored.
   *
   * **Trusted configuration only.** The signature does not cover the host, so a base URL taken from
   * user input would let anyone redirect a signed URL (auth key included) to an origin of their
   * choosing. Never derive it from request data.
   */
  baseUrl?: string
}

/** Options for an unsigned Smart CDN URL: the signed options without credentials or expiry. */
export type SmartCdnUnsignedUrlOptions = Omit<
  SmartCdnUrlOptions,
  'authKey' | 'authSecret' | 'expiresAt'
>

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
    /** Resolved origin + path prefix that precedes `/{template}/{input}`. */
    baseUrl: string
  }
}

/** The components of a Smart CDN URL, as produced by `parseSmartCdnUrl`. */
export interface ParsedSmartCdnUrl {
  workspace: string
  template: string
  input: string
  /** Every query parameter except the signature ones; repeated parameters become arrays. */
  urlParams: Record<string, string | string[]>
  /** Present when the URL carries `auth_key`, `exp` and `sig`. */
  auth?: {
    key: string
    /** Milliseconds since UNIX epoch. */
    expiresAt: number
    /** The `sig` value, e.g. `sha256:…`. */
    signature: string
  }
  /** Only set when the URL was parsed against a custom `baseUrl`; feeds straight back into the builders. */
  baseUrl?: string
}

export interface ParseSmartCdnUrlOptions {
  /**
   * The same trusted `baseUrl` the URL was built with (with or without `{workspace}`). Without it
   * only `https://{workspace}.tlcdn.com/…` URLs are accepted.
   */
  baseUrl?: string
  /** Workspace slug for a `baseUrl` without a `{workspace}` placeholder, where the URL cannot tell. */
  workspace?: string
}

const validateRequired = (opts: {
  workspace?: string
  template?: string
  input?: string
}): void => {
  if (opts.workspace == null || opts.workspace === '') throw new TypeError('workspace is required')
  if (opts.template == null || opts.template === '') throw new TypeError('template is required')
  if (opts.input == null) throw new TypeError('input is required')
}

const resolveBaseUrl = (baseUrl: string | undefined, workspaceSlug: string): string => {
  if (baseUrl == null) return `https://${workspaceSlug}${SMART_CDN_HOST_SUFFIX}`
  const resolved = baseUrl.replace(/\/+$/, '').split(WORKSPACE_PLACEHOLDER).join(workspaceSlug)
  let parsed: URL
  try {
    parsed = new URL(resolved)
  } catch {
    throw new TypeError(`baseUrl must be an absolute URL, got '${baseUrl}'`)
  }
  if (parsed.search !== '' || parsed.hash !== '') {
    throw new TypeError('baseUrl must not contain a query string or fragment')
  }
  return resolved
}

const buildQueryParams = (urlParams: SmartCdnUrlParams | undefined): URLSearchParams => {
  const queryParams = new URLSearchParams()
  for (const [key, value] of Object.entries(urlParams || {})) {
    if (Array.isArray(value)) {
      for (const val of value) {
        queryParams.append(key, `${val}`)
      }
    } else {
      queryParams.append(key, `${value}`)
    }
  }
  return queryParams
}

/** Validates the options and assembles the string to sign; the caller supplies the HMAC. */
export const prepareSmartCdnUrl = (opts: SmartCdnUrlOptions): PreparedSmartCdnUrl => {
  validateRequired(opts)

  const workspaceSlug = encodeURIComponent(opts.workspace)
  const templateSlug = encodeURIComponent(opts.template)
  const inputField = encodeURIComponent(opts.input)
  const expiresAt = opts.expiresAt || Date.now() + 60 * 60 * 1000

  const queryParams = buildQueryParams(opts.urlParams)
  queryParams.set('auth_key', opts.authKey)
  queryParams.set('exp', `${expiresAt}`)
  queryParams.sort()

  return {
    stringToSign: `${workspaceSlug}/${templateSlug}/${inputField}?${queryParams}`,
    parts: {
      workspaceSlug,
      templateSlug,
      inputField,
      queryParams,
      baseUrl: resolveBaseUrl(opts.baseUrl, workspaceSlug),
    },
  }
}

/** Appends the `sig` parameter and returns the final `https://{workspace}.tlcdn.com/…` URL. */
export const finishSmartCdnUrl = ({ parts }: PreparedSmartCdnUrl, signatureHex: string): string => {
  const { baseUrl, templateSlug, inputField, queryParams } = parts
  queryParams.set('sig', `sha256:${signatureHex}`)
  return `${baseUrl}/${templateSlug}/${inputField}?${queryParams}`
}

/**
 * Builds an unsigned Smart CDN URL (`https://{workspace}.tlcdn.com/{template}/{input}?sortedQuery`)
 * for workspaces that do not require signature authentication.
 */
export const getSmartCdnUrl = (opts: SmartCdnUnsignedUrlOptions): string => {
  validateRequired(opts)
  const workspaceSlug = encodeURIComponent(opts.workspace)
  const templateSlug = encodeURIComponent(opts.template)
  const inputField = encodeURIComponent(opts.input)
  const queryParams = buildQueryParams(opts.urlParams)
  queryParams.sort()
  const query = queryParams.toString()
  return `${resolveBaseUrl(opts.baseUrl, workspaceSlug)}/${templateSlug}/${inputField}${
    query === '' ? '' : `?${query}`
  }`
}

const decodeOnce = (value: string, what: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    throw new TypeError(`Not a Smart CDN URL: malformed percent-encoding in ${what}`)
  }
}

/**
 * Removes the signature parameters (`auth_key`, `exp`, `sig`, and api2's `hsh`) from a Smart CDN
 * URL. Every other byte of the URL is left untouched, so the result stays comparable with URLs
 * produced elsewhere. Idempotent.
 */
export const stripSmartCdnAuth = (url: string): string => {
  const hashIndex = url.indexOf('#')
  const fragment = hashIndex === -1 ? '' : url.slice(hashIndex)
  const withoutFragment = hashIndex === -1 ? url : url.slice(0, hashIndex)
  const queryIndex = withoutFragment.indexOf('?')
  if (queryIndex === -1) return url
  const path = withoutFragment.slice(0, queryIndex)
  const kept = withoutFragment
    .slice(queryIndex + 1)
    .split('&')
    .filter((pair) => {
      if (pair === '') return false
      const rawName = pair.slice(0, pair.indexOf('=') === -1 ? pair.length : pair.indexOf('='))
      let name = rawName
      try {
        name = decodeURIComponent(rawName.replace(/\+/g, ' '))
      } catch {
        // An undecodable name is never one of ours; keep it.
      }
      return !STRIPPED_PARAMS.has(name)
    })
  return `${path}${kept.length === 0 ? '' : `?${kept.join('&')}`}${fragment}`
}

const notSmartCdnUrl = (detail: string): TypeError =>
  new TypeError(
    `Not a Smart CDN URL: ${detail} (expected https://{workspace}.tlcdn.com/{template}/{input}, or the configured baseUrl)`,
  )

/** Splits `origin + pathname` into the workspace slug and the `{template}/{input}` remainder. */
const locateSmartCdnPath = (
  parsed: URL,
  options: ParseSmartCdnUrlOptions,
): { workspaceSlug: string; remainder: string; baseUrl?: string } => {
  const full = `${parsed.origin}${parsed.pathname}`

  if (options.baseUrl == null) {
    const match = /^([^.]+)\.tlcdn\.com$/i.exec(parsed.hostname)
    if (match?.[1] == null || parsed.protocol !== 'https:') {
      throw notSmartCdnUrl(`unexpected origin '${parsed.origin}'`)
    }
    return { workspaceSlug: match[1], remainder: parsed.pathname.slice(1) }
  }

  const template = options.baseUrl.replace(/\/+$/, '')
  const placeholderIndex = template.indexOf(WORKSPACE_PLACEHOLDER)
  if (placeholderIndex === -1) {
    const prefix = `${template}/`
    if (!full.startsWith(prefix))
      throw notSmartCdnUrl(`'${full}' is not under baseUrl '${template}'`)
    const hostMatch = /^([^.]+)\.tlcdn\.com$/i.exec(parsed.hostname)
    const workspaceSlug =
      options.workspace != null ? encodeURIComponent(options.workspace) : hostMatch?.[1]
    if (workspaceSlug == null) {
      throw notSmartCdnUrl(
        'the workspace cannot be determined; pass `workspace` next to a baseUrl without {workspace}',
      )
    }
    return { workspaceSlug, remainder: full.slice(prefix.length), baseUrl: template }
  }

  const before = template.slice(0, placeholderIndex)
  const after = template.slice(placeholderIndex + WORKSPACE_PLACEHOLDER.length)
  if (!full.startsWith(before)) throw notSmartCdnUrl(`'${full}' is not under baseUrl '${template}'`)
  const rest = full.slice(before.length)
  const slashIndex = rest.indexOf('/')
  const workspaceSlug = slashIndex === -1 ? rest : rest.slice(0, slashIndex)
  const afterPart = slashIndex === -1 ? '' : rest.slice(slashIndex)
  if (workspaceSlug === '' || !afterPart.startsWith(`${after}/`)) {
    throw notSmartCdnUrl(`'${full}' does not match baseUrl '${template}'`)
  }
  return {
    workspaceSlug,
    remainder: afterPart.slice(after.length + 1),
    baseUrl: `${before}${workspaceSlug}${after}`,
  }
}

/**
 * Parses a Smart CDN URL back into the options that built it: the inverse of `getSmartCdnUrl` and
 * `getSignedSmartCdnUrl`. Path segments are percent-decoded exactly once; query parameters are
 * decoded by `URLSearchParams` semantics; `auth_key`/`exp`/`sig` are returned separately as `auth`.
 */
export const parseSmartCdnUrl = (
  url: string,
  options: ParseSmartCdnUrlOptions = {},
): ParsedSmartCdnUrl => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw notSmartCdnUrl(`'${url}' is not an absolute URL`)
  }

  const { workspaceSlug, remainder, baseUrl } = locateSmartCdnPath(parsed, options)
  const slashIndex = remainder.indexOf('/')
  if (slashIndex === -1) throw notSmartCdnUrl('missing the input segment')
  const templateSlug = remainder.slice(0, slashIndex)
  if (templateSlug === '') throw notSmartCdnUrl('missing the template segment')

  const urlParams: Record<string, string | string[]> = {}
  const signature: Record<string, string> = {}
  for (const [key, value] of new URLSearchParams(parsed.search)) {
    if (SIGNATURE_PARAMS.has(key)) {
      signature[key] = value
      continue
    }
    const existing = urlParams[key]
    if (existing === undefined) urlParams[key] = value
    else if (Array.isArray(existing)) existing.push(value)
    else urlParams[key] = [existing, value]
  }

  let auth: ParsedSmartCdnUrl['auth']
  const present = Object.keys(signature).length
  if (present > 0) {
    if (present !== SIGNATURE_PARAMS.size) {
      throw notSmartCdnUrl(
        'incomplete signature parameters; expected auth_key, exp and sig together',
      )
    }
    const expiresAt = Number(signature.exp)
    if (!Number.isInteger(expiresAt))
      throw notSmartCdnUrl(`exp '${signature.exp}' is not a timestamp`)
    auth = { key: signature.auth_key as string, expiresAt, signature: signature.sig as string }
  }

  return {
    workspace: decodeOnce(workspaceSlug, 'the workspace'),
    template: decodeOnce(templateSlug, 'the template'),
    input: decodeOnce(remainder.slice(slashIndex + 1), 'the input'),
    urlParams,
    ...(auth && { auth }),
    ...(baseUrl != null && { baseUrl }),
  }
}
