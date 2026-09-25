import type { RequestError } from 'got'

import type { AssemblyStatusError } from './alphalib/types/assemblyStatus.ts'

import { HTTPError } from 'got'

export interface TransloaditErrorResponseBody {
  error?: string
  message?: string
  reason?: AssemblyStatusError['reason']
  assembly_ssl_url?: string | null
  assembly_id?: string
}

export class ApiError extends Error {
  override name = 'ApiError'

  // there might not be an error code (or message) if the server didn't respond with any JSON response at all
  // e.g. if there was a 500 in the HTTP reverse proxy
  code?: string

  rawMessage?: string

  /** String reason when supplied by the API, preserving the longstanding SDK contract. */
  reason?: string

  /** Original API reason, including structured diagnostics, without coercion. */
  rawReason?: AssemblyStatusError['reason']

  assemblySslUrl?: string

  assemblyId?: string

  override cause?: RequestError | undefined

  constructor(params: { cause?: RequestError; body: TransloaditErrorResponseBody | undefined }) {
    const { cause, body = {} } = params

    const parts = ['API error']
    if (cause instanceof HTTPError && cause?.response.statusCode)
      parts.push(`(HTTP ${cause.response.statusCode})`)
    if (body.error) parts.push(`${body.error}:`)
    if (body.message) parts.push(body.message)
    if (body.assembly_ssl_url) parts.push(body.assembly_ssl_url)

    const message = parts.join(' ')

    super(message)
    this.rawMessage = body.message
    this.reason = typeof body.reason === 'string' ? body.reason : undefined
    this.rawReason = body.reason
    this.assemblyId = body.assembly_id
    this.assemblySslUrl = body.assembly_ssl_url ?? undefined
    this.code = body.error
    this.cause = cause
  }
}
