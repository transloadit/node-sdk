import { HTTPError, type RequestError } from 'got'

export interface TransloaditErrorResponseBody {
  error?: string
  message?: string
  reason?: string
  assembly_ssl_url?: string
  assembly_id?: string
}

export class ApiError extends Error {
  override name = 'ApiError'

  // there might not be an error code (or message) if the server didn't respond with any JSON response at all
  // e.g. if there was a 500 in the HTTP reverse proxy
  code?: string

  rawMessage?: string

  reason?: string

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
    this.reason = body.reason
    this.assemblyId = body.assembly_id
    this.assemblySslUrl = body.assembly_ssl_url
    this.code = body.error
    this.cause = cause
  }
}
