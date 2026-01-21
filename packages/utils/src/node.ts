import { createHmac } from 'node:crypto'

import type { SignatureAlgorithm } from './index.ts'

export type { SignatureAlgorithm } from './index.ts'

export type SignatureAlgorithmInput = SignatureAlgorithm | (string & {})

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

export const signParamsSync = (
  paramsString: string,
  authSecret: string,
  algorithm: SignatureAlgorithmInput = 'sha384',
): string => {
  const signature = createHmac(algorithm, authSecret)
    .update(Buffer.from(paramsString, 'utf-8'))
    .digest('hex')
  return `${algorithm}:${signature}`
}

export const getSignedSmartCdnUrl = (opts: SmartCdnUrlOptions): string => {
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

  const stringToSign = `${workspaceSlug}/${templateSlug}/${inputField}?${queryParams}`
  const signature = createHmac('sha256', opts.authSecret).update(stringToSign).digest('hex')

  queryParams.set('sig', `sha256:${signature}`)
  return `https://${workspaceSlug}.tlcdn.com/${templateSlug}/${inputField}?${queryParams}`
}
